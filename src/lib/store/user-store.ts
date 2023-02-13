import {chromeStorageLocal} from "./chrome-storage-store";
import type {Writable} from 'svelte/store';
import type {User} from "../user";

/**
 * The authenticated Lens user
 */
export const currentUser: Writable<User | null> = chromeStorageLocal('currentUser');

export const clearUser = () => {
    currentUser.set(null);
}