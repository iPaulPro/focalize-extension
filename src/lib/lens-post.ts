import type {MetadataAttributeOutput, PublicationMainFocus} from "../graph/lens-service";
import {v4 as uuidv4} from "uuid";
import {pollUntilIndexed} from "./has-transaction-been-indexed";
import {BigNumber, utils} from "ethers";
import {APP_ID} from "../config";

interface MetadataMedia {
    item: string;
    type: string;
}

export const FREE_COLLECT_MODULE = {freeCollectModule: {followerOnly: false}};
export const EMPTY_REFERENCE_MODULE = {followerOnlyReferenceModule: false};

export const makeMetadataFile = (
    {
        content,
        mainContentFocus,
        externalUrl,
        name,
        image,
        imageMimeType,
        media,
        animationUrl,
        attributes = [],
        locale = 'en'
    }: {
        name: string,
        mainContentFocus: PublicationMainFocus
        content?: string,
        externalUrl?: string,
        image?: string,
        imageMimeType?: string,
        media?: MetadataMedia[],
        animationUrl?: string,
        attributes?: MetadataAttributeOutput[],
        locale?: string
    }
): File => {
    const obj = {
        version: '2.0.0',
        metadata_id: uuidv4(),
        content,
        mainContentFocus,
        external_url: externalUrl,
        name,
        attributes,
        image,
        imageMimeType,
        media,
        animation_url: animationUrl,
        locale,
        appId: APP_ID
    }
    const blob = new Blob([JSON.stringify(obj)], {type: 'application/json'})
    return new File([blob], `metadata.json`)
};

export const getPublicationId = async (tx) => {
    const indexedResult = await pollUntilIndexed(tx.hash);

    const logs = indexedResult.txReceipt.logs;
    console.log('submitPost: logs', logs);

    const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
    );
    console.log('submitPost: topicid we care about', topicId);

    const profileCreatedLog = logs.find((l: any) => l.topics[0] === topicId);
    console.log('submitPost: created log', profileCreatedLog);

    let profileCreatedEventLog = profileCreatedLog.topics;
    console.log('submitPost: created event logs', profileCreatedEventLog);

    const publicationId = utils.defaultAbiCoder.decode(['uint256'], profileCreatedEventLog[2])[0];
    return BigNumber.from(publicationId).toHexString();
}