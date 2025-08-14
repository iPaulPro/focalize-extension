import { deleteDraft } from '../stores/draft-store';
import type { User } from '../types/User';
import { PostState, postState } from '../stores/state-store';
import { createPost, getPost, isAuthenticated } from '../lens-service';
import type { MetadataAttribute } from '@lens-protocol/metadata';
import {
    type AnyMedia,
    audio,
    type AudioMetadata,
    ContentWarning,
    image,
    type ImageMetadata,
    link,
    type LinkMetadata,
    type MediaAudio,
    type MediaImage,
    type MediaVideo,
    MetadataAttributeType,
    type NftMetadataAttribute,
    NftMetadataAttributeDisplayType,
    type PostMetadata,
    PostMetadataSchema,
    textOnly,
    type TextOnlyMetadata,
    threeD,
    type ThreeDAsset,
    type ThreeDMetadata,
    video,
    type VideoMetadata,
} from '@lens-protocol/metadata';
import { DateTime } from 'luxon';
import { getUrlForPostMetadata } from '@/lib/lens/lens-nodes';
import { getUser } from '../stores/user-store';
import { getBlobUrl } from '@/lib/lens/lens-notifications';
import { sleep } from '@/lib/utils/utils';
import { EvmAddress, type Post, type ReferencedPost } from '@lens-protocol/client';
import { type SimpleCollect } from '@/lib/types/SimpleCollect';
import { uploadJson } from '@/lib/grove-service';

const defaultTitle = (username?: string): string => `Post by @${username ?? 'anonymous'}`;

export const buildExternalUrl = async (username?: string) => {
    if (!username) return undefined;
    return `https://share.lens.xyz/${username}`;
};

export const generateTextPostMetadata = async (
    username: string | undefined,
    content: string,
    title?: string,
    tags?: string[],
    contentWarning?: ContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
): Promise<TextOnlyMetadata> =>
    textOnly({
        content,
        tags,
        contentWarning,
        locale,
        nft: {
            name: title ?? defaultTitle(username),
            description,
            external_url: await buildExternalUrl(),
        },
    });

export const generateImagePostMetadata = async (
    username: string | undefined,
    mediaImage: MediaImage,
    title?: string,
    content?: string,
    tags?: string[],
    contentWarning?: ContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    attachments?: AnyMedia[],
): Promise<ImageMetadata> =>
    image({
        attachments,
        image: mediaImage,
        content,
        tags,
        title,
        contentWarning,
        locale,
        nft: {
            name: title || defaultTitle(username),
            description,
            external_url: await buildExternalUrl(),
            image: mediaImage.item,
        },
    });

const createVideoAttributes = (): NftMetadataAttribute[] => {
    return [
        {
            display_type: NftMetadataAttributeDisplayType.STRING,
            trait_type: 'type',
            value: 'video',
        },
    ] as NftMetadataAttribute[];
};

export const generateVideoPostMetadata = async (
    username: string | undefined,
    mediaVideo: MediaVideo,
    title?: string,
    image?: string | null,
    content?: string,
    tags?: string[],
    contentWarning?: ContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    attributes: NftMetadataAttribute[] = createVideoAttributes(),
    attachments?: AnyMedia[],
): Promise<VideoMetadata> =>
    video({
        video: mediaVideo,
        attachments,
        content,
        title,
        nft: {
            name: title || defaultTitle(username),
            attributes,
            external_url: await buildExternalUrl(),
            animation_url: mediaVideo.item,
            ...(image !== null ? { image } : {}),
            description,
        },
        tags,
        contentWarning,
        locale,
    });

export const createAudioMarketplaceAttributes = (author?: string): NftMetadataAttribute[] => {
    if (!author) return [];
    return [
        {
            display_type: NftMetadataAttributeDisplayType.STRING,
            trait_type: 'author',
            value: author,
        },
        {
            display_type: NftMetadataAttributeDisplayType.STRING,
            trait_type: 'type',
            value: 'audio',
        },
    ] as NftMetadataAttribute[];
};

export const generateAudioPostMetadata = async (
    username: string | undefined,
    audioMedia: MediaAudio,
    title?: string,
    image?: string | null,
    content?: string,
    artist?: string,
    album?: string,
    date?: string,
    tags?: string[],
    contentWarning?: ContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    attachments?: AnyMedia[],
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
            ...(image !== null ? { cover: image } : {}),
            artist,
            attributes: attrs,
        },
        attachments,
        content,
        tags,
        title,
        contentWarning,
        locale,
        nft: {
            name: artist ? `${artist} - ${title ?? 'untitled'}` : (title ?? defaultTitle(username)),
            external_url: await buildExternalUrl(),
            attributes: createAudioMarketplaceAttributes(artist),
            animation_url: audioMedia.item,
            image,
            description,
        },
    });
};

export const generateLinkPostMetadata = async (
    username: string | undefined,
    url: string,
    title?: string,
    content?: string,
    tags?: string[],
    contentWarning?: ContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    attributes: NftMetadataAttribute[] = [],
): Promise<LinkMetadata> =>
    link({
        sharingLink: url,
        content,
        tags,
        contentWarning,
        nft: {
            name: title || defaultTitle(username),
            attributes,
            external_url: url,
            description,
        },
        locale,
    });

export const generateThreeDPostMetadata = async (
    username: string | undefined,
    asset: ThreeDAsset,
    title?: string,
    image?: string | null,
    content?: string,
    tags?: string[],
    contentWarning?: ContentWarning,
    description: string | undefined = content,
    locale: string = 'en',
    attributes: NftMetadataAttribute[] = [],
): Promise<ThreeDMetadata> =>
    threeD({
        assets: [asset],
        content,
        tags,
        contentWarning,
        nft: {
            animation_url: asset.uri,
            name: title || defaultTitle(username),
            attributes,
            ...(image !== null ? { image } : {}),
            external_url: await buildExternalUrl(),
            description,
        },
        locale,
    });

export const submitPost = async (
    user: User,
    draftId: string,
    metadata: PostMetadata,
    feed: EvmAddress,
    simpleCollect: SimpleCollect | null,
    followerOnly?: boolean,
): Promise<string> => {
    console.log(
        `submitPost: account = ${user.address}, metadata = ${JSON.stringify(metadata)}, followerOnly = ${followerOnly}, simpleCollect = ${JSON.stringify(simpleCollect)}`,
    );

    const authenticated = await isAuthenticated();
    if (!authenticated) {
        await browser.runtime.openOptionsPage();
        window?.close();
        throw new Error('Unable to submit post. User is not authenticated.');
    }

    const postMetadata = PostMetadataSchema.parse(metadata);
    console.log('submitPost: Parsed and validated metadata', postMetadata);

    console.log('submitPost: Uploading metadata file...');
    const contentURI: string = await uploadJson(postMetadata);
    console.log('submitPost: Uploaded metadata to Irys with URI', contentURI);

    // At this point we know the metadata is valid and available on arweave, so show optimistic completion
    postState.set(PostState.SUBMITTED);

    let txHash: string | null = null;

    try {
        txHash = await createPost(contentURI, feed, simpleCollect, followerOnly);
    } catch (e) {
        console.log('submitPost: unable to use relay to create onchain post', e);
    }

    if (!txHash) {
        postState.set(PostState.ERROR);
        throw new Error('Unable to create post transaction');
    }

    postState.set(PostState.SUCCESS);

    // Wait for the post to be indexed
    await sleep(2000);

    const post = await getPost({ txHash });
    if (!post) {
        postState.set(PostState.ERROR);
        throw new Error('Error indexing post');
    }

    console.log('submitPost: post has been indexed', post.id);

    deleteDraft(draftId).catch(console.warn);

    await notifyOfPublishedPost(metadata, post as Post);

    return post.id;
};

const notifyOfPublishedPost = async (metadata: PostMetadata, post: Post | ReferencedPost) => {
    const currentUser: User | undefined = await getUser();
    if (!currentUser) return;

    const url = await getUrlForPostMetadata(metadata, post);
    const imageUrl =
        currentUser.avatarUrl ?? `https://cdn.stamp.fyi/avatar/${currentUser.address}?s=96`;
    const iconUrl = await getBlobUrl(imageUrl);

    browser.notifications.create(url, {
        type: 'basic',
        requireInteraction: true,
        title: `Post published!`,
        message: `@${currentUser.username ?? currentUser.account}`,
        contextMessage: 'Focalize',
        iconUrl: iconUrl ?? '/icon/128.png',
    });
};
