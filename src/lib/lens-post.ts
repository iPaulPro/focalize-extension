import {v4 as uuid} from "uuid";
import {BigNumber, utils} from "ethers";
import {Lens} from "lens-protocol";

import {APP_ID} from "../config";

import type {
    BroadcastRequest,
    CollectModuleParams,
    CreatePublicPostRequest,
    MetadataAttributeInput, Profile,
    PublicationMetadataMediaInput,
    PublicationMetadataV2Input,
    ReferenceModuleParams,
    RelayerResult,
    ValidatePublicationMetadataRequest
} from "../graph/lens-service";
import {
    AsyncValidatePublicationMetadata, Broadcast, CreatePostViaDispatcher,
    PublicationContentWarning,
    PublicationMainFocus,
    PublicationMetadataDisplayTypes
} from "../graph/lens-service";
import {pollUntilIndexed} from "./has-transaction-been-indexed";
import {getOrRefreshAccessToken} from "./lens-auth";
import {uploadAndPin} from "./ipfs-service";
import {getLensHub} from "../lens-hub";
import {DEFAULT_REFERENCE_MODULE, REVERT_COLLECT_MODULE} from "./lens-modules";

import type {OperationResult} from "urql";
import {signTypedData} from "./ethers-service";
import Autolinker, {UrlMatch} from "autolinker";
import type {LensNode} from "./lens-nodes";
import {nodeArticle, nodeAudio, nodeImage, nodePost, nodeVideo} from "./store/preferences-store";
import {get} from "./store/chrome-storage-store";
import type {User} from "./user";

const makeMetadataFile = (metadata: PublicationMetadataV2Input): File => {
    const obj = {
        ...metadata,
        version: '2.0.0',
        metadata_id: uuid(),
        appId: APP_ID,
        locale: 'en',
    }
    let o = Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
    console.log('makeMetadataFile: Creating metadata file for', o);
    const blob = new Blob([JSON.stringify(o)], {type: 'application/json'})
    return new File([blob], `metadata.json`)
};

const getPublicationId = async (txHash: string) => {
    const indexedResult = await pollUntilIndexed(txHash);

    const logs = indexedResult?.txReceipt?.logs;
    const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
    );

    const log = logs?.find((l: any) => l.topics[0] === topicId);
    if (!log) {
        throw 'getPublicationId: Error while finding log';
    }

    let profileCreatedEventLog = log.topics;

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
    description: string | undefined = content,
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
    description: string | undefined = content,
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
    description: string | undefined = content,
    animationUrl: string = media.item,
): PublicationMetadataV2Input => {
    const artistAttr = attributes?.find(attr => attr.traitType === 'author');
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
            ...metadata,
            version: '2.0.0',
            metadata_id: uuid(),
            appId: APP_ID,
        }
    }
    return AsyncValidatePublicationMetadata({variables: {request}})
        .then(res => res.data.validatePublicationMetadata)
}

const createPostViaDispatcher = (request: CreatePublicPostRequest): Promise<RelayerResult> => {
    return CreatePostViaDispatcher({variables: {request}})
        .then(res => res.data!!)
        .then(data => {
            if (data.createPostViaDispatcher.__typename === 'RelayError') {
                throw data.createPostViaDispatcher.reason;
            }
            return data.createPostViaDispatcher as RelayerResult;
        })
}

