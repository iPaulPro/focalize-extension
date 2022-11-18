import {writable} from "svelte/store";
import type {Writable} from 'svelte/store';
import type {Profile} from "../../graph/lens-service";

/**
 * The connected public address
 */
export const address: Writable<string> = writable();

/**
 * The authenticated Lens Profile
 */
export const profile: Writable<Profile> = writable();