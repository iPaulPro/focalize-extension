import {v4 as uuid} from "uuid";
import Autolinker, {UrlMatch} from "autolinker";

import {APP_ID, LENS_PREVIEW_NODE} from "../../config";
import {DEFAULT_REFERENCE_MODULE, REVERT_COLLECT_MODULE} from "./lens-modules";

import type {
    BroadcastRequest,
    CollectModuleParams,
    CreatePostBroadcastItemResult,
    CreatePublicPostRequest,
    MetadataAttributeInput,
    PublicationMetadataMediaInput,
    PublicationMetadataV2Input,
    ReferenceModuleParams,
    RelayerResult,
    ValidatePublicationMetadataRequest
} from "../graph/lens-service";
import {PublicationContentWarning, PublicationMainFocus, PublicationMetadataDisplayTypes,} from "../graph/lens-service";
import {getOrRefreshAccessToken} from "../user/lens-auth";
import {uploadAndPin} from "../ipfs-service";
import {getLensHub} from "../evm/lens-hub";
import {ensureCorrectChain, signTypedData} from "../evm/ethers-service";
import {deleteDraft} from "../stores/draft-store";

import lensApi from "../lens-api";
import type {User} from "../user/user";
import {PublicationState, publicationState} from "../stores/state-store";

const makeMetadataFile = (metadata: PublicationMetadataV2Input, id: string = uuid()): File => {
    const obj = {
        ...metadata,
        version: '2.0.0',
        metadata_id: id,
        appId: APP_ID
    }
    const o = Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
    console.log('makeMetadataFile: Creating metadata file for', o);
    const blob = new Blob([JSON.stringify(o)], {type: 'application/json'})
    return new File([blob], `metadata.json`)
};

export const generateTextPostMetadata = (
    handle: string,
    content: string | undefined,
    mainContentFocus: PublicationMainFocus,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    locale: string = 'en',
    attributes: MetadataAttributeInput[] = [],
): PublicationMetadataV2Input => (
    {
        name: `Post by @${handle}`,
        content,
        mainContentFocus,
        tags,
        contentWarning,
        attributes,
        locale,
    } as PublicationMetadataV2Input
)

