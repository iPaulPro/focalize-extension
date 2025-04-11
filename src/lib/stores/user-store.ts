import { chromeStorageLocal } from './chrome-storage-store';
import type { Writable } from 'svelte/store';
import type { User } from '../types/User';

export const KEY_CURRENT_USER = 'currentUserV2';

/**
 * @deprecated
 */
export const KEY_KNOWN_SENDERS = 'knownSenders';

/**
 * The authenticated Lens user
 */
export const currentUser: Writable<User | null> = chromeStorageLocal(KEY_CURRENT_USER);

export const clearUser = () => {
    currentUser.set(null);
};

export const getUser = async (): Promise<User | undefined> => {
    const storage = await browser.storage.local.get(KEY_CURRENT_USER);
    return storage[KEY_CURRENT_USER];
};

export const saveUser = async (user: User) =>
    browser.storage.local.set({ [KEY_CURRENT_USER]: user });
