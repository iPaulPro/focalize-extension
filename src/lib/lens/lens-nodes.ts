import nodes from '../stores/nodes.json';
import type { Post, ReferencedPost, Repost, Username } from '@lens-protocol/client';
import {
    formatUsernameV2toV1,
    isArticlePost,
    isAudioPost,
    isImagePost,
    isVideoPost,
} from '../utils/lens-utils';
import { type PostMetadata, PostMetadataSchemaId } from '@lens-protocol/metadata';
import {
    ALL_NODE_KEYS,
    KEY_NODE_ARTICLE,
    KEY_NODE_AUDIO,
    KEY_NODE_IMAGE,
    KEY_NODE_POST,
    KEY_NODE_VIDEO,
} from '../stores/preferences-store';
import { LensNode } from '../types/LensNode';

export const LENS_NODES: LensNode[] = [...nodes];

export const getNodeForPostMetadata = async (metadata: PostMetadata): Promise<LensNode> => {
    const storage = await browser.storage.sync.get(ALL_NODE_KEYS);
    switch (metadata.$schema) {
        case PostMetadataSchemaId.TEXT_ONLY_LATEST:
            return storage[KEY_NODE_POST];
        case PostMetadataSchemaId.IMAGE_LATEST:
            return storage[KEY_NODE_IMAGE];
        case PostMetadataSchemaId.AUDIO_LATEST:
            return storage[KEY_NODE_AUDIO];
        case PostMetadataSchemaId.VIDEO_LATEST:
            return storage[KEY_NODE_VIDEO];
        case PostMetadataSchemaId.ARTICLE_LATEST:
            return storage[KEY_NODE_ARTICLE];
    }
    return storage[KEY_NODE_POST];
};

export const getNodeForPost = async (post: Post | ReferencedPost): Promise<LensNode> => {
    const storage = await browser.storage.sync.get(ALL_NODE_KEYS);
    if (isImagePost(post)) {
        return storage[KEY_NODE_IMAGE];
    } else if (isVideoPost(post)) {
        return storage[KEY_NODE_VIDEO];
    } else if (isAudioPost(post)) {
        return storage[KEY_NODE_AUDIO];
    } else if (isArticlePost(post)) {
        return storage[KEY_NODE_ARTICLE];
    }
    return storage[KEY_NODE_POST];
};

export const getNodeUrlForUsername = (node: LensNode, username: Username) => {
    const formatted = node.fullUsername ? formatUsernameV2toV1(username.value) : username.localName;
    return 'https://' + node.baseUrl + node.accounts.replace('{$username}', formatted);
};

export const getPostUrlFromNode = (node: LensNode, post: Post | ReferencedPost | Repost) => {
    if (node.posts.includes('{$username}') && post.author.username) {
        return (
            'https://' +
            node.baseUrl +
            node.posts
                .replace('{$username}', post.author.username.localName)
                .replace('{$id}', node.useSlug ? post.slug : post.id)
        );
    }
    return (
        'https://' + node.baseUrl + node.posts.replace('{$id}', node.useSlug ? post.slug : post.id)
    );
};

export const getUrlForPostMetadata = async (
    metadata: PostMetadata,
    post: Post | ReferencedPost | Repost,
) => {
    const node = await getNodeForPostMetadata(metadata);
    return getPostUrlFromNode(node, post);
};
