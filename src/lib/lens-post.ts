import {v4 as uuid} from "uuid";
import {BigNumber, utils} from "ethers";
import {Lens} from "lens-protocol";

import {APP_ID} from "../config";

import type {
    CollectModule,
    CollectModuleParams,
    EnabledModuleCurrenciesQuery,
    Erc20, LimitedTimedFeeCollectModuleSettings, ModuleFeeAmountParams,
    PublicationMetadataMediaInput,
    PublicationMetadataV2Input
} from "../graph/lens-service";

import {
    AsyncEnabledModuleCurrencies,
    PublicationContentWarning,
    PublicationMainFocus,
} from "../graph/lens-service";

import {pollUntilIndexed} from "./has-transaction-been-indexed";
import {getOrRefreshAccessToken} from "./lens-auth";
import {uploadFile} from "./ipfs-service";
import {getLensHub} from "../lens-hub";

import type {OperationResult} from "urql";
import type {ApolloQueryResult} from "@apollo/client";

export const FREE_COLLECT_MODULE = {freeCollectModule: {followerOnly: false}};
export const REVERT_COLLECT_MODULE: CollectModuleParams = {revertCollectModule: true};

const makeMetadataFile = (metadata: PublicationMetadataV2Input): File => {
    const obj = {
        version: '2.0.0',
        metadata_id: uuid(),
        appId: APP_ID,
        locale: 'en',
        ...metadata
    }
    console.log('makeMetadataFile: Creating metadata file for', obj);
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

export const generateTextPostMetadata = (
    handle: string,
    content: string,
    mainContentFocus: PublicationMainFocus,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
): PublicationMetadataV2Input => (
    {
        name: `Post by @${handle}`,
        content,
        mainContentFocus,
        tags,
        contentWarning
    } as PublicationMetadataV2Input
)

export const generateImagePostMetadata = (
    handle: string,
    media: PublicationMetadataMediaInput,
    title?: string,
    content?: string,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    image: string = media.item,
    imageMimeType: string = media.type,
): PublicationMetadataV2Input => (
    {
        name: title || `Post by @${handle}`,
        media: [media],
        image,
        imageMimeType,
        content,
        description: content,
        mainContentFocus: PublicationMainFocus.Image,
        tags,
        contentWarning
    } as PublicationMetadataV2Input
)

export const generateVideoPostMetadata = (
    handle: string,
    media: PublicationMetadataMediaInput,
    title?: string,
    content?: string,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    animationUrl: string = media.item,
): PublicationMetadataV2Input => (
    {
        name: title || `Post by @${handle}`,
        media: [media],
        animation_url: animationUrl,
        content: title ? `${title}\n\n${content}` : content,
        description: content,
        mainContentFocus: PublicationMainFocus.Video,
        tags,
        contentWarning
    } as PublicationMetadataV2Input
)

export const submitPost = async (
    profileId: string,
    metadata: PublicationMetadataV2Input,
    followersOnly: boolean = false,
    collectModule: CollectModuleParams = FREE_COLLECT_MODULE
): Promise<string> => {
    const accessToken = await getOrRefreshAccessToken();

    const metadataFile: File = makeMetadataFile(metadata);
    const metadataCid = await uploadFile(metadataFile);
    console.log('submitPost: Uploaded metadata to IPFS', metadataCid);

    const contentURI = `ipfs://${metadataCid}`;

    const referenceModule = {followerOnlyReferenceModule: followersOnly}

    const postResult = await Lens.CreatePostTypedData(
        profileId,
        contentURI,
        collectModule,
        referenceModule,
        accessToken
    ) as OperationResult

    if (postResult.error) throw postResult.error

    const typedData = postResult.data.createPostTypedData.typedData;
    console.log('submitPost: Created post typed data', typedData);

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

export const getCollectModuleParams = (module: CollectModule): CollectModuleParams => {
    if (module.__typename === "FreeCollectModuleSettings" ||
        module.__typename === "UnknownCollectModuleSettings" ||
        module.__typename === "RevertCollectModuleSettings") {
        throw 'Unsupported module type';
    }

    const baseModule =  {
        amount: {
            currency: module.amount.asset.address,
            value: module.amount.value
        },
        followerOnly: module.followerOnly,
        recipient: module.recipient,
        referralFee: 0
    }

    switch (module.__typename) {
        case 'LimitedTimedFeeCollectModuleSettings':
            return {
                limitedTimedFeeCollectModule: {
                    ...baseModule,
                    collectLimit: module.collectLimit.toString()
                }
            }
        case 'LimitedFeeCollectModuleSettings':
            return {
                limitedFeeCollectModule: {
                    ...baseModule,
                    collectLimit: module.collectLimit.toString()
                }
            }
        case 'TimedFeeCollectModuleSettings':
            return {
                timedFeeCollectModule: {
                    ...baseModule
                }
            }
    }

    return {
        feeCollectModule: {
            ...baseModule
        }
    }
};