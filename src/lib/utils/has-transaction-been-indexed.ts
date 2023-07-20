import lensApi from "../lens-api";
import type {TransactionReceipt} from "../graph/lens-service";
import {PublicationMetadataStatusType} from "../graph/lens-service";
import {sleep} from "./utils";
import {BigNumber, utils} from "ethers";
import type {Log} from "@ethersproject/providers";
import {PublicationState} from "../stores/state-store";

const getPublicationId = (logs: Array<Log>) => {
    const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
    );

    const log = logs?.find((l: any) => l.topics[0] === topicId);
    if (!log) {
        throw new Error('getPublicationId: Error while finding log');
    }

    const profileCreatedEventLog = log.topics;

    const publicationId = utils.defaultAbiCoder.decode(['uint256'], profileCreatedEventLog[2])[0];
    return BigNumber.from(publicationId).toHexString();
}

export const pollUntilIndexed = async (
    txHash: string,
    stateListener?: (state: PublicationState) => void
): Promise<TransactionReceipt | null | undefined> => {
    while (true) {
        const {hasTxHashBeenIndexed} = await lensApi.hasTransactionBeenIndexed({request: {txHash}});
        console.log('pollUntilIndexed: hasTxHashBeenIndexed', hasTxHashBeenIndexed);

        if (hasTxHashBeenIndexed.__typename === 'TransactionError') {
            throw hasTxHashBeenIndexed.reason;
        }

        if (hasTxHashBeenIndexed.indexed) {
            return hasTxHashBeenIndexed.txReceipt;
        }

        if (hasTxHashBeenIndexed.metadataStatus) {
            switch (hasTxHashBeenIndexed.metadataStatus.status) {
                case PublicationMetadataStatusType.Pending:
                    stateListener?.(PublicationState.PENDING);
                    break;
                case PublicationMetadataStatusType.Success:
                    return hasTxHashBeenIndexed.txReceipt;
                case PublicationMetadataStatusType.MetadataValidationFailed:
                    throw new Error(hasTxHashBeenIndexed.metadataStatus.reason!!);
            }
        }

        console.log('pollUntilIndexed: sleep for 1500 milliseconds then try again');
        // sleep for a second before trying again
        await sleep(1500);
    }
};

export const pollForPublicationId = async (
    txHash: string,
    stateListener: (state: PublicationState) => void
): Promise<string> => {
    console.log('pollForPublicationId: txHash=', txHash);

    const txReceipt = await pollUntilIndexed(txHash, stateListener);
    const logs = txReceipt?.logs;

    if (!logs) throw new Error('Unable to retrieve publication id from logs');

    return getPublicationId(logs);
};
