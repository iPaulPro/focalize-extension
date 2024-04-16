import nodes from '../stores/nodes.json';
import type {
    CommentFragment,
    PostFragment,
    QuoteFragment,
    PublicationMetadataFragment,
    HandleInfoFragment,
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
import {
    ALL_NODE_KEYS,
    KEY_NODE_ARTICLE,
    KEY_NODE_AUDIO,
    KEY_NODE_IMAGE,
    KEY_NODE_POST,
    KEY_NODE_VIDEO,
} from '../stores/preferences-store';

export type LensNode = {
    name: string;
    baseUrl: string;
    posts: string;
    profiles: string;
    hexIdentifier: boolean;
    notifications?: string;
    focus: string[];
    fullHandle: boolean;
    icon: string;
};

export const LENS_NODES: LensNode[] = [...nodes];

export const getNodeForPublicationMetadata = async (
    metadata: PublicationMetadata
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get(ALL_NODE_KEYS);
    switch (metadata.$schema) {
        case PublicationSchemaId.TEXT_ONLY_LATEST:
            return storage[KEY_NODE_POST];
        case PublicationSchemaId.IMAGE_LATEST:
            return storage[KEY_NODE_IMAGE];
        case PublicationSchemaId.AUDIO_LATEST:
            return storage[KEY_NODE_AUDIO];
        case PublicationSchemaId.VIDEO_LATEST:
            return storage[KEY_NODE_VIDEO];
    }
    return storage[KEY_NODE_POST];
};

const getNodeForAnyPublicationMetadata = async (
    metadata: PublicationMetadataFragment
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get(ALL_NODE_KEYS);
    switch (metadata.__typename) {
        case 'TextOnlyMetadataV3':
            return storage[KEY_NODE_POST];
        case 'ImageMetadataV3':
            return storage[KEY_NODE_IMAGE];
        case 'AudioMetadataV3':
            return storage[KEY_NODE_AUDIO];
        case 'VideoMetadataV3':
            return storage[KEY_NODE_VIDEO];
    }
    return storage[KEY_NODE_POST];
};

export const getNodeForPublication = async (
    publication: CommentFragment | PostFragment | QuoteFragment
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get(ALL_NODE_KEYS);
    if (isImagePublication(publication)) {
        return storage[KEY_NODE_IMAGE];
    } else if (isVideoPublication(publication)) {
        return storage[KEY_NODE_VIDEO];
    } else if (isAudioPublication(publication)) {
        return storage[KEY_NODE_AUDIO];
    } else if (isArticlePublication(publication)) {
        return storage[KEY_NODE_ARTICLE];
    }
    return storage[KEY_NODE_POST];
};

export const getNodeUrlForHandle = (
    node: LensNode,
    handle: HandleInfoFragment
) => {
    const formattedHandle = node.fullHandle
        ? formatHandleV2toV1(handle.fullHandle)
        : handle.localName;
    return (
        'https://' +
        node.baseUrl +
        node.profiles.replace('{$handle}', formattedHandle)
    );
};

export const getPublicationUrlFromNode = (node: LensNode, postId: string) => {
    let id = postId;
    if (!node.hexIdentifier) {
        const parts = postId.split('-');
        const profileId = parseInt(parts[0], 16);
        const publicationId = parseInt(parts[1], 16);
        id = profileId + '-' + publicationId;
    }

    return 'https://' + node.baseUrl + node.posts.replace('{$id}', id);
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
