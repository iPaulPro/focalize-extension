import {v4 as uuid} from "uuid";
import {BigNumber, utils} from "ethers";
import {Lens} from "lens-protocol";

import {APP_ID} from "../config";

import type {
    BroadcastRequest,
    CollectModuleParams,
    MetadataAttributeInput,
    PublicationMetadataMediaInput,
    PublicationMetadataV2Input,
    ReferenceModuleParams,
    RelayerResult,
    ValidatePublicationMetadataRequest
} from "../graph/lens-service";
import {
    AsyncValidatePublicationMetadata, Broadcast,
    PublicationContentWarning,
    PublicationMainFocus,
    PublicationMetadataDisplayTypes
} from "../graph/lens-service";
import {pollUntilIndexed} from "./has-transaction-been-indexed";
import {getOrRefreshAccessToken} from "./lens-auth";
import {uploadAndPin} from "./ipfs-service";
import {getLensHub} from "../lens-hub";
import {DEFAULT_REFERENCE_MODULE, FREE_COLLECT_MODULE} from "./lens-modules";

import type {OperationResult} from "urql";
import {signedTypeData} from "./ethers-service";
import {splitSignature} from "ethers/lib/utils";

const makeMetadataFile = (metadata: PublicationMetadataV2Input): File => {
    const obj = {
        version: '2.0.0',
        metadata_id: uuid(),
        appId: APP_ID,
        locale: 'en',
        ...metadata
    }
    let o = Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
    console.log('makeMetadataFile: Creating metadata file for', o);
    const blob = new Blob([JSON.stringify(o)], {type: 'application/json'})
    return new File([blob], `metadata.json`)
};

const getPublicationId = async (txHash) => {
    const indexedResult = await pollUntilIndexed(txHash);

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
    attributes: MetadataAttributeInput[] = [],
): PublicationMetadataV2Input => (
    {
        name: `Post by @${handle}`,
        content,
        mainContentFocus,
        tags,
        contentWarning,
        attributes
    } as PublicationMetadataV2Input
)

export const generateImagePostMetadata = (
    handle: string,
    media: PublicationMetadataMediaInput,
    title?: string,
    content?: string,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    description: string = content,
    image: string = media.item,
    imageMimeType: string = media.type,
    attributes: MetadataAttributeInput[] = [],
): PublicationMetadataV2Input => (
    {
        name: title || `Post by @${handle}`,
        media: [media],
        image,
        imageMimeType,
        content,
        description,
        mainContentFocus: PublicationMainFocus.Image,
        tags,
        contentWarning,
        attributes,
        external_url: import.meta.env.VITE_LENS_PREVIEW_NODE + 'u/'+ handle,
    } as PublicationMetadataV2Input
)

export const createVideoAttributes = (): MetadataAttributeInput[] => {
    return [
        {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'type',
            value: 'video'
        }
    ] as MetadataAttributeInput[];
}

export const generateVideoPostMetadata = (
    handle: string,
    media: PublicationMetadataMediaInput,
    title?: string,
    image?: string,
    imageMimeType?: string,
    content?: string,
    attributes?: MetadataAttributeInput[],
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    description: string = content,
    animationUrl: string = media.item,
): PublicationMetadataV2Input => (
    {
        name: title || `Post by @${handle}`,
        media: [media],
        image,
        imageMimeType,
        animation_url: animationUrl,
        content,
        description,
        attributes,
        mainContentFocus: PublicationMainFocus.Video,
        tags,
        contentWarning,
        external_url: import.meta.env.VITE_LENS_PREVIEW_NODE + 'u/'+ handle,
    } as PublicationMetadataV2Input
);

export const createAudioAttributes = (author: string): MetadataAttributeInput[] => {
    return [
        {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'author',
            value: author
        },
        {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'type',
            value: 'audio'
        }
    ] as MetadataAttributeInput[];
}

export const generateAudioPostMetadata = (
    handle: string,
    media: PublicationMetadataMediaInput,
    title?: string,
    image?: string,
    imageMimeType?: string,
    content?: string,
    attributes?: MetadataAttributeInput[],
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    description: string = content,
    animationUrl: string = media.item,
): PublicationMetadataV2Input => {
    const artistAttr = attributes.find(attr => attr.traitType === 'author');
    return {
        name: artistAttr ? `${artistAttr.value} - ${title}` : title,
        media: [media],
        image,
        imageMimeType,
        animation_url: animationUrl,
        content,
        description,
        attributes,
        mainContentFocus: PublicationMainFocus.Audio,
        tags,
        contentWarning,
        external_url: import.meta.env.VITE_LENS_PREVIEW_NODE + 'u/' + handle,
    } as PublicationMetadataV2Input;
};

const validateMetadata = (metadata: PublicationMetadataV2Input) => {
    const request: ValidatePublicationMetadataRequest = {
        metadatav2: {
            version: '2.0.0',
            metadata_id: uuid(),
            appId: APP_ID,
            ...metadata
        }
    }
    return AsyncValidatePublicationMetadata({variables: {request}})
        .then(res => res.data.validatePublicationMetadata)
}

export const submitPost = async (
    profileId: string,
    metadata: PublicationMetadataV2Input,
    referenceModule: ReferenceModuleParams = DEFAULT_REFERENCE_MODULE,
    collectModule: CollectModuleParams = FREE_COLLECT_MODULE
): Promise<string> => {
    console.log(`submitPost: profileId = ${profileId}, metadata = ${JSON.stringify(metadata)}, referenceModule = ${JSON.stringify(referenceModule)}, collectModule = ${JSON.stringify(collectModule)}`)
    const accessToken = await getOrRefreshAccessToken();

    const validate = await validateMetadata(metadata);
    if (!validate.valid) {
        throw validate.reason;
    }

    const metadataFile: File = makeMetadataFile(metadata);
    const metadataCid = await uploadAndPin(metadataFile);
    console.log('submitPost: Uploaded metadata to IPFS', metadataCid);

    const contentURI = `ipfs://${metadataCid}`;

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

    const signature = await signedTypeData(typedData.domain, typedData.types, typedData.value);

    const request: BroadcastRequest = {
        id: postResult.data.createPostTypedData.id,
        signature
    }

    let txHash: string;

    const res = await Broadcast({variables: {request}});
    console.log('submitPost: broadcastResult', res);

    if (res.data.broadcast.__typename !== 'RelayerResult') {
        console.error('submitPost: post with broadcast failed');

        const { v, r, s } = splitSignature(signature);
        const lensHub = getLensHub();
        const tx = await lensHub.postWithSig({
            profileId: typedData.value.profileId,
            contentURI: typedData.value.contentURI,
            collectModule: typedData.value.collectModule,
            collectModuleInitData: typedData.value.collectModuleInitData,
            referenceModule: typedData.value.referenceModule,
            referenceModuleInitData: typedData.value.referenceModuleInitData,
            sig: {
                v,
                r,
                s,
                deadline: typedData.value.deadline,
            },
        });
        console.log('submitPost: submitted transaction', tx);
        txHash = tx.hash;
    } else {
        const broadcast: RelayerResult = res.data.broadcast as RelayerResult;
        txHash = broadcast.txHash;
    }

    const publicationId = await getPublicationId(txHash);
    console.log('submitPost: post has been indexed', publicationId, postResult.data);

    return publicationId;
};