const createPostTransaction = async (
    profileId: string,
    contentURI: string,
    accessToken: string,
    useRelay: boolean,
    referenceModule: ReferenceModuleParams = DEFAULT_REFERENCE_MODULE,
    collectModule: CollectModuleParams = REVERT_COLLECT_MODULE,
): Promise<string> => {
    const postResult = await Lens.CreatePostTypedData(
        profileId,
        contentURI,
        collectModule,
        referenceModule,
        accessToken
    ) as OperationResult

    if (postResult.error) throw postResult.error

    const typedData = postResult.data.createPostTypedData.typedData;
    console.log('createPostTransaction: Created post typed data', typedData);

    if (useRelay) {
        const signature = await signTypedData(typedData.domain, typedData.types, typedData.value);
        const request: BroadcastRequest = {
            id: postResult.data.createPostTypedData.id,
            signature
        }
        const res = await Broadcast({variables: {request}});

        if (res?.data?.broadcast.__typename === 'RelayerResult') {
            const broadcast: RelayerResult = res.data.broadcast;
            console.log('createPostTransaction: broadcast transaction success', broadcast.txHash)
            return broadcast.txHash;
        } else if (res?.data?.broadcast.__typename === 'RelayError') {
            console.error('createPostTransaction: post with broadcast failed');
            if (res.data.broadcast.reason) {
                console.error(res.data.broadcast.reason);
            }
        }
    }

    const lensHub = getLensHub();
    const tx = await lensHub.post({
        profileId: typedData.value.profileId,
        contentURI: typedData.value.contentURI,
        collectModule: typedData.value.collectModule,
        collectModuleInitData: typedData.value.collectModuleInitData,
        referenceModule: typedData.value.referenceModule,
        referenceModuleInitData: typedData.value.referenceModuleInitData
    });
    console.log('createPostTransaction: submitted transaction', tx);
    return tx.hash;
};

export const submitPost = async (
    user: User,
    metadata: PublicationMetadataV2Input,
    referenceModule: ReferenceModuleParams = DEFAULT_REFERENCE_MODULE,
    collectModule: CollectModuleParams = REVERT_COLLECT_MODULE,
    useDispatcher: boolean = true,
    useRelay: boolean = false
): Promise<string> => {
    const profileId = user.profileId;
    console.log(`submitPost: profileId = ${profileId}, metadata = ${JSON.stringify(metadata)}, referenceModule = ${JSON.stringify(referenceModule)}, collectModule = ${JSON.stringify(collectModule)}`)
    const accessToken = await getOrRefreshAccessToken();

    const validate = await validateMetadata(metadata);
    if (!validate.valid) {
        throw validate.reason;
    }

    const metadataFile: File = makeMetadataFile(metadata);
    const metadataCid = await uploadAndPin(metadataFile);
    const contentURI = `ipfs://${metadataCid}`;
    console.log('submitPost: Uploaded metadata to IPFS with URI', contentURI);

    let txHash: string | undefined;

    if (useDispatcher && user.canUseRelay) {
        try {
            const relayerResult = await createPostViaDispatcher(
                {profileId, contentURI, collectModule, referenceModule}
            );
            txHash = relayerResult.txHash;
            console.log('submitPost: created post with dispatcher', txHash);
        } catch (e) {
            console.error('Error creating post with dispatcher', e);
        }
    }

    if (!txHash) {
        txHash = await createPostTransaction(
            profileId,
            contentURI,
            accessToken,
            useRelay,
            referenceModule,
            collectModule
        );
    }

    const publicationId = await getPublicationId(txHash);
    console.log('submitPost: post has been indexed', publicationId);

    return publicationId;
};

export const getUrlsFromText = (content: string): string[] => {
    const matches = Autolinker.parse(content, {
        phone: false,
        email: false,
        stripPrefix: false,
        urls: {
            tldMatches: true
        }
    });
    console.log('autolink: matches =', matches);

    if (matches.length === 0) {
        return [];
    }

    const urlMatches = matches.filter((match): match is UrlMatch => match instanceof UrlMatch);
    return urlMatches.map(match => {
        if (match.getUrlMatchType() === "tld") {
            return 'https://' + match.getUrl();
        }
        return match.getUrl();
    });
}

export const getNodeUrlForPublication = async (postType: PublicationMainFocus, postId: string) => {
    let node: LensNode;

    switch (postType) {
        case PublicationMainFocus.Image:
            node = await get(nodeImage);
            break;
        case PublicationMainFocus.Video:
            node = await get(nodeVideo);
            break;
        case PublicationMainFocus.Audio:
            node = await get(nodeAudio);
            break;
        case PublicationMainFocus.Article:
            node = await get(nodeArticle);
            break;
        default:
            node = await get(nodePost);
    }

    let id = postId;
    if (!node.hexIdentifier) {
        const parts = postId.split('-');
        const profileId = parseInt(parts[0], 16);
        const publicationId = parseInt(parts[1], 16);
        id = profileId + '-' + publicationId;
    }

    return node.baseUrl + node.path.replace('{$1}', id);
}