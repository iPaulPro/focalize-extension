import {writable} from "svelte/store";
import type {Writable} from 'svelte/store';
import type {User} from "../user";

/**
 * The connected public address
 */
export const address: any | Writable<string> = writable();

address.subscribe((address: string) => {
    chrome.storage.local.set({address}).catch(console.error);
});

/**
 * The authenticated Lens user
 */
export const currentUser: any | Writable<User> = writable();

currentUser.subscribe((user: User) => {
    if (!user) return;
    chrome.storage.local.set({profileId: user.profileId}).catch(console.error);
});

export const clearUser = () => {
    currentUser.set(null);
}