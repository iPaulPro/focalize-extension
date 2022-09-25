import {v4 as uuid} from "uuid";
import {BigNumber, utils} from "ethers";
import {Lens} from "lens-protocol";

import {APP_ID} from "../config";
import {
    AsyncEnabledModuleCurrencies,
    PublicationContentWarning,
    PublicationMainFocus
} from "../graph/lens-service";
import {pollUntilIndexed} from "./has-transaction-been-indexed";
import {getOrRefreshAccessToken} from "./lens-auth";
import {uploadFile} from "./ipfs-service";
import {getLensHub} from "../lens-hub";

import type {CollectModuleParams, EnabledModuleCurrenciesQuery, Erc20, MetadataAttributeOutput, Profile} from "../graph/lens-service";
import type {OperationResult} from "urql";
import type {ApolloQueryResult} from "@apollo/client";

interface MetadataMedia {
    item: string;
    type: string;
}

export const FREE_COLLECT_MODULE = {freeCollectModule: {followerOnly: false}};
export const REVERT_COLLECT_MODULE: CollectModuleParams = {revertCollectModule: true};

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
        tags = [],
        contentWarning,
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
        tags?: string[],
        contentWarning?: PublicationContentWarning,
        locale?: string
    }
): File => {
    const obj = {
        version: '2.0.0',
        metadata_id: uuid(),
        content,
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

    if (tags?.length > 0) {
        obj['tags'] = tags;
    }

    if (contentWarning) {
        obj['contentWarning'] = contentWarning;
    }

    if (mainContentFocus) {
        obj['mainContentFocus'] = mainContentFocus;
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

export const submitPost = async (
    profile: Profile,
    content: string,
    mainContentFocus: PublicationMainFocus = PublicationMainFocus.TextOnly,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    followersOnly: boolean = false,
    collectModule: CollectModuleParams = FREE_COLLECT_MODULE
): Promise<string> => {
    const accessToken = await getOrRefreshAccessToken();

    const metadata: File = makeMetadataFile({
        name: `Post by @${profile.handle}`,
        content,
        mainContentFocus,
        tags,
        contentWarning
    })
    const metadataCid = await uploadFile(metadata);
    // TODO check for upload failure
    const contentURI = `ipfs://${metadataCid}`;

    const referenceModule = {followerOnlyReferenceModule: followersOnly}

    const postResult = await Lens.CreatePostTypedData(
        profile.id,
        contentURI,
        collectModule,
        referenceModule,
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
    return publicationId;
};

export const getEnabledModuleCurrencies = async (): Promise<Erc20[]> => {
    const res: ApolloQueryResult<EnabledModuleCurrenciesQuery> = await AsyncEnabledModuleCurrencies({})
    if (res.error) {
        return Promise.reject(res.error);
    }
    return Promise.resolve(res.data.enabledModuleCurrencies);
}