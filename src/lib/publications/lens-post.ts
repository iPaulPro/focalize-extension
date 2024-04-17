import { APP_ID, LENS_HUB_CONTRACT, TIP_ACTION_MODULE } from '../../config';

import {
    ensureCorrectChain,
    getSigner,
    signTypedData,
} from '../evm/ethers-service';
import { deleteDraft } from '../stores/draft-store';

import type { User } from '../user/user';
import { PublicationState, publicationState } from '../stores/state-store';
import {
    broadcastPostOnChain,
    createPostTypedData,
    getNextPublicationId,
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
    link,
    threeD,
    type TextOnlyMetadata,
    type ImageMetadata,
    type VideoMetadata,
    type AudioMetadata,
    type LinkMetadata,
    type PublicationMetadata,
    type AnyMedia,
    type MarketplaceMetadataAttribute,
    type MediaImage,
    type MediaVideo,
    type MediaAudio,
    type ThreeDMetadata,
    type ThreeDAsset,
    MarketplaceMetadataAttributeDisplayType,
    MetadataAttributeType,
} from '@lens-protocol/metadata';

import {
    type BroadcastRequest,
    type OpenActionModuleInput,
    type ReferenceModuleInput,
    isRelaySuccess,
    isCreateMomokaPublicationResult,
    encodeData,
} from '@lens-protocol/client';
import { getIrys } from '../irys-service';
import { formatHandleV2toV1 } from '../utils/lens-utils';
import type { MetadataAttribute } from '@lens-protocol/metadata';
import { DateTime } from 'luxon';
import { LensHub__factory } from '../../contracts/types';
import { currentUser } from '../stores/user-store';

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

export const buildExternalUrl = async () => {
    const nextId = await getNextPublicationId();
    return `https://share.lens.xyz/p/${nextId}`;
};

export const generateTextPostMetadata = async (
    handle: string | undefined,
    content: string,
    title?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en'
): Promise<TextOnlyMetadata> =>
    textOnly({
        content,
        tags,
        // contentWarning,
        locale,
        marketplace: {
            name: title ?? defaultTitle(handle),
            description,
            external_url: await buildExternalUrl(),
        },
        appId: APP_ID,
    });

export const generateImagePostMetadata = async (
    handle: string | undefined,
    mediaImage: MediaImage,
    title?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attachments?: AnyMedia[]
): Promise<ImageMetadata> =>
    image({
        attachments,
        image: mediaImage,
        content,
        tags,
        title,
        // contentWarning,
        locale,
        marketplace: {
            name: title || defaultTitle(handle),
            description,
            external_url: await buildExternalUrl(),
            image: mediaImage.item,
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

export const generateVideoPostMetadata = async (
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
): Promise<VideoMetadata> =>
    video({
        video: mediaVideo,
        attachments,
        content,
        title,
        marketplace: {
            name: title || defaultTitle(handle),
            attributes,
            external_url: await buildExternalUrl(),
            animation_url: mediaVideo.item,
            image,
            description,
        },
        tags,
        // contentWarning,
        locale,
        appId: APP_ID,
    });

export const createAudioMarketplaceAttributes = (
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

export const generateAudioPostMetadata = async (
    handle: string | undefined,
    audioMedia: MediaAudio,
    title?: string,
    image?: string,
    content?: string,
    artist?: string,
    album?: string,
    date?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attachments?: AnyMedia[]
): Promise<AudioMetadata> => {
    let attrs: MetadataAttribute[] | undefined = audioMedia.attributes;
    if (album) {
        if (!attrs) attrs = [];
        attrs.push({
            type: MetadataAttributeType.STRING,
            value: album,
            key: 'album',
        });
    }
    if (date) {
        if (!attrs) attrs = [];
        const value = DateTime.fromISO(date).toUTC().toISO();
        if (value) {
            attrs.push({
                type: MetadataAttributeType.DATE,
                value,
                key: 'date',
            });
        }
    }
    return audio({
        audio: {
            ...audioMedia,
            cover: image,
            artist,
            attributes: attrs,
        },
        attachments,
        content,
        tags,
        title,
        // contentWarning,
        locale,
        marketplace: {
            name: artist
                ? `${artist} - ${title ?? 'untitled'}`
                : title ?? defaultTitle(handle),
            external_url: await buildExternalUrl(),
            attributes: createAudioMarketplaceAttributes(artist),
            animation_url: audioMedia.item,
            image,
            description,
        },
        appId: APP_ID,
    });
};

export const generateLinkPostMetadata = async (
    handle: string | undefined,
    url: string,
    title?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = []
): Promise<LinkMetadata> =>
    link({
        sharingLink: url,
        content,
        tags,
        // contentWarning,
        marketplace: {
            name: title || defaultTitle(handle),
            attributes,
            external_url: url,
            description,
        },
        locale,
        appId: APP_ID,
    });

export const generateThreeDPostMetadata = async (
    handle: string | undefined,
    asset: ThreeDAsset,
    title?: string,
    image?: string,
    content?: string,
    tags?: string[],
    description: string | undefined = content,
    locale: string = 'en',
    attributes: MarketplaceMetadataAttribute[] = []
): Promise<ThreeDMetadata> =>
    threeD({
        assets: [asset],
        content,
        tags,
        // contentWarning,
        marketplace: {
            animation_url: asset.uri,
            name: title || defaultTitle(handle),
            attributes,
            image,
            external_url: await buildExternalUrl(),
            description,
        },
        locale,
        appId: APP_ID,
    });

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
    try {
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
        }
    } catch (e) {
        console.log('createPostTransaction: unknown error while broadcasting');
    }

    const signer = await getSigner();
    const lensHub = LensHub__factory.connect(LENS_HUB_CONTRACT, signer);
    console.log('createPostTransaction: lensHub', await lensHub.getAddress());

    try {
        const tx = await lensHub.post({
            profileId: typedData.value.profileId,
            contentURI: typedData.value.contentURI,
            actionModules: typedData.value.actionModules,
            actionModulesInitDatas: typedData.value.actionModulesInitDatas,
            referenceModule: typedData.value.referenceModule,
            referenceModuleInitData: typedData.value.referenceModuleInitData,
        });
        console.log('createPostTransaction: submitted transaction', tx);
        return tx.hash;
    } catch (e) {
        console.log('createPostTransaction: error submitting transaction', e);
    }

    return null;
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

            if (!openActionModules) {
                openActionModules = [];
            }

            // Automatically enable tipping if posting on-chain
            const data = encodeData(
                [{ name: 'tipReceiver', type: 'address' }],
                [user.address]
            );
            openActionModules.push({
                unknownOpenAction: {
                    address: TIP_ACTION_MODULE,
                    data,
                },
            });

            try {
                txHash = await createPostOnChain(
                    contentURI,
                    referenceModule,
                    openActionModules
                );
            } catch (e) {
                console.log(
                    'submitPost: unable to use relay to create onchain post',
                    e
                );
            }
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
