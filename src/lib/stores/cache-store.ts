import { chromeStorageLocal, chromeStorageSync } from './chrome-storage-store';
import { derived, type Readable, type Writable } from 'svelte/store';
import type { CompactMessage } from '../xmtp-service';
import type {
    NotificationFragment,
    PaginatedResult,
    ProfileFragment,
} from '@lens-protocol/client';
import WalletConnection from '../evm/WalletConnection';

/**
 * Cached data is saved to the `local` chrome storage area.
 * @param key The key used to store in the `local` chrome storage area.
 */
export const getCached = async <T>(key: string): Promise<T | undefined> => {
    const storage = await chrome.storage.local.get(key);
    if (storage[key] !== undefined) {
        return storage[key] as T;
    }
    return undefined;
};

export const saveToCache = async (key: string, value: any): Promise<void> =>
    chrome.storage.local.set({ [key]: value });

export const deleteFromCache = async (key: string): Promise<void> =>
    chrome.storage.local.remove(key);

export const KEY_NOTIFICATION_ITEMS_CACHE = 'notificationItemsCache.v2';
export const KEY_NOTIFICATION_PAGE_INFO_CACHE = 'notificationPageInfoCache.v2';
export const KEY_NOTIFICATION_SCROLL_TOP_CACHE = 'notificationsScrollTop.v2';
export const KEY_NOTIFICATION_LATEST_ID = 'notificationsLastId';

export const notificationItemsCache: Writable<NotificationFragment[]> =
    chromeStorageLocal(KEY_NOTIFICATION_ITEMS_CACHE);
export const notificationPageInfoCache: Writable<
    PaginatedResult<NotificationFragment>
> = chromeStorageLocal(KEY_NOTIFICATION_PAGE_INFO_CACHE);
export const notificationsScrollTop: Writable<number> = chromeStorageLocal(
    KEY_NOTIFICATION_SCROLL_TOP_CACHE
);

export const clearNotificationCache = async () => {
    await chrome.storage.local.remove(KEY_NOTIFICATION_SCROLL_TOP_CACHE);
    await chrome.storage.local.remove(KEY_NOTIFICATION_PAGE_INFO_CACHE);
    await chrome.storage.local.remove(KEY_NOTIFICATION_ITEMS_CACHE);
    await chrome.storage.local.remove(KEY_NOTIFICATION_LATEST_ID);
};

/**
 * A pending proxy action map from proxy action id to profile handle
 */
export interface PendingProxyActionMap {
    [id: string]: string;
}

export const KEY_PENDING_PROXY_ACTIONS = 'pendingProxyActions';

/**
 * Pending proxy actions to check for
 */
export const pendingProxyActions: Writable<PendingProxyActionMap> =
    chromeStorageLocal(KEY_PENDING_PROXY_ACTIONS);

/**
 * Map of conversation topic to last read message timestamp in milliseconds
 */
export interface MessageTimestampMap {
    [id: string]: number;
}

export const KEY_MESSAGE_TIMESTAMPS = 'messageTimestamps';
export const messageTimestamps: Writable<MessageTimestampMap> =
    chromeStorageLocal(KEY_MESSAGE_TIMESTAMPS, {});

export const KEY_SELECTED_MAIN_TAB = 'selectedMainTab';
export const selectedMainTab: Writable<number> = chromeStorageLocal(
    KEY_SELECTED_MAIN_TAB,
    0
);

export const KEY_SELECTED_MESSAGES_TAB = 'selectedMessagesTab';
export const selectedMessagesTab: Writable<number | undefined> =
    chromeStorageLocal(KEY_SELECTED_MESSAGES_TAB, 0);

/**
 * Map of conversation topic to window id
 */
export interface WindowTopicMap {
    [id: string]: number;
}

export const KEY_WINDOW_TOPIC_MAP = 'windowTopicMap';
export const windowTopicMap: Writable<WindowTopicMap> = chromeStorageLocal(
    KEY_WINDOW_TOPIC_MAP,
    {}
);

/**
 * Map of Lens profile id to profile
 */
export interface ProfileMap {
    [id: string]: ProfileFragment;
}

export const KEY_PROFILES = 'cachedProfiles.v2';
export const profiles: Writable<ProfileMap> = chromeStorageLocal(KEY_PROFILES);

/**
 * Map of conversation topic to the latest decoded message
 */
export interface LatestMessageMap {
    [id: string]: CompactMessage;
}

export const KEY_LATEST_MESSAGE_MAP = 'latestMessageMap';
export const latestMessageMap: Writable<LatestMessageMap> = chromeStorageLocal(
    KEY_LATEST_MESSAGE_MAP,
    {}
);

export const getLatestMessage = (
    topic: string
): Readable<CompactMessage | undefined> =>
    derived(
        latestMessageMap,
        ($latestMessageMap) => $latestMessageMap?.[topic]
    );

export const KEY_ENS_NAME_MAP = 'ensNameMap';
/**
 * Map of wallet address to ENS name
 */
export const ensNameMap: Writable<{ [id: string]: string }> =
    chromeStorageLocal(KEY_ENS_NAME_MAP, {});

export interface ProfileIdsByAddressMap {
    [address: string]: string[];
}
export const KEY_PROFILE_ID_BY_ADDRESS = 'profileIdsByAddressMap';
/**
 * Map of wallet address to profile ID
 */
export const profileIdsByAddressMap: Writable<ProfileIdsByAddressMap> =
    chromeStorageLocal(KEY_PROFILE_ID_BY_ADDRESS, {});

export const KEY_WALLET_CONNECTION = 'walletConnection';
export const walletConnection: Writable<WalletConnection> = chromeStorageSync(
    KEY_WALLET_CONNECTION
);
