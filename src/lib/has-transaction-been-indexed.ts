// Apollo cannot be used in background service workers
import {GraphQLClient} from "graphql-request";

import {HasTransactionBeenIndexedDoc, PublicationMetadataStatusType} from "../graph/lens-service";
import {sleep} from "./utils";
import {LENS_API} from "../config";

import type {HasTransactionBeenIndexedQuery, HasTransactionBeenIndexedQueryVariables,} from "../graph/lens-service";

export const pollUntilIndexed = async (txHash: string) => {
    const client = new GraphQLClient(LENS_API, {fetch, cache: "no-cache"});

    while (true) {
        const data = await client.request<HasTransactionBeenIndexedQuery, HasTransactionBeenIndexedQueryVariables>(
            HasTransactionBeenIndexedDoc,
            {request: {txHash}}
        );

        const response = data.hasTxHashBeenIndexed;
        if (response?.__typename === 'TransactionIndexedResult') {
            console.log('pollUntilIndexed: indexed', response.indexed);
            console.log('pollUntilIndexed: metadataStatus', response.metadataStatus);

            if (response.metadataStatus) {
                if (response.metadataStatus.status === PublicationMetadataStatusType.Success) {
                    return response;
                }

                if (response.metadataStatus.status === PublicationMetadataStatusType.MetadataValidationFailed) {
                    throw new Error(response.metadataStatus.reason!!);
                }
            } else {
                if (response.indexed) {
                    return response;
                }
            }

            console.log('pollUntilIndexed: sleep for 1500 milliseconds then try again');
            // sleep for a second before trying again
            await sleep(1500);
        } else {
            // it got reverted and failed!
            throw new Error(response.reason);
        }
    }
};