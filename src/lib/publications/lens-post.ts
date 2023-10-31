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
    MediaImageMimeType,
    MediaVideoMimeType,
    MediaAudioMimeType,
    MarketplaceMetadataAttributeDisplayType,
} from '@lens-protocol/metadata';

import {
    type BroadcastRequest,
    type OpenActionModuleInput,
    type ReferenceModuleInput,
    isRelaySuccess,
} from '@lens-protocol/client';
import { getIrys } from '../irys-service';
import { DEFAULT_REFERENCE_MODULE } from './lens-modules';

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
            name: `Post by @${handle || 'anonymous'}`,
            attributes,
        },
        locale,
        appId: APP_ID,
    });

export const generateImagePostMetadata = (
    handle: string | undefined,
    attachments: AnyMedia[],
    title?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    item: string = attachments[0].item,
    type: MediaImageMimeType = attachments[0].type as MediaImageMimeType
): ImageMetadata =>
    image({
        attachments,
        image: { item, type },
        content,
        tags,
        // contentWarning,
        locale,
        marketplace: {
            name: title || `Post by @${handle || 'anonymous'}`,
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
    attachments: AnyMedia[],
    title?: string,
    image?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = createVideoAttributes(),
    animationUrl: string = attachments[0].item,
    videoMimeType: MediaVideoMimeType = attachments[0]
        .type as MediaVideoMimeType
): VideoMetadata =>
    video({
        video: {
            cover: image,
            item: animationUrl,
            type: videoMimeType,
        },
        attachments,
        content,
        marketplace: {
            name: title || `Post by @${handle || 'anonymous'}`,
            attributes,
            external_url: LENS_PREVIEW_NODE + 'u/' + handle,
            animation_url: animationUrl,
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
    attachments: AnyMedia[],
    title?: string,
    image?: string,
    content?: string,
    artist?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = createAudioAttributes(artist),
    animationUrl: string = attachments[0].item
): AudioMetadata => {
    return audio({
        audio: {
            item: attachments[0].item,
            type: attachments[0].type as MediaAudioMimeType,
            cover: image,
            artist,
        },
        attachments,
        content,
        tags,
        // contentWarning,
        locale,
        marketplace: {
            name: artist ? `${artist} - ${title}` : title,
            external_url: LENS_PREVIEW_NODE + 'u/' + handle,
            attributes,
            animation_url: animationUrl,
            description,
        },
        appId: APP_ID,
    });
};

const createPostTransaction = async (
    contentURI: string,
    openActionModules?: OpenActionModuleInput[],
    referenceModule: ReferenceModuleInput = DEFAULT_REFERENCE_MODULE
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

export const submitPost = async (
    user: User,
    draftId: string,
    metadata: PublicationMetadata,
    openActionModules?: OpenActionModuleInput[],
    referenceModule: ReferenceModuleInput = DEFAULT_REFERENCE_MODULE,
    useLensManager: boolean = true
): Promise<string> => {
    const profileId = user.profileId;
    console.log(
        `submitPost: profileId = ${profileId}, metadata = ${JSON.stringify(
            metadata
        )}, referenceModule = ${JSON.stringify(
            referenceModule
        )}, collectModule = ${JSON.stringify(openActionModules)}`
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
    console.log('submitPost: Uploaded metadata to IPFS with URI', contentURI);

    // At this point we know the metadata is valid and available on IPFS, so show optimistic completion
    publicationState.set(PublicationState.SUBMITTED);

    let txHash: string | null = null;

    if (useLensManager && user.canUseRelay) {
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
                txHash = relayResult.txHash;
                console.log('submitPost: created post with relay', txHash);
            } else {
                console.error(
                    'Error creating post with relay',
                    relayResult.reason
                );
                // TODO notify the user that the post tx relay failed
            }
        }
    }

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
