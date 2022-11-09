import {writable} from 'svelte/store';
import type {Writable} from 'svelte/store';
import type {Web3File} from "web3.storage/src/lib/interface";
import type {Profile, PublicationMetadataMediaInput} from "../graph/lens-service";

/**
 * The post title, used as the NFT name
 */
export const title: Writable<string> = writable();

/**
 * The post content
 */
export const content: Writable<string> = writable();

/**
 * The NFT description
 */
export const description: Writable<string> = writable();

/**
 * The main post attachment. Can be an image, audio, or video file.
 */
export const attachment: any | Writable<Web3File> = writable();

/**
 * The main post gif attachment.
 */
export const gifAttachment: any | Writable<PublicationMetadataMediaInput> = writable();

/**
 * The cover image for audio and video attachments
 */
export const cover: any | Writable<Web3File> = writable();

/**
 * The author attribute in audio NFT metadata
 */
export const author: any | Writable<string> = writable();

/**
 * The authenticated Lens Profile
 */
export const profile: Writable<Profile> = writable();

const storedDarkMode = localStorage.darkMode;

export const darkMode: Writable<boolean> = writable(storedDarkMode === 'true');

darkMode.subscribe((value) => localStorage.darkMode = String(value));

/**
 * Clear all post-related stores
 */
export const clearPostState = () => {
    title.set(null);
    content.set(null);
    description.set(null);
    attachment.set(null);
    cover.set(null);
}