import {writable} from 'svelte/store';
import type {Writable} from 'svelte/store';
import type {Web3File} from "web3.storage/src/lib/interface";
import type {Erc20, PublicationMetadataMediaInput} from "../../graph/lens-service";
import type {PostDraft} from "./draft-store";

export interface CollectFee {
    price?: number;
    token?: Erc20;
    limit?: number;
    referralFee?: number;
    followerOnly?: boolean;
    timed?: boolean;
}

/**
 * The post unique id, used for drafts
 */
export const draftId: any | Writable<string> = writable();

/**
 * The post title, used as the NFT name
 */
export const title: any | Writable<string> = writable();

/**
 * The post content
 */
export const content: any | Writable<string> = writable();

/**
 * The NFT description
 */
export const description: any | Writable<string> = writable();

/**
 * A file ready for uploading and transformation into an attachment
 */
export const file: any | Writable<Web3File> = writable();

/**
 * The main post attachment. Can represent an image, audio, or video file.
 */
export const attachment: any | Writable<PublicationMetadataMediaInput> = writable();

/**
 * The cover image for audio and video attachments
 */
export const cover: any | Writable<Web3File> = writable();

/**
 * The author attribute in audio NFT metadata
 */
export const author: any | Writable<string> = writable();

/**
 * The collect module settings when set to one of the fee types
 */
export const collectFee: any | Writable<CollectFee> = writable();

/**
 * Clears all post-related stores
 */
export const clearPostState = () => {
    draftId.set(null);
    title.set(null);
    content.set(null);
    description.set(null);
    attachment.set(null);
    cover.set(null);
    author.set(null);
    collectFee.set(null)
}

export const loadFromDraft = (postDraft: PostDraft) => {
    if (!postDraft) return;
    draftId.set(postDraft.id);
    title.set(postDraft.title);
    content.set(postDraft.content);
    description.set(postDraft.description);
    attachment.set(postDraft.attachments?.[0]);
    author.set(postDraft.author);
    collectFee.set(postDraft.collectFee);
}