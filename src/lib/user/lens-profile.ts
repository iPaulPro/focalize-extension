import { ethers } from 'ethers';
import { LENS_FOLLOW_NFT_ABI } from '../../config';

import { getLensHub } from '../evm/lens-hub';
import { getSigner, signTypedData } from '../evm/ethers-service';
import { pollUntilIndexed } from '../utils/has-transaction-been-indexed';

import lensApi from '../lens-api';

import type {
    BroadcastRequest,
    CreateBurnEip712TypedData,
    CreateFollowEip712TypedData,
    CreateFollowTypedDataMutation,
    CreateUnfollowTypedDataMutation,
    Profile,
    ProxyActionMutation,
    SetDispatcherRequest,
} from '../graph/lens-service';
import type { User } from './user';

/**
 * Gets the default profile of the address supplied.
 */
export const getDefaultProfile = async (
    ethereumAddress: string
): Promise<Profile> => {
    const { defaultProfile } = await lensApi.defaultProfile({
        request: { ethereumAddress },
    });
    if (defaultProfile?.__typename === 'Profile') return defaultProfile;
    throw new Error('Unable to get default profile');
};

export const getProfiles = async (ownedBy: string[]): Promise<Profile[]> => {
    const storage = await chrome.storage.local.get('currentUser');
    const userProfileId = storage.currentUser?.profileId;
    const { profiles } = await lensApi.profiles({
        request: { ownedBy },
        userProfileId,
    });
    return profiles.items;
};

export const getProfileById = async (profileId: string): Promise<Profile> => {
    const storage = await chrome.storage.local.get('currentUser');
    const userProfileId = storage.currentUser?.profileId;
    const { profile } = await lensApi.getProfile({
        request: { profileId },
        userProfileId,
    });
    if (profile?.__typename === 'Profile') return profile;
    throw new Error('Unable to get profile');
};

export const getProfileByHandle = async (handle: string): Promise<Profile> => {
    const storage = await chrome.storage.local.get('currentUser');
    const userProfileId = storage.currentUser?.profileId;
    const { profile } = await lensApi.getProfile({
        request: { handle },
        userProfileId,
    });
    if (profile?.__typename === 'Profile') return profile;
    throw new Error('Unable to get profile');
};

export const getProfileByAddress = async (
    ethereumAddress: string
): Promise<Profile> => {
    const profiles = await getProfiles([ethereumAddress]);
    const profile = profiles[0];
    if (profile?.__typename === 'Profile') return profile;
    throw new Error('Unable to get profile');
};

export const canUseRelay = async (profileId: string): Promise<boolean> => {
    let profile;

    try {
        profile = await getProfileById(profileId);
    } catch (e) {
        return false;
    }

    return profile.dispatcher?.canUseRelay ?? false;
};

export const setDispatcher = async (
    request: SetDispatcherRequest
): Promise<string> => {
    const { createSetDispatcherTypedData } =
        await lensApi.createSetDispatcherTypedData({ request });

    const typedData = createSetDispatcherTypedData.typedData;
    if (!typedData) {
        throw new Error('Error setting dispatcher');
    }

    // @ts-ignore this function strips the __typename
    const signature = await signTypedData(
        typedData.domain,
        typedData.types,
        typedData.value
    );

    let txHash;

    const broadcastReq: BroadcastRequest = {
        id: createSetDispatcherTypedData.id,
        signature,
    };
    const { broadcast } = await lensApi.broadcast({ request: broadcastReq });
    console.log('setDispatcher: broadcast result', broadcast);

    if (broadcast.__typename === 'RelayError') {
        console.error(
            'setDispatcher: relay broadcast failed',
            broadcast.reason
        );

        const { v, r, s } = ethers.Signature.from(signature);

        const lensHub = await getLensHub();
        const tx = await lensHub.setDispatcherWithSig({
            profileId: typedData.value.profileId,
            dispatcher: typedData.value.dispatcher,
            sig: {
                v,
                r,
                s,
                deadline: typedData.value.deadline,
            },
        });
        console.log('setDispatcher: submitted transaction', tx);
        txHash = tx.hash;
    }

    if (!txHash && broadcast.__typename === 'RelayerResult') {
        console.log(
            'setDispatcher: broadcast transaction success',
            broadcast.txHash
        );
        txHash = broadcast.txHash;
    }

    await pollUntilIndexed(txHash);
    console.log('setDispatcher: transaction indexed');

    return txHash;
};

