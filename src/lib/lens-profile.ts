import {getLensHub} from "../lens-hub";
import {signTypedData} from "./ethers-service";
import {splitSignature} from "ethers/lib/utils";
import {pollUntilIndexed} from "./has-transaction-been-indexed";

import gqlClient from "../graph/graphql-client";

import type {BroadcastRequest, RelayerResult, SetDispatcherRequest} from "../graph/lens-service";
import type {Profile} from "../graph/lens-service";
import {ipfsUrlToGatewayUrl} from "./ipfs-service";

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
    const {profile} = await gqlClient.GetProfile({request: {profileId}});
    if (profile?.__typename === 'Profile') return profile;
    throw new Error('Unable to get profile');
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
        console.error('setDispatcher: post with broadcast failed', broadcast.reason);

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