import type {Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import type {Erc20, PublicationMetadataMediaInput} from "../graph/lens-service";
import type {PostDraft} from "./draft-store";
import type {Web3File} from "../ipfs-service";

export interface CollectSettings {
    isCollectible?: boolean;
    price?: number;
    token?: Erc20;
    limit?: number;
    referralFee?: number;
    followerOnly?: boolean;
    timed?: boolean;
}

export enum PublicationState {
    /**
     * Transaction submitted
     */
    SUBMITTED = 'SUBMITTED',

    /**
     * Transaction successful
     */
    SUCCESS = 'SUCCESS',

    /**
     * Index pending
     */
    PENDING = 'PENDING',

    /**
     * There was an error during indexing
     */
    ERROR = 'ERROR',
}

/**
 * The post unique id, used for drafts
 */
export const draftId: Writable<string | undefined> = writable();

/**
 * The post title, used as the NFT name
 */
export const title: Writable<string | undefined> = writable();

/**
 * The post content
 */
export const content: Writable<string | undefined> = writable();

/**
 * The NFT description
 */
export const description: Writable<string | undefined> = writable();

/**
 * A file ready for uploading and transformation into an attachment
 */
export const file: Writable<Web3File | undefined> = writable();

/**
 * The main post attachment. Can represent an image, audio, or video file.
 */
export const attachments: Writable<PublicationMetadataMediaInput[] | undefined> = writable();

/**
 * The cover image for audio and video attachments
 */
export const cover: Writable<Web3File | undefined> = writable();

/**
 * The author attribute in audio NFT metadata
 */
export const author: Writable<string | undefined> = writable();

/**
 * The collect module settings when set to one of the fee types
 */
export const collectSettings: Writable<CollectSettings> = writable({});

/**
 * Used for optimistic display while waiting to be indexed
 */
export const publicationState: Writable<PublicationState | undefined> = writable();

/**
 * Clears all post-related stores
 */
export const clearPostState = () => {
    draftId.set(undefined);
    title.set(undefined);
    content.set(undefined);
    description.set(undefined);
    attachments.set(undefined);
    cover.set(undefined);
    author.set(undefined);
    collectSettings.set({})
}

export const loadFromDraft = (postDraft: PostDraft) => {
    if (!postDraft) return;
    draftId.set(postDraft.id);
    title.set(postDraft.title);
    content.set(postDraft.content);
    description.set(postDraft.description);
    attachments.set(postDraft.attachments);
    author.set(postDraft.author);
    collectSettings.set(postDraft.collectFee ?? {});
}