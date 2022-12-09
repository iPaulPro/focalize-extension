import {Lens} from "lens-protocol";
import {getLensHub} from "../lens-hub";
import {Broadcast, CreateSetDispatcherTypedData} from "../graph/lens-service";
import {signedTypeData} from "./ethers-service";
import {splitSignature} from "ethers/lib/utils";
import {pollUntilIndexed} from "./has-transaction-been-indexed";

import type {BroadcastRequest, RelayerResult, SetDispatcherRequest} from "../graph/lens-service";

export const canUseRelay = async (profileId: string): Promise<boolean> => {
    let profileRes;

    try {
        profileRes = await Lens.profileById(profileId)
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
    const signature = await signedTypeData(typedData.domain, typedData.types, typedData.value);

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