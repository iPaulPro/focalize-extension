import {getLensHub} from "./lens-hub";
import {signTypedData} from "./ethers-service";
import {splitSignature} from "ethers/lib/utils";
import {pollUntilIndexed} from "./has-transaction-been-indexed";

import gqlClient from "./graph/graphql-client";

import type {
    BroadcastRequest,
    Profile,
    ProxyActionMutation,
    RelayerResult,
    SetDispatcherRequest,
    CreateFollowEip712TypedData,
    CreateFollowTypedDataMutation
} from './graph/lens-service';
import type {User} from './user';

/**
 * Gets the default profile of the address supplied.
 */
export const getDefaultProfile = async (ethereumAddress: string): Promise<Profile> => {
    const {defaultProfile} = await gqlClient.DefaultProfile({request: {ethereumAddress}})
    if (defaultProfile?.__typename === 'Profile') return defaultProfile;
    throw new Error('Unable to get default profile');
};

export const getProfiles = async (ownedBy: string): Promise<Profile[]> => {
    const {profiles} = await gqlClient.Profiles({request: {ownedBy: [ownedBy]}});
    return profiles.items;
};

export const getProfileById = async (profileId: string): Promise<Profile> => {
    const storage = await chrome.storage.local.get('currentUser');
    const userProfileId = storage.currentUser?.profileId;
    const {profile} = await gqlClient.GetProfile({profileId, userProfileId});
    if (profile?.__typename === 'Profile') return profile;
    throw new Error('Unable to get profile');
}

export const canUseRelay = async (profileId: string): Promise<boolean> => {
    let profile;

    try {
        profile = await getProfileById(profileId)
    } catch (e) {
        return false;
    }

    return profile.dispatcher?.canUseRelay ?? false;
}

export const setDispatcher = async (request: SetDispatcherRequest): Promise<string> => {
    const {createSetDispatcherTypedData} = await gqlClient.CreateSetDispatcherTypedData({request});

    const typedData = createSetDispatcherTypedData.typedData;
    if (!typedData) {
        throw new Error('Error setting dispatcher');
    }

    // @ts-ignore this function strips the __typename
    const signature = await signTypedData(typedData.domain, typedData.types, typedData.value);

    let txHash;

    const broadcastReq: BroadcastRequest = {
        id: createSetDispatcherTypedData.id,
        signature
    }
    const {broadcast} = await gqlClient.Broadcast({request: broadcastReq});
    console.log('setDispatcher: broadcast result', broadcast);

    if (broadcast.__typename === 'RelayError') {
        console.error('setDispatcher: relay broadcast failed', broadcast.reason);

        const {v, r, s} = splitSignature(signature);

        const lensHub = getLensHub();
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
        console.log('setDispatcher: broadcast transaction success', broadcast.txHash)
        txHash = broadcast.txHash;
    }

    await pollUntilIndexed(txHash);
    console.log('setDispatcher: transaction indexed');

    return txHash;
};

export const followProfile = async (profile: Profile): Promise<boolean> => {
    if (!profile.followModule) {
        try {
            const {proxyAction}: ProxyActionMutation = await gqlClient.ProxyAction({request: {follow: {freeFollow: {profileId: profile.id}}}});
            const proxyActionId = proxyAction.proxyAction;
            console.log('followProfile: proxy action id', proxyActionId);
            // send proxy action to background worker to track status
            return true;
        } catch (e) {
            console.warn('followProfile: error using proxy action', e);
        }
    }

    const {createFollowTypedData}: CreateFollowTypedDataMutation = await gqlClient.CreateFollowTypedData({
        request: {
            follow: [
                {
                    profile: profile.id,
                    // followModule: profile.followModule,
                }
            ]
        }
    });
    const typedData: CreateFollowEip712TypedData = createFollowTypedData.typedData;

    return false;
};

export const getMutualFollows = async (
    viewingProfileId: string,
    yourProfileId: string,
    limit?: number,
): Promise<{profiles: Profile[], total:number}> => {
    const {mutualFollowersProfiles} = await gqlClient.MutualFollowersProfiles({
        request: {viewingProfileId, yourProfileId}
    });
    console.log('getMutualFollows: mutualFollowersProfiles', mutualFollowersProfiles, 'items', mutualFollowersProfiles.items, 'total', mutualFollowersProfiles.pageInfo.totalCount ?? 'none');
    return {
        profiles: limit ? mutualFollowersProfiles.items.slice(0, 3) : mutualFollowersProfiles.items,
        total: mutualFollowersProfiles.pageInfo.totalCount ?? 0,
    };
}
