import {v4 as uuidv4} from "uuid";
import {BigNumber, utils} from "ethers";
import {Lens} from "lens-protocol";

import {APP_ID} from "../config";
import {PublicationMainFocus} from "../graph/lens-service";
import {pollUntilIndexed} from "./has-transaction-been-indexed";
import {getDefaultProfile, getOrRefreshAccessToken} from "./lens-auth";
import {uploadFile} from "./ipfs-service";
import {getLensHub} from "../lens-hub";

import type {MetadataAttributeOutput} from "../graph/lens-service";
import type {OperationResult} from "urql";

interface MetadataMedia {
    item: string;
    type: string;
}

export const FREE_COLLECT_MODULE = {freeCollectModule: {followerOnly: false}};
export const EMPTY_REFERENCE_MODULE = {followerOnlyReferenceModule: false};

const makeMetadataFile = (
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

const getPublicationId = async (tx) => {
    const indexedResult = await pollUntilIndexed(tx.hash);

    const logs = indexedResult.txReceipt.logs;
    const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
    );

    const profileCreatedLog = logs.find((l: any) => l.topics[0] === topicId);
    let profileCreatedEventLog = profileCreatedLog.topics;

    const publicationId = utils.defaultAbiCoder.decode(['uint256'], profileCreatedEventLog[2])[0];
    return BigNumber.from(publicationId).toHexString();
}

export const submitPost = async (markdown: string) => {
    const accessToken = await getOrRefreshAccessToken();
    const profile = await getDefaultProfile();

    const metadata: File = makeMetadataFile({
        name: `Post by @${profile.handle}`,
        content: markdown,
        mainContentFocus: PublicationMainFocus.TextOnly
    })
    const metadataCid = await uploadFile(metadata);

    const postResult = await Lens.CreatePostTypedData(
        profile.id,
        `ipfs://${metadataCid}`,
        FREE_COLLECT_MODULE,
        EMPTY_REFERENCE_MODULE,
        accessToken
    ) as OperationResult
    if (postResult.error) {
        // TODO
        console.error(postResult.error);
        return;
    }

    const typedData = postResult.data.createPostTypedData.typedData;

    const lensHub = getLensHub();
    const tx = await lensHub.post({
        profileId: typedData.value.profileId,
        contentURI: typedData.value.contentURI,
        collectModule: typedData.value.collectModule,
        collectModuleInitData: typedData.value.collectModuleInitData,
        referenceModule: typedData.value.referenceModule,
        referenceModuleInitData: typedData.value.referenceModuleInitData
    });
    console.log('submitPost: submitted transaction', tx);

    const publicationId = await getPublicationId(tx);

    console.log('submitPost: post has been indexed', postResult.data);
    console.log(`submitPost: internal publication id ${profile.id} - ${publicationId}`);
};