export const followProfile = async (profile: Profile): Promise<boolean> => {
    console.log(
        'followProfile: handle, followModule',
        profile.handle,
        profile.followModule
    );
    if (!profile.followModule) {
        try {
            const { proxyAction }: ProxyActionMutation =
                await lensApi.proxyAction({
                    request: {
                        follow: { freeFollow: { profileId: profile.id } },
                    },
                });
            console.log(
                'followProfile: created proxy action with id =',
                proxyAction
            );
            await chrome.runtime.sendMessage({
                type: 'proxyAction',
                proxyActionId: proxyAction,
                profile,
            });
            return true;
        } catch (e) {
            console.warn('followProfile: error using proxy action', e);
        }
    }

    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;

    const { createFollowTypedData }: CreateFollowTypedDataMutation =
        await lensApi.createFollowTypedData({
            request: {
                follow: [
                    {
                        profile: profile.id,
                        // followModule: profile.followModule,
                    },
                ],
            },
        });

    const typedData: CreateFollowEip712TypedData =
        createFollowTypedData.typedData;
    if (!typedData) {
        throw new Error('Error creating follow typed data');
    }

    // @ts-ignore this function strips the __typename
    const signature = await signTypedData(
        typedData.domain,
        typedData.types,
        typedData.value
    );

    let txHash;

    const broadcastReq: BroadcastRequest = {
        id: createFollowTypedData.id,
        signature,
    };
    const { broadcast } = await lensApi.broadcast({ request: broadcastReq });
    console.log('followProfile: broadcast result', broadcast);

    if (broadcast.__typename === 'RelayError') {
        console.error(
            'followProfile: relay broadcast failed',
            broadcast.reason
        );

        const { v, r, s } = ethers.Signature.from(signature);

        const lensHub = await getLensHub();
        const tx = await lensHub.followWithSig({
            follower: currentUser.address,
            profileIds: typedData.value.profileIds,
            datas: typedData.value.datas,
            sig: {
                v,
                r,
                s,
                deadline: typedData.value.deadline,
            },
        });
        console.log('followProfile: submitted transaction', tx);
        txHash = tx.hash;
    }

    if (broadcast.__typename === 'RelayerResult') {
        console.log(
            'followProfile: broadcast transaction success',
            broadcast.txHash
        );
        txHash = broadcast.txHash;
    }

    return txHash !== undefined;
};

const burnFollowWithSig = async (
    signature: string,
    typedData: CreateBurnEip712TypedData
) => {
    const { v, r, s } = ethers.Signature.from(signature);

    // load up the follower nft contract
    const followNftContract = new ethers.Contract(
        typedData.domain.verifyingContract,
        LENS_FOLLOW_NFT_ABI,
        await getSigner()
    );

    const sig = {
        v,
        r,
        s,
        deadline: typedData.value.deadline,
    };

    // force the tx to send
    return await followNftContract.burnWithSig(typedData.value.tokenId, sig);
};

export const unfollowProfile = async (profile: Profile): Promise<boolean> => {
    console.log('unfollowProfile', profile);

    const { createUnfollowTypedData }: CreateUnfollowTypedDataMutation =
        await lensApi.createUnfollowTypedData({
            request: {
                profile: profile.id,
            },
        });

    const typedData: CreateBurnEip712TypedData =
        createUnfollowTypedData.typedData;
    if (!typedData) {
        throw new Error('Error creating unfollow typed data');
    }

    // @ts-ignore this function strips the __typename
    const signature = await signTypedData(
        typedData.domain,
        typedData.types,
        typedData.value
    );

    let txHash;

    const broadcastReq: BroadcastRequest = {
        id: createUnfollowTypedData.id,
        signature,
    };
    const { broadcast } = await lensApi.broadcast({ request: broadcastReq });
    console.log('unfollowProfile: broadcast result', broadcast);

    if (broadcast.__typename === 'RelayError') {
        console.error(
            'unfollowProfile: relay broadcast failed',
            broadcast.reason
        );

        const burnTx = await burnFollowWithSig(signature, typedData);
        txHash = burnTx.hash;
        console.log('unfollowProfile: direct burn tx hash', txHash);
    }

    if (broadcast.__typename === 'RelayerResult') {
        txHash = broadcast.txHash;
        console.log('unfollowProfile: broadcast transaction success', txHash);
    }

    return txHash !== undefined;
};

export const getMutualFollows = async (
    viewingProfileId: string,
    yourProfileId: string,
    limit?: number
): Promise<{ profiles: Profile[]; total: number }> => {
    const { mutualFollowersProfiles } = await lensApi.mutualFollowersProfiles({
        request: { viewingProfileId, yourProfileId },
    });
    console.log(
        'getMutualFollows: mutualFollowersProfiles',
        mutualFollowersProfiles,
        'items',
        mutualFollowersProfiles.items,
        'total',
        mutualFollowersProfiles.pageInfo.totalCount ?? 'none'
    );
    return {
        profiles: limit
            ? mutualFollowersProfiles.items.slice(0, 3)
            : mutualFollowersProfiles.items,
        total: mutualFollowersProfiles.pageInfo.totalCount ?? 0,
    };
};
