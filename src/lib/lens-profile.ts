import {getLensHub} from "../lens-hub";
import {AsyncDefaultProfile, AsyncGetProfile, AsyncProfiles, Broadcast, CreateSetDispatcherTypedData} from "../graph/lens-service";
import {signTypedData} from "./ethers-service";
import {splitSignature} from "ethers/lib/utils";
import {pollUntilIndexed} from "./has-transaction-been-indexed";

import type {BroadcastRequest, RelayerResult, SetDispatcherRequest} from "../graph/lens-service";
import type {Profile} from "../graph/lens-service";
import {ipfsUrlToGatewayUrl} from "./ipfs-service";

/**
 * Gets the default profile of the address supplied.
 */
export const getDefaultProfile = async (ethereumAddress: string): Promise<Profile> => {
    const res = await AsyncDefaultProfile({variables: {request: {ethereumAddress}}})
    if (res.error) throw res.error;
    if (res.data?.defaultProfile?.__typename === 'Profile') return res.data.defaultProfile;
    throw 'Unable to get default profile';
};

export const getProfiles = async (ownedBy: string): Promise<Profile[]> => {
    const res = await AsyncProfiles({variables: {request: {ownedBy: [ownedBy]}}});
    if (res.error) throw res.error;
    return res.data?.profiles?.items;
};

export const getProfileById = async (profileId: string): Promise<Profile> => {
    const res = await AsyncGetProfile({variables: {request: {profileId}}});
    if (res.error) throw res.error;
    if (res.data?.profile?.__typename === 'Profile') return res.data.profile;
    throw 'Unable to get profile';
}

export const canUseRelay = async (profileId: string): Promise<boolean> => {
    let profileRes;

    try {
        profileRes = await getProfileById(profileId)
    } catch (e) {
        return false;
    }

    // @ts-ignore
    if (profileRes.error) return false;

    // @ts-ignore
    const profile = profileRes.data.profile;
    return profile.dispatcher?.canUseRelay ?? false;
}

export const setDispatcher = async (request: SetDispatcherRequest): Promise<string> => {
    const res = await CreateSetDispatcherTypedData({variables: {request}});
    if (!res.data?.createSetDispatcherTypedData?.typedData) {
        throw 'Error setting dispatcher';
    }

    const typedData = res.data.createSetDispatcherTypedData.typedData;

    // @ts-ignore
    const signature = await signTypedData(typedData.domain, typedData.types, typedData.value);

    let txHash;

    const broadcastReq: BroadcastRequest = {
        id: res.data.createSetDispatcherTypedData.id,
        signature
    }
    const broadcastRes = await Broadcast({variables: {request: broadcastReq}});
    console.log('setDispatcher: broadcast result', broadcastRes);

    if (!broadcastRes?.data?.broadcast || broadcastRes.data.broadcast.__typename === 'RelayError') {
        console.error('setDispatcher: post with broadcast failed');

        if (broadcastRes?.data?.broadcast?.__typename === 'RelayError' && broadcastRes.data.broadcast.reason) {
            console.error(broadcastRes.data.broadcast.reason);
        }

        const { v, r, s } = splitSignature(signature);

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

    if (!txHash && broadcastRes?.data) {
        const broadcast: RelayerResult = broadcastRes.data.broadcast as RelayerResult;
        console.log('setDispatcher: broadcast transaction success', broadcast.txHash)
        txHash = broadcast.txHash;
    }

    await pollUntilIndexed(txHash);
    console.log('setDispatcher: transaction indexed');

    return txHash;
}

export const getAvatar = (profile: Profile) => {
    let avatarUrl: string | undefined;
    if (profile.picture?.__typename === "MediaSet") {
        avatarUrl = profile.picture?.original?.url;
    } else if (profile.picture?.__typename === "NftImage") {
        avatarUrl = profile.picture.uri;
    }

    if (avatarUrl?.startsWith('ipfs://')) {
        avatarUrl = ipfsUrlToGatewayUrl(avatarUrl);
    }

    if (!avatarUrl || avatarUrl.length === 0) {
        avatarUrl = `https://cdn.stamp.fyi/avatar/${profile.ownedBy}?s=96`
    }

    return avatarUrl;
}