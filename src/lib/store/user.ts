import {writable} from "svelte/store";
import type {Writable} from 'svelte/store';
import type {Profile} from "../../graph/lens-service";

/**
 * The connected public address
 */
export const address: any | Writable<string> = writable();

/**
 * The authenticated Lens Profile
 */
export const profile: any | Writable<Profile> = writable();

export const clearUser = () => {
    profile.set(null);
}