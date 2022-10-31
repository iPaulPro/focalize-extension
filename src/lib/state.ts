import {writable} from 'svelte/store';
import type {Writable} from 'svelte/store';
import type {Web3File} from "web3.storage/src/lib/interface";
import type {Profile} from "../graph/lens-service";

export const title: Writable<string> = writable();

export const content: Writable<string> = writable();

export const description: Writable<string> = writable();

export const attachment: any | Web3File = writable();

export const profile: Writable<Profile> = writable();

export const clearPostState = () => {
    title.set(null);
    content.set(null);
    description.set(null);
    attachment.set(null);
}