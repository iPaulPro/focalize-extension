import {writable} from 'svelte/store';
import type {Writable} from 'svelte/store';
import type {Web3File} from "web3.storage/src/lib/interface";

export const title: Writable<string> = writable();

export const content: Writable<string> = writable();

export const attachment: any | Web3File = writable();