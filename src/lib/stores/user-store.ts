import {chromeStorageLocal} from "./chrome-storage-store";
import type {Writable} from 'svelte/store';
import type {User} from "../user";

export const KEY_CURRENT_USER = 'currentUser';
/**
 * The authenticated Lens user
 */
export const currentUser: Writable<User | null> = chromeStorageLocal(KEY_CURRENT_USER);

export const clearUser = () => {
    currentUser.set(null);
};

export const getUser = async (): Promise<User | undefined> => {
    const storage = await chrome.storage.local.get(KEY_CURRENT_USER);
    return storage.currentUser;
};