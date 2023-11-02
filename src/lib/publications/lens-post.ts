import Autolinker, { UrlMatch } from 'autolinker';

import { APP_ID, LENS_PREVIEW_NODE } from '../../config';

import { ensureCorrectChain, signTypedData } from '../evm/ethers-service';
import { deleteDraft } from '../stores/draft-store';

import type { User } from '../user/user';
import { PublicationState, publicationState } from '../stores/state-store';
import {
    broadcastPostOnChain,
    createPostTypedData,
    isAuthenticated,
    postOnChain,
    postOnMomoka,
} from '../lens-service';
import {
    PublicationMetadataSchema,
    textOnly,
    image,
    video,
    audio,
    type TextOnlyMetadata,
    type ImageMetadata,
    type VideoMetadata,
    type AudioMetadata,
    type PublicationMetadata,
    type AnyMedia,
    type MarketplaceMetadataAttribute,
    type MediaImage,
    type MediaVideo,
    type MediaAudio,
    MarketplaceMetadataAttributeDisplayType,
} from '@lens-protocol/metadata';

import {
    type BroadcastRequest,
    type OpenActionModuleInput,
    type ReferenceModuleInput,
    isRelaySuccess,
    isCreateMomokaPublicationResult,
} from '@lens-protocol/client';
import { getIrys } from '../irys-service';
import { formatHandleV2toV1, getMediaImageMimeType } from '../utils/lens-utils';

const uploadMetadata = async (
    metadata: PublicationMetadata
): Promise<string> => {
    console.log('makeMetadataFile: Creating metadata file for', metadata);

    const irys = await getIrys();
    const tx = await irys.upload(JSON.stringify(metadata), {
        tags: [{ name: 'Content-Type', value: 'application/json' }],
    });

    return tx.id;
};

const defaultTitle = (handle?: string): string =>
    `Post by @${(handle && formatHandleV2toV1(handle)) || 'anonymous'}`;

export const generateTextPostMetadata = (
    handle: string | undefined,
    content: string,
    tags?: string[],
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = []
): TextOnlyMetadata =>
    textOnly({
        content,
        tags,
        // contentWarning,
        marketplace: {
            name: defaultTitle(handle),
            attributes,
        },
        locale,
        appId: APP_ID,
    });

export const generateImagePostMetadata = (
    handle: string | undefined,
    mediaImage: MediaImage,
    title?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attachments?: AnyMedia[]
): ImageMetadata =>
    image({
        attachments,
        image: mediaImage,
        content,
        tags,
        // contentWarning,
        locale,
        marketplace: {
            name: title || defaultTitle(handle),
            description,
            external_url: LENS_PREVIEW_NODE + 'u/' + handle,
        },
        appId: APP_ID,
    });

const createVideoAttributes = (): MarketplaceMetadataAttribute[] => {
    return [
        {
            display_type: MarketplaceMetadataAttributeDisplayType.STRING,
            trait_type: 'type',
            value: 'video',
        },
    ] as MarketplaceMetadataAttribute[];
};

export const generateVideoPostMetadata = (
    handle: string | undefined,
    mediaVideo: MediaVideo,
    title?: string,
    image?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = createVideoAttributes(),
    attachments?: AnyMedia[]
): VideoMetadata =>
    video({
        video: mediaVideo,
        attachments,
        content,
        marketplace: {
            name: title || defaultTitle(handle),
            attributes,
            external_url: LENS_PREVIEW_NODE + 'u/' + handle,
            animation_url: mediaVideo.item,
            image,
            description,
        },
        tags,
        // contentWarning,
        locale,
        appId: APP_ID,
    });

export const createAudioAttributes = (
    author?: string
): MarketplaceMetadataAttribute[] => {
    if (!author) return [];
    return [
        {
            display_type: MarketplaceMetadataAttributeDisplayType.STRING,
            trait_type: 'author',
            value: author,
        },
        {
            display_type: MarketplaceMetadataAttributeDisplayType.STRING,
            trait_type: 'type',
            value: 'audio',
        },
    ] as MarketplaceMetadataAttribute[];
};

export const generateAudioPostMetadata = (
    handle: string | undefined,
    audioMedia: MediaAudio,
    title?: string,
    image?: string,
    content?: string,
    artist?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = createAudioAttributes(artist),
    attachments?: AnyMedia[]
): AudioMetadata => {
    return audio({
        audio: {
            item: audioMedia.item,
            type: audioMedia.type,
            cover: image,
            artist,
        },
        attachments,
        content,
        tags,
        // contentWarning,
        locale,
        marketplace: {
            name: artist
                ? `${artist} - ${title ?? 'untitled'}`
                : title ?? defaultTitle(handle),
            external_url: LENS_PREVIEW_NODE + 'u/' + handle,
            attributes,
            animation_url: audioMedia.item,
            description,
        },
        appId: APP_ID,
    });
};

