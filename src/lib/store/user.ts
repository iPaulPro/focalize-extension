import {writable} from "svelte/store";
import type {Writable} from 'svelte/store';
import type {Profile} from "../../graph/lens-service";

/**
 * The connected public address
 */
export const address: any | Writable<string> = writable();

address.subscribe((address: string) => {
    chrome.storage.local.set({address}).catch(console.error);
});

/**
 * The authenticated Lens Profile
 */
export const profile: any | Writable<Profile | undefined> = writable();

profile.subscribe((p: Profile) => {
    chrome.storage.local.set({profileId: p?.id}).catch(console.error);
});

export const clearUser = () => {
    profile.set(undefined);
};