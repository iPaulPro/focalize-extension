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
import {
    type LensFollowNft,
    LensFollowNft__factory,
} from '../../contracts/types';

const setDispatcher = async (
    request: SetDispatcherRequest
): Promise<string> => {
    const { createSetDispatcherTypedData } =
        await lensApi.createSetDispatcherTypedData({ request });

    const typedData = createSetDispatcherTypedData.typedData;
    if (!typedData) {
        throw new Error('Error setting dispatcher');
    }

    const { signTypedData } = await import('../evm/ethers-service');

    const signature = await signTypedData(
        typedData.domain,
        // @ts-ignore this function strips the __typename
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

        const { Signature } = await import('ethers');
        const { v, r, s } = Signature.from(signature);

        const { getLensHub } = await import('../evm/lens-hub');
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

    const { pollUntilIndexed } = await import(
        '../utils/has-transaction-been-indexed'
    );
    await pollUntilIndexed(txHash);
    console.log('setDispatcher: transaction indexed');

    return txHash;
};

const followProfile = async (profile: Profile): Promise<boolean> => {
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

    const { signTypedData } = await import('../evm/ethers-service');
    const signature = await signTypedData(
        typedData.domain,
        // @ts-ignore this function strips the __typename
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

        const { Signature } = await import('ethers');
        const { v, r, s } = Signature.from(signature);

        const { getLensHub } = await import('../evm/lens-hub');
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
    const { Signature, Contract } = await import('ethers');
    const { v, r, s } = Signature.from(signature);

    const { getSigner } = await import('../evm/ethers-service');
    // load up the follower nft contract
    const followNftContract: LensFollowNft = LensFollowNft__factory.connect(
        typedData.domain.verifyingContract,
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

const unfollowProfile = async (profile: Profile): Promise<boolean> => {
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

    const { signTypedData } = await import('../evm/ethers-service');
    const signature = await signTypedData(
        typedData.domain,
        // @ts-ignore this function strips the __typename
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
