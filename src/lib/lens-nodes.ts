import nodes from './stores/nodes.json';
import {PublicationMainFocus} from "./graph/lens-service";

// {
//     "name": "Lenster",
//     "baseUrl": "https://lenster.xyz",
//     "posts": "/posts/{$id}",
//     "profiles": "/u/{$handle}",
//     "hexIdentifier": true,
//     "notifications": "/notifications",
//     "focus": [
//         "TEXT_ONLY", "IMAGE", "VIDEO", "AUDIO", "LINK"
//     ]
// }

export type LensNode = {
    name: string,
    baseUrl: string,
    posts: string,
    profiles: string,
    hexIdentifier: boolean,
    notifications: string | null,
    focus: string[],
};

export const LENS_NODES: LensNode[] = [
    ...nodes
];

export const getNodeForPublicationMainFocus = async (postType: PublicationMainFocus): Promise<LensNode> => {
    let node: LensNode;
    const storage = await chrome.storage.sync.get(['nodeImage', 'nodeVideo', 'nodeAudio', 'nodeArticle', 'nodePost'])
    switch (postType) {
        case PublicationMainFocus.Image:
            node = storage.nodeImage;
            break;
        case PublicationMainFocus.Video:
            node = storage.nodeVideo;
            break;
        case PublicationMainFocus.Audio:
            node = storage.nodeAudio;
            break;
        case PublicationMainFocus.Article:
            node = storage.nodeArticle;
            break;
        default:
            node = storage.nodePost;
    }
    return node;
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

export const getPublicationUrl = async (postType: PublicationMainFocus, postId: string) => {
    const node = await getNodeForPublicationMainFocus(postType);
    return getPublicationUrlFromNode(node, postId);
};
