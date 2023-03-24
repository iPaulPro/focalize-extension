import {getLensHub} from "../lens-hub";
import {signTypedData} from "./ethers-service";
import {splitSignature} from "ethers/lib/utils";
import {pollUntilIndexed} from "./has-transaction-been-indexed";

import gqlClient from "../graph/graphql-client";

import type {BroadcastRequest, Profile, RelayerResult, SetDispatcherRequest} from "../graph/lens-service";

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
}

