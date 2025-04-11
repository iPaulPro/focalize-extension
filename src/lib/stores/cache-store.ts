import { chromeStorageLocal, chromeStorageSync } from './chrome-storage-store';
import { derived, type Readable, type Writable } from 'svelte/store';
import WalletConnection from '../types/WalletConnection';
import { Notification, PaginatedResultInfo } from '@lens-protocol/client';
import { getNotificationCountSinceLastOpened } from '@/lib/utils/utils';

/**
 * Cached data is saved to the `local` chrome storage area.
 * @param key The key used to store in the `local` chrome storage area.
 */
export const getCached = async <T>(
    key: string,
    defaultValue: T | undefined = undefined,
): Promise<T | undefined> => {
    const storage = await browser.storage.local.get(key);
    if (storage[key] !== undefined) {
        return storage[key] as T;
    }
    return defaultValue;
};

export const saveToCache = async (key: string, value: any): Promise<void> =>
    browser.storage.local.set({ [key]: value });

export const deleteFromCache = async (key: string): Promise<void> =>
    browser.storage.local.remove(key);

export const KEY_NOTIFICATION_ITEMS_CACHE = 'notificationItemsCache.v2';
export const KEY_NOTIFICATION_PAGE_INFO_CACHE = 'notificationPageInfoCache.v2';
export const KEY_NOTIFICATION_SCROLL_TOP_CACHE = 'notificationsScrollTop.v2';
export const KEY_NOTIFICATIONS_TIMESTAMP = 'notificationsTimestamp';

export const notificationsCache: Writable<Notification[]> = chromeStorageLocal(
    KEY_NOTIFICATION_ITEMS_CACHE,
);
export const notificationPageInfoCache: Writable<PaginatedResultInfo> = chromeStorageLocal(
    KEY_NOTIFICATION_PAGE_INFO_CACHE,
);
export const notificationsScrollTop: Writable<number> = chromeStorageLocal(
    KEY_NOTIFICATION_SCROLL_TOP_CACHE,
);
export const notificationsTimestamp: Writable<string> = chromeStorageSync(
    KEY_NOTIFICATIONS_TIMESTAMP,
);

export const unreadNotificationsCount: Readable<number> = derived(
    notificationsTimestamp,
    ($notificationsTimestamp, set) => {
        getNotificationCountSinceLastOpened($notificationsTimestamp).then((count: number) =>
            set(count),
        );
    },
);

export const clearNotificationCache = async () => {
    await browser.storage.local.remove(KEY_NOTIFICATION_SCROLL_TOP_CACHE);
    await browser.storage.local.remove(KEY_NOTIFICATION_PAGE_INFO_CACHE);
    await browser.storage.local.remove(KEY_NOTIFICATION_ITEMS_CACHE);
    await browser.storage.local.remove('notificationItemsCache');
    await browser.storage.sync.remove(KEY_NOTIFICATIONS_TIMESTAMP);
};

/**
 * @deprecated
 */
export const KEY_PENDING_PROXY_ACTIONS = 'pendingProxyActions';
/**
 * @deprecated
 */
export const KEY_MESSAGE_TIMESTAMPS = 'messageTimestamps';
/**
 * @deprecated
 */
export const KEY_SELECTED_MESSAGES_TAB = 'selectedMessagesTab';
/**
 * @deprecated
 */
export const KEY_WINDOW_TOPIC_MAP = 'windowTopicMap';
/**
 * @deprecated
 */
export const KEY_PROFILES = 'cachedProfiles.v2';
/**
 * @deprecated
 */
export const KEY_PROFILE_ID_BY_ADDRESS = 'profileIdsByAddressMap';

export const KEY_SELECTED_MAIN_TAB = 'selectedMainTab';
export const selectedMainTab: Writable<number> = chromeStorageLocal(KEY_SELECTED_MAIN_TAB, 0);

export const KEY_ENS_NAME_MAP = 'ensNameMap';
/**
 * Map of wallet address to ENS name
 */
export const ensNameMap: Writable<{ [id: string]: string }> = chromeStorageLocal(
    KEY_ENS_NAME_MAP,
    {},
);

export const KEY_WALLET_CONNECTION = 'walletConnection';
export const walletConnection: Writable<WalletConnection> =
    chromeStorageSync(KEY_WALLET_CONNECTION);

export const KEY_GROUPS_CACHE = 'cachedGroups';
/**
 * Map of group address to group name
 */
export const groupMap: Writable<{ [address: string]: string }> = chromeStorageLocal(
    KEY_GROUPS_CACHE,
    {},
);