const createPostTransaction = async (
    contentURI: string,
    openActionModules?: OpenActionModuleInput[],
    referenceModule?: ReferenceModuleInput
): Promise<string | null> => {
    await ensureCorrectChain();

    const postResult = await createPostTypedData(
        contentURI,
        referenceModule,
        openActionModules
    );

    const typedData = postResult.typedData;
    console.log('createPostTransaction: Created post typed data', typedData);

    const signature = await signTypedData(
        typedData.domain,
        typedData.types,
        typedData.value
    );
    const request: BroadcastRequest = {
        id: postResult.id,
        signature,
    };
    const broadcastRes = await broadcastPostOnChain(request);

    if (isRelaySuccess(broadcastRes)) {
        console.log(
            'createPostTransaction: broadcast transaction success',
            broadcastRes.txHash
        );
        return broadcastRes.txHash;
    } else {
        console.error(
            'createPostTransaction: post with broadcast failed',
            broadcastRes.reason
        );
        throw new Error(broadcastRes.reason);
    }

    // const lensHub = await getLensHub();
    // const tx = await lensHub.post({
    //     profileId: typedData.value.profileId,
    //     contentURI: typedData.value.contentURI,
    //     collectModule: typedData.value.collectModule,
    //     collectModuleInitData: typedData.value.collectModuleInitData,
    //     referenceModule: typedData.value.referenceModule,
    //     referenceModuleInitData: typedData.value.referenceModuleInitData,
    // });
    // console.log('createPostTransaction: submitted transaction', tx);
    // return tx.hash;
};

const createPostOnChain = async (
    contentURI: string,
    referenceModule?: ReferenceModuleInput,
    openActionModules?: OpenActionModuleInput[]
): Promise<string | null> => {
    const res = await postOnChain(
        contentURI,
        referenceModule,
        openActionModules
    );

    if (res.isFailure()) {
        console.error('Error creating onchain post', res.error);
    } else {
        const relayResult = res.unwrap();
        if (isRelaySuccess(relayResult)) {
            console.log(
                'submitPost: created post with relay tx',
                relayResult.txHash
            );
            return relayResult.txHash;
        } else {
            console.error('Error creating post with relay', relayResult.reason);
            // TODO notify the user that the post tx relay failed
        }
    }

    return null;
};

export const createPostOnMomoka = async (
    contentURI: string
): Promise<string | undefined> => {
    const result = await postOnMomoka(contentURI);

    const resultValue = result.unwrap();

    if (!isCreateMomokaPublicationResult(resultValue)) {
        console.log(`createPostOnMomoka: Something went wrong`, resultValue);
        return undefined;
    }

    console.log(`createPostOnMomoka: Created post on Momoka`, resultValue);
    return resultValue.id;
};

export const submitPost = async (
    user: User,
    draftId: string,
    metadata: PublicationMetadata,
    openActionModules?: OpenActionModuleInput[],
    referenceModule?: ReferenceModuleInput,
    useLensManager: boolean = true
): Promise<string> => {
    const profileId = user.profileId;
    console.log(
        `submitPost: profileId = ${profileId}, metadata = ${JSON.stringify(
            metadata
        )}, referenceModule = ${JSON.stringify(
            referenceModule
        )}, openActionModules = ${JSON.stringify(openActionModules)}`
    );

    const authenticated = await isAuthenticated();
    if (!authenticated) {
        chrome.runtime.openOptionsPage();
        window?.close();
        throw new Error('Unable to submit post. User is not authenticated.');
    }

    const publicationMetadata = PublicationMetadataSchema.parse(metadata);
    console.log(
        'submitPost: Parsed and validated metadata',
        publicationMetadata
    );

    const metadataId: string = await uploadMetadata(publicationMetadata);
    const contentURI = `https://gateway.irys.xyz/${metadataId}`;
    console.log('submitPost: Uploaded metadata to Irys with URI', contentURI);

    // At this point we know the metadata is valid and available on IPFS, so show optimistic completion
    publicationState.set(PublicationState.SUBMITTED);

    let txHash: string | null = null;

    if (useLensManager && user.canUseRelay) {
        console.log('submitPost: Using Lens Manager to create post');
        if (referenceModule || openActionModules?.length) {
            console.log('submitPost: Creating post on chain');
            txHash = await createPostOnChain(
                contentURI,
                referenceModule,
                openActionModules
            );
        } else {
            console.log('submitPost: Creating post on Momoka');
            const publicationId = await createPostOnMomoka(contentURI);
            if (publicationId) {
                console.log(
                    'submitPost: Created post on Momoka',
                    publicationId
                );
                publicationState.set(PublicationState.SUCCESS);
                await deleteDraft(draftId);
                return publicationId;
            }
        }
    }

    console.log('submitPost: Creating post transaction manually');

    if (!txHash) {
        txHash = await createPostTransaction(
            contentURI,
            openActionModules,
            referenceModule
        );
    }

    if (!txHash) {
        throw new Error('Unable to create post transaction');
    }

    publicationState.set(PublicationState.SUCCESS);

    const res = await chrome.runtime.sendMessage({
        type: 'getPublicationId',
        post: { txHash, metadata },
    });
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
chrome.runtime.onConnect.addListener((port) => {
    console.log('chrome.runtime.onConnect: port', port);
    if (port.name !== 'getPublicationId') return;

    port.onMessage.addListener((msg) => {
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
            tldMatches: true,
        },
    });
    console.log('autolink: matches =', matches);

    if (matches.length === 0) {
        return [];
    }

    const urlMatches = matches.filter(
        (match): match is UrlMatch => match instanceof UrlMatch
    );
    return urlMatches.map((match) => {
        if (match.getUrlMatchType() === 'tld') {
            return 'https://' + match.getUrl();
        }
        return match.getUrl();
    });
};
