import nodes from '../stores/nodes.json';
import { PublicationMainFocus } from '../graph/lens-service';
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

export const getNodeForPublicationMainFocus = async (
    postType: PublicationMainFocus
): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get([
        'nodeImage',
        'nodeVideo',
        'nodeAudio',
        'nodeArticle',
        'nodePost',
    ]);
    switch (postType) {
        case PublicationMainFocus.Image:
            return storage.nodeImage;
        case PublicationMainFocus.Video:
            return storage.nodeVideo;
        case PublicationMainFocus.Audio:
            return storage.nodeAudio;
        case PublicationMainFocus.Article:
            return storage.nodeArticle;
        default:
            return storage.nodePost;
    }
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
    postType: PublicationMainFocus,
    postId: string
) => {
    const node = await getNodeForPublicationMainFocus(postType);
    return getPublicationUrlFromNode(node, postId);
};
