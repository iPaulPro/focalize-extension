import gqlClient from "../graph/graphql-client";
import {PublicationMetadataStatusType} from "../graph/lens-service";
import {sleep} from "./utils";

export const pollUntilIndexed = async (txHash: string) => {
    while (true) {
        const {hasTxHashBeenIndexed} = await gqlClient.HasTransactionBeenIndexed({request: {txHash}});

        if (hasTxHashBeenIndexed.__typename === 'TransactionError') {
            throw hasTxHashBeenIndexed.reason;
        }

        console.log('pollUntilIndexed: indexed', hasTxHashBeenIndexed.indexed);
        console.log('pollUntilIndexed: metadataStatus', hasTxHashBeenIndexed.metadataStatus);

        if (hasTxHashBeenIndexed.metadataStatus) {
            if (hasTxHashBeenIndexed.metadataStatus.status === PublicationMetadataStatusType.Success) {
                return hasTxHashBeenIndexed;
            }

            if (hasTxHashBeenIndexed.metadataStatus.status === PublicationMetadataStatusType.MetadataValidationFailed) {
                throw new Error(hasTxHashBeenIndexed.metadataStatus.reason!!);
            }
        } else {
            if (hasTxHashBeenIndexed.indexed) {
                return hasTxHashBeenIndexed;
            }
        }

        console.log('pollUntilIndexed: sleep for 1500 milliseconds then try again');
        // sleep for a second before trying again
        await sleep(1500);
    }
};