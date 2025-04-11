import type { Account, Feed, Group, Post, ReferencedPost, Repost } from '@lens-protocol/client';
import {
    type AnyMedia,
    type MediaAudio,
    MediaAudioMimeType,
    type MediaImage,
    MediaImageMimeType,
    type MediaVideo,
    MediaVideoMimeType,
    type PostMetadata,
    PostMetadataSchemaId,
    ThreeDFormat,
    type URI,
} from '@lens-protocol/metadata';
import { getAvatarFromAddress, truncateAddress } from './utils';
import { getNodeUrlForUsername, LENS_NODES } from '../lens/lens-nodes';
import { GLOBAL_FEED_ADDRESS } from '@/lib/config';
import { GROVE_GATEWAY_URL } from '@/lib/grove-service';

export const GLOBAL_FEED: Feed = {
    __typename: 'Feed',
    address: GLOBAL_FEED_ADDRESS,
    createdAt: '2025-02-08T21:21:39+00:00',
    metadata: {
        __typename: 'FeedMetadata',
        id: 'global-feed',
        name: 'Global feed',
        description: 'Public feed that anyone can post to',
    },
    owner: '0x5FCD072a0BD58B6fa413031582E450FE724dba6D',
    operations: null,
    rules: {
        __typename: 'FeedRules',
        anyOf: [],
        required: [],
    },
};

export const hasMetadata = (
    post: Post | Repost | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    'metadata' in post && post.metadata !== undefined;

const isPostWithMetadata = (post: Post | ReferencedPost, metadataType: string): boolean =>
    post.metadata.__typename === metadataType;

export const isArticlePost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'ArticleMetadata');

export const isAudioPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'AudioMetadata');

export const isImagePost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'ImageMetadata');

export const isLinkPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'LinkMetadata');

export const isLiveStreamPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'LiveStreamMetadata');

export const isMintPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'MintMetadata');

export const isSpacePost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'SpaceMetadata');

export const isStoryPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'StoryMetadata');

export const isTextOnlyPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'TextOnlyMetadata');

export const isThreeDPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'ThreeDMetadata');

export const isTransactionPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'TransactionMetadata');

export const isVideoPost = (
    post: Post | ReferencedPost,
): post is (Post & { metadata: PostMetadata }) | (ReferencedPost & { metadata: PostMetadata }) =>
    isPostWithMetadata(post, 'VideoMetadata');

export const getMetadataContent = (post: Post | ReferencedPost): string | undefined => {
    if (post.metadata && 'content' in post.metadata) {
        return post.metadata.content;
    }

    return undefined;
};

export const getMediaImageMimeType = (mimeType: string): MediaImageMimeType => {
    switch (mimeType) {
        case 'image/bmp':
            return MediaImageMimeType.BMP;
        case 'image/gif':
            return MediaImageMimeType.GIF;
        case 'image/heic':
            return MediaImageMimeType.HEIC;
        case 'image/jpeg':
            return MediaImageMimeType.JPEG;
        case 'image/png':
            return MediaImageMimeType.PNG;
        case 'image/svg+xml':
            return MediaImageMimeType.SVG_XML;
        case 'image/webp':
            return MediaImageMimeType.WEBP;
        case 'image/x-ms-bmp':
            return MediaImageMimeType.X_MS_BMP;
        default:
            throw new Error(`Unsupported image mime type: ${mimeType}`);
    }
};

export const getMediaVideoMimeType = (mimeType: string): MediaVideoMimeType => {
    switch (mimeType) {
        case 'model/gltf+json':
            return MediaVideoMimeType.GLTF;
        case 'model/gltf-binary':
            return MediaVideoMimeType.GLTF_BINARY;
        case 'video/m4v':
            return MediaVideoMimeType.M4V;
        case 'video/mov':
            return MediaVideoMimeType.MOV;
        case 'video/mp4':
            return MediaVideoMimeType.MP4;
        case 'video/mpeg':
            return MediaVideoMimeType.MPEG;
        case 'video/ogg':
            return MediaVideoMimeType.OGG;
        case 'video/ogv':
            return MediaVideoMimeType.OGV;
        case 'video/quicktime':
            return MediaVideoMimeType.QUICKTIME;
        case 'video/webm':
            return MediaVideoMimeType.WEBM;
        default:
            throw new Error(`Unsupported video mime type: ${mimeType}`);
    }
};

export const getMediaAudioMimeType = (mimeType: string): MediaAudioMimeType => {
    switch (mimeType) {
        case 'audio/mpeg':
            return MediaAudioMimeType.MP3;
        case 'audio/ogg':
            return MediaAudioMimeType.OGG_AUDIO;
        case 'audio/wav':
            return MediaAudioMimeType.WAV;
        default:
            throw new Error(`Unsupported audio mime type: ${mimeType}`);
    }
};

export const getThreeDMimeTypeString = (format: ThreeDFormat): string => {
    switch (format) {
        case ThreeDFormat.GLTF:
            return 'model/gltf';
        default:
            throw new Error(`Unsupported 3D format: ${format}`);
    }
};

export const isAudioMedia = (media: AnyMedia): media is MediaAudio =>
    Object.values(MediaAudioMimeType).includes(media.type as MediaAudioMimeType);

export const isVideoMedia = (media: AnyMedia): media is MediaVideo =>
    Object.values(MediaVideoMimeType).includes(media.type as MediaVideoMimeType);

export const isImageMedia = (media: AnyMedia): media is MediaImage =>
    Object.values(MediaImageMimeType).includes(media.type as MediaImageMimeType);

export const getCoverFromMetadata = (metadata: PostMetadata): URI | undefined => {
    switch (metadata.$schema) {
        case PostMetadataSchemaId.AUDIO_LATEST:
            return metadata.lens.audio.cover;
        case PostMetadataSchemaId.VIDEO_LATEST:
            return metadata.lens.video.cover;
    }
    return undefined;
};

/**
 * Format a username from domain/local to local.domain
 * @param username The username to format
 * @deprecated Use formatUsernameV2toLocalName instead
 */
export const formatUsernameV2toV1 = (username: string): string => {
    const usernameParts = username.split('/');
    if (usernameParts.length === 2) {
        return `${usernameParts[1]}.${usernameParts[0]}`;
    }
    return username;
};

/**
 * Format a username from @domain/local to @local
 * @param username The username to format
 */
export const formatUsernameV2toLocalName = (username: string): string => {
    const usernameParts = username.split('/');
    if (usernameParts.length === 2) {
        return `@${usernameParts[1]}`;
    }
    return username;
};

export const getAccountDisplayName = (account: Account): string => {
    if (account.metadata?.name) {
        return account.metadata.name;
    } else if (account.username) {
        return account.username.localName;
    }
    return truncateAddress(account.owner);
};

export const getAccountAvatar = (account: Account, thumbnail: boolean = true): string => {
    let accountPicture = account.metadata?.picture;
    if (accountPicture && thumbnail) {
        accountPicture = accountPicture.replace('/lens/', '/lens/tr:h-80/');
    }

    return (accountPicture && parseUri(accountPicture)) ?? getAvatarFromAddress(account.owner);
};

export const getGroupIcon = (group: Group, thumbnail: boolean = true): string | null => {
    let icon = group.metadata?.icon;
    if (icon && thumbnail) {
        icon = icon.replace('/lens/', '/lens/tr:h-80/');
    }

    return icon && parseUri(icon);
};

export const getAvatarForLensUsername = (username: string, size: number = 128): string => {
    const formattedUsername = formatUsernameV2toV1(username);
    return `https://cdn.stamp.fyi/avatar/${formattedUsername}?s=${size}`;
};

export const getAccountUrl = (account: Account): string | null => {
    if (account.username) {
        return getNodeUrlForUsername(LENS_NODES[0], account.username);
    }
    return null;
};

export const isCommentPost = (post: Post | ReferencedPost): boolean => {
    return post && 'commentOn' in post && Boolean(post.commentOn?.id);
};

export const getCidFromIpfsUrl = (ipfsUrl: string): string => {
    if (!ipfsUrl.startsWith('ipfs://')) throw new Error('IPFS urls must begin with ipfs://');
    return ipfsUrl.replace('ipfs://', '').replace(/^\/+|\/+$/g, '');
};

export const getKeyFromLensUrl = (lensUrl: string): string => {
    if (!lensUrl.startsWith('lens://')) throw new Error('Grove urls must begin with lens://');
    return lensUrl.replace('lens://', '').replace(/^\/+|\/+$/g, '');
};

export const ipfsUrlToGatewayUrl = (
    ipfsUrl: string | undefined,
    gatewayDomain: string = 'https://ipfs.io/ipfs/',
): string | undefined => {
    if (!ipfsUrl || ipfsUrl.length === 0 || !ipfsUrl.startsWith('ipfs://')) return ipfsUrl;
    const cid = getCidFromIpfsUrl(ipfsUrl);
    const gatewayUrl = gatewayDomain + cid;
    const path = ipfsUrl.split(cid)[1];
    return path ? `${gatewayUrl}${path}` : gatewayUrl;
};

export const arweaveUrlToGatewayUrl = (
    arUrl: string | undefined,
    gatewayDomain: string = 'https://arweave.net/',
): string | undefined => {
    if (!arUrl || arUrl.length === 0 || !arUrl.startsWith('ar://')) return arUrl;
    const txId = arUrl.replace('ar://', '').replace(/^\/+|\/+$/g, '');
    return `${gatewayDomain}${txId}`;
};

export const lensUrlToGatewayUrl = (
    lensUrl: string | undefined,
    gatewayDomain: string = GROVE_GATEWAY_URL,
): string | undefined => {
    if (!lensUrl || lensUrl.length === 0 || !lensUrl.startsWith('lens://')) return lensUrl;
    const key = getKeyFromLensUrl(lensUrl);
    return `${gatewayDomain}${key}`;
};

/**
 * Parse a URI and convert it to a gateway URL if it is an IPFS, Arweave, or Lens URL
 * @param uri The URI to parse
 */
export const parseUri = (uri: string): string | undefined => {
    if (!uri) return undefined;

    try {
        const { protocol } = new URL(uri);
        switch (protocol) {
            case 'ipfs:':
                return ipfsUrlToGatewayUrl(uri);
            case 'ar:':
                return arweaveUrlToGatewayUrl(uri);
            case 'lens:':
                return lensUrlToGatewayUrl(uri);
            default:
                return uri;
        }
    } catch {
        return undefined;
    }
};