export const generateImagePostMetadata = (
    handle: string,
    media: PublicationMetadataMediaInput[],
    title?: string,
    content?: string,
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    image: string = media[0].item,
    imageMimeType: string = media[0].type,
    attributes: MetadataAttributeInput[] = [],
): PublicationMetadataV2Input => (
    {
        name: title || `Post by @${handle}`,
        media,
        image,
        imageMimeType,
        content,
        description,
        mainContentFocus: PublicationMainFocus.Image,
        tags,
        contentWarning,
        attributes,
        external_url: LENS_PREVIEW_NODE + 'u/'+ handle,
        locale,
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
    media: PublicationMetadataMediaInput[],
    title?: string,
    image?: string,
    imageMimeType?: string,
    content?: string,
    attributes?: MetadataAttributeInput[],
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    animationUrl: string = media[0].item,
): PublicationMetadataV2Input => (
    {
        name: title || `Post by @${handle}`,
        media,
        image,
        imageMimeType,
        animation_url: animationUrl,
        content,
        description,
        attributes,
        mainContentFocus: PublicationMainFocus.Video,
        tags,
        contentWarning,
        external_url: LENS_PREVIEW_NODE + 'u/'+ handle,
        locale,
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
    media: PublicationMetadataMediaInput[],
    title?: string,
    image?: string,
    imageMimeType?: string,
    content?: string,
    attributes?: MetadataAttributeInput[],
    tags?: string[],
    contentWarning?: PublicationContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    animationUrl: string = media[0].item,
): PublicationMetadataV2Input => {
    const artistAttr = attributes?.find(attr => attr.traitType === 'author');
    return {
        name: artistAttr ? `${artistAttr.value} - ${title}` : title,
        media,
        image,
        imageMimeType,
        animation_url: animationUrl,
        content,
        description,
        attributes,
        mainContentFocus: PublicationMainFocus.Audio,
        tags,
        contentWarning,
        external_url: LENS_PREVIEW_NODE + 'u/' + handle,
        locale,
    } as PublicationMetadataV2Input;
};

const validateMetadata = async (metadata: PublicationMetadataV2Input) => {
    const request: ValidatePublicationMetadataRequest = {
        metadatav2: {
            ...metadata,
            version: '2.0.0',
            metadata_id: uuid(),
            appId: APP_ID,
        }
    };
    const {validatePublicationMetadata} = await lensApi.validatePublicationMetadata({request});
    return validatePublicationMetadata;
}

const _createPostViaDispatcher = async (request: CreatePublicPostRequest): Promise<RelayerResult> => {
    const {createPostViaDispatcher} = await lensApi.createPostViaDispatcher({request});
    if (createPostViaDispatcher.__typename === 'RelayError') throw createPostViaDispatcher.reason;
    return createPostViaDispatcher;
}

const _createPostTypedData = async (
    profileId: string,
    contentURI: string,
    collectModule: CollectModuleParams,
    referenceModule: ReferenceModuleParams,
): Promise<CreatePostBroadcastItemResult> => {
    const request = {profileId, contentURI, referenceModule, collectModule}
    const {createPostTypedData} = await lensApi.createPostTypedData({request});
    return createPostTypedData;
};

const createPostTransaction = async (
    profileId: string,
    contentURI: string,
    useRelay: boolean,
    collectModule: CollectModuleParams = REVERT_COLLECT_MODULE,
    referenceModule: ReferenceModuleParams = DEFAULT_REFERENCE_MODULE,
): Promise<string> => {
    await ensureCorrectChain();

    const postResult = await _createPostTypedData(
        profileId,
        contentURI,
        collectModule,
        referenceModule
    );

    const typedData = postResult.typedData;
    console.log('createPostTransaction: Created post typed data', typedData);

    if (useRelay) {
        // @ts-ignore This function strips the __typename
        const signature = await signTypedData(typedData.domain, typedData.types, typedData.value);
        const request: BroadcastRequest = {
            id: postResult.id,
            signature
        }
        const {broadcast} = await lensApi.broadcast({request});

        if (broadcast.__typename === 'RelayerResult') {
            console.log('createPostTransaction: broadcast transaction success', broadcast.txHash)
            return broadcast.txHash;
        } else if (broadcast.__typename === 'RelayError') {
            console.error('createPostTransaction: post with broadcast failed', broadcast.reason);
            // allow fallback to self-broadcasting
        }
    }

    const lensHub = await getLensHub();
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
    draftId: string,
    metadata: PublicationMetadataV2Input,
    referenceModule: ReferenceModuleParams = DEFAULT_REFERENCE_MODULE,
    collectModule: CollectModuleParams = REVERT_COLLECT_MODULE,
    useDispatcher: boolean = true,
    useRelay: boolean = false
): Promise<string> => {
    const profileId = user.profileId;
    console.log(`submitPost: profileId = ${profileId}, metadata = ${JSON.stringify(metadata)}, referenceModule = ${JSON.stringify(referenceModule)}, collectModule = ${JSON.stringify(collectModule)}`)

    try {
        await getOrRefreshAccessToken();
    } catch (e) {
        chrome.runtime.openOptionsPage();
        window?.close();
        throw new Error('submitPost: Failed to get access token');
    }

    const validate = await validateMetadata(metadata);
    if (!validate.valid) {
        throw validate.reason;
    }

    const metadataFile: File = makeMetadataFile(metadata, draftId);
    const metadataCid = await uploadAndPin(metadataFile);
    const contentURI = `ipfs://${metadataCid}`;
    console.log('submitPost: Uploaded metadata to IPFS with URI', contentURI);

    // At this point we know the metadata is valid and available on IPFS, so show optimistic completion
    publicationState.set(PublicationState.SUBMITTED);

    let txHash: string | undefined;

    if (useDispatcher && user.canUseRelay) {
        try {
            const relayerResult = await _createPostViaDispatcher(
                {profileId, contentURI, collectModule, referenceModule}
            );
            txHash = relayerResult.txHash;
            console.log('submitPost: created post with dispatcher', txHash);
        } catch (e) {
            console.error('Error creating post with dispatcher', e);
        }
    }

    if (!txHash) {
        txHash = await createPostTransaction(profileId, contentURI, useRelay, collectModule, referenceModule);
    }

    publicationState.set(PublicationState.SUCCESS);

    const res = await chrome.runtime.sendMessage({type: 'getPublicationId', post: {txHash, metadata}});
    if (res.error) {
        publicationState.set(PublicationState.ERROR);
        throw res.error;
    }

    console.log('submitPost: post has been indexed', res.publicationId);

    deleteDraft(draftId).catch(console.warn);

    return res.publicationId;
};

/**
 * Listen for publication state updates from background.ts
 */
chrome.runtime.onConnect.addListener(port => {
    console.log('chrome.runtime.onConnect: port', port);
    if (port.name !== 'getPublicationId') return;

    port.onMessage.addListener(msg => {
        const state: PublicationState = msg.state;
        console.log('port.onMessage: state', state);
        publicationState.set(state);
    });
});

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