import {PublicationMainFocus} from "../graph/lens-service";
import type {LensNode} from "./lens-nodes";

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getNodeForPublicationMainFocus = async (postType: PublicationMainFocus): Promise<LensNode> => {
    let node: LensNode;
    const storage = await chrome.storage.sync.get(['nodeImage','nodeVideo','nodeAudio','nodeArticle','nodePost'])
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
}

export const getNodeUrlForPublication = async (postType: PublicationMainFocus, postId: string) => {
    const node = await getNodeForPublicationMainFocus(postType);
    let id = postId;
    if (!node.hexIdentifier) {
        const parts = postId.split('-');
        const profileId = parseInt(parts[0], 16);
        const publicationId = parseInt(parts[1], 16);
        id = profileId + '-' + publicationId;
    }

    return node.baseUrl + node.posts.replace('{$id}', id);
}

export const isOnToolbar = async (): Promise<boolean> => {
    const settings = await chrome.action.getUserSettings();
    return settings.isOnToolbar;
}