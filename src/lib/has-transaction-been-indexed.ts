import {AsyncHasTransactionBeenIndexed, PublicationMetadataStatusType} from "../graph/lens-service";
import {sleep} from "./utils";
import type {HasTxHashBeenIndexedRequest} from "../graph/lens-service";

export const pollUntilIndexed = async (txHash: string) => {
    while (true) {
        const request: HasTxHashBeenIndexedRequest = {txHash}
        const result = await AsyncHasTransactionBeenIndexed({variables: {request}});
        console.log('pool until indexed: result', result.data);

        const response = result.data.hasTxHashBeenIndexed;
        if (response.__typename === 'TransactionIndexedResult') {
            console.log('pool until indexed: indexed', response.indexed);
            console.log('pool until metadataStatus: metadataStatus', response.metadataStatus);

            if (response.metadataStatus) {
                if (response.metadataStatus.status === PublicationMetadataStatusType.Success) {
                    return response;
                }

                if (response.metadataStatus.status === PublicationMetadataStatusType.MetadataValidationFailed) {
                    throw new Error(response.metadataStatus.reason);
                }
            } else {
                if (response.indexed) {
                    return response;
                }
            }

            console.log('pool until indexed: sleep for 1500 milliseconds then try again');
            // sleep for a second before trying again
            await sleep(1500);
        } else {
            // it got reverted and failed!
            throw new Error(response.reason);
        }
    }
};