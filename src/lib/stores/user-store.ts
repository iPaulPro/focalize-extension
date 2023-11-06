import { chromeStorageLocal } from './chrome-storage-store';
import type { Writable } from 'svelte/store';
import type { User } from '../user/user';

export const KEY_CURRENT_USER = 'currentUserV2';
export const KEY_KNOWN_SENDERS = 'knownSenders';

/**
 * The authenticated Lens user
 */
export const currentUser: Writable<User | null> =
    chromeStorageLocal(KEY_CURRENT_USER);

export const clearUser = () => {
    currentUser.set(null);
};

export const getUser = async (): Promise<User | undefined> => {
    const storage = await chrome.storage.local.get(KEY_CURRENT_USER);
    return storage[KEY_CURRENT_USER];
};

/**
 * A list of known XMTP senders
 */
export const knownSenders: Writable<string[]> = chromeStorageLocal(
    KEY_KNOWN_SENDERS,
    []
);
