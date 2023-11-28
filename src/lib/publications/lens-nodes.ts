import nodes from '../stores/nodes.json';
import type {
    CommentFragment,
    PostFragment,
    QuoteFragment,
    PublicationMetadataFragment,
} from '@lens-protocol/client';
import {
    formatHandleV2toV1,
    isArticlePublication,
    isAudioPublication,
    isImagePublication,
    isVideoPublication,
} from '../utils/lens-utils';
import type { PublicationMetadata } from '@lens-protocol/metadata';
import { PublicationSchemaId } from '@lens-protocol/metadata';

export type LensNode = {
    name: string;
    baseUrl: string;
    posts: string;
    profiles: string;
    hexIdentifier: boolean;
    notifications: string | null;
    focus: string[];
};

export const LENS_NODES: LensNode[] = [...nodes];

export const getNodeForPublicationMetadata = async (
    metadata: PublicationMetadata
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get([
        'nodeImage',
        'nodeVideo',
        'nodeAudio',
        'nodeArticle',
        'nodePost',
    ]);
    switch (metadata.$schema) {
        case PublicationSchemaId.TEXT_ONLY_LATEST:
            return storage.nodePost;
        case PublicationSchemaId.IMAGE_LATEST:
            return storage.nodeImage;
        case PublicationSchemaId.AUDIO_LATEST:
            return storage.nodeAudio;
        case PublicationSchemaId.VIDEO_LATEST:
            return storage.nodeVideo;
    }
    return storage.nodePost;
};

const getNodeForAnyPublicationMetadata = async (
    metadata: PublicationMetadataFragment
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get([
        'nodeImage',
        'nodeVideo',
        'nodeAudio',
        'nodeArticle',
        'nodePost',
    ]);
    switch (metadata.__typename) {
        case 'TextOnlyMetadataV3':
            return storage.nodePost;
        case 'ImageMetadataV3':
            return storage.nodeImage;
        case 'AudioMetadataV3':
            return storage.nodeAudio;
        case 'VideoMetadataV3':
            return storage.nodeVideo;
    }
    return storage.nodePost;
};

export const getNodeForPublication = async (
    publication: CommentFragment | PostFragment | QuoteFragment
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get([
        'nodeImage',
        'nodeVideo',
        'nodeAudio',
        'nodeArticle',
        'nodePost',
    ]);
    if (isImagePublication(publication)) {
        return storage.nodeImage;
    } else if (isVideoPublication(publication)) {
        return storage.nodeVideo;
    } else if (isAudioPublication(publication)) {
        return storage.nodeAudio;
    } else if (isArticlePublication(publication)) {
        return storage.nodeArticle;
    }
    return storage.nodePost;
};

export const getProfileUrl = (node: LensNode, handle: string) => {
    const formattedHandle = formatHandleV2toV1(handle);
    return node.baseUrl + node.profiles.replace('{$handle}', formattedHandle);
};

export const getPublicationUrlFromNode = (node: LensNode, postId: string) => {
    let id = postId;
    if (!node.hexIdentifier) {
        const parts = postId.split('-');
        const profileId = parseInt(parts[0], 16);
        const publicationId = parseInt(parts[1], 16);
        id = profileId + '-' + publicationId;
    }

    return node.baseUrl + node.posts.replace('{$id}', id);
};

export const getUrlForPublicationMetadata = async (
    metadata: PublicationMetadata,
    postId: string
) => {
    const node = await getNodeForPublicationMetadata(metadata);
    return getPublicationUrlFromNode(node, postId);
};

export const getUrlForAnyPublicationMetadata = async (
    metadata: PublicationMetadataFragment,
    postId: string
) => {
    const node = await getNodeForAnyPublicationMetadata(metadata);
    return getPublicationUrlFromNode(node, postId);
};
