import nodes from '../stores/nodes.json';
import type {
    CommentFragment,
    PostFragment,
    QuoteFragment,
} from '@lens-protocol/client';
import {
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
    return node.baseUrl + node.profiles.replace('{$handle}', handle);
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

export const getPublicationUrl = async (
    metadata: PublicationMetadata,
    postId: string
) => {
    const node = await getNodeForPublicationMetadata(metadata);
    return getPublicationUrlFromNode(node, postId);
};
