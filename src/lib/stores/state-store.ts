import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import type { CollectSettings } from '../types/CollectSettings';
import type { PostDraft } from '../types/PostDraft';
import type {
    ContentWarning,
    MediaAudio,
    MediaImage,
    MediaVideo,
    ThreeDAsset,
} from '@lens-protocol/metadata';
import { GroveFile } from '@/lib/grove-service';
import { Account } from '@lens-protocol/client';

export interface Recipient {
    address: string;
    split: number;
    identity?: {
        lens?: Account;
        ens?: string;
    };
}

export enum PostState {
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
export const title: Writable<string | undefined | null> = writable();

/**
 * The post content
 */
export const content: Writable<string | undefined | null> = writable();

/**
 * The NFT description
 */
export const description: Writable<string | undefined | null> = writable();

/**
 * A file ready for uploading and transformation into an attachment
 */
export const file: Writable<GroveFile | undefined | null> = writable();

// /**
//  * The post attachments. An array of image, audio, and/or video files.
//  */
// export const attachments: Writable<AnyMedia[] | undefined> = writable();

/**
 * An image attachment
 */
export const image: Writable<MediaImage | undefined | null> = writable();

/**
 * An audio attachment
 */
export const audio: Writable<MediaAudio | undefined | null> = writable();

/**
 * A video attachment
 */
export const video: Writable<MediaVideo | undefined | null> = writable();

/**
 * A 3D asset attachment
 */
export const threeDAsset: Writable<ThreeDAsset | undefined | null> = writable();

/**
 * The cover image for audio and video attachments
 */
export const cover: Writable<string | undefined | null> = writable();

/**
 * The author attribute in audio NFT metadata
 */
export const author: Writable<string | undefined | null> = writable();

/**
 * The album attribute in audio NFT metadata
 */
export const album: Writable<string | undefined | null> = writable();

/**
 * The date attribute in audio NFT metadata in ISO 8601 format
 */
export const date: Writable<string | undefined | null> = writable();

/**
 * The collect module settings when set to one of the fee types
 */
export const collectSettings: Writable<CollectSettings> = writable({});

/**
 * Used for optimistic display while waiting to be indexed
 */
export const postState: Writable<PostState | undefined> = writable();

/**
 * The content tags
 */
export const tags: Writable<string[] | undefined> = writable();

export const contentWarning: Writable<ContentWarning | undefined> = writable();

/**
 * The link the post is sharing
 */
export const sharingLink: Writable<string | undefined | null> = writable();

/**
 * Clears all post-related stores
 */
export const clearPostState = () => {
    draftId.set(undefined);
    title.set(undefined);
    content.set(undefined);
    description.set(undefined);
    image.set(undefined);
    audio.set(undefined);
    video.set(undefined);
    threeDAsset.set(undefined);
    cover.set(undefined);
    author.set(undefined);
    album.set(undefined);
    date.set(undefined);
    collectSettings.set({});
    tags.set(undefined);
    sharingLink.set(undefined);
    contentWarning.set(undefined);
};

export const loadFromDraft = (postDraft: PostDraft) => {
    if (!postDraft) return;
    draftId.set(postDraft.id);
    title.set(postDraft.title);
    content.set(postDraft.content);
    description.set(postDraft.description);
    image.set(postDraft.image);
    audio.set(postDraft.audio);
    video.set(postDraft.video);
    threeDAsset.set(postDraft.threeDAsset);
    cover.set(postDraft.cover);
    author.set(postDraft.author);
    album.set(postDraft.album);
    date.set(postDraft.date);
    collectSettings.set(postDraft.collectFee ?? {});
    tags.set(postDraft.tags);
    sharingLink.set(postDraft.sharingLink);
    contentWarning.set(postDraft.contentWarning);
};
