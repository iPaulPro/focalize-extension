import {chromeStorageLocal} from "./chrome-storage-store";
import type {Writable} from "svelte/store";

import type {Notification, PaginatedResultInfo, Profile} from '../graph/lens-service';

export const KEY_NOTIFICATION_ITEMS_CACHE = 'notificationItemsCache';
export const KEY_NOTIFICATION_PAGE_INFO_CACHE = 'notificationPageInfoCache';
export const KEY_NOTIFICATION_SCROLL_TOP_CACHE = 'notificationsScrollTop';

export const notificationItemsCache: Writable<Notification[]> = chromeStorageLocal(KEY_NOTIFICATION_ITEMS_CACHE);
export const notificationPageInfoCache: Writable<PaginatedResultInfo> = chromeStorageLocal(KEY_NOTIFICATION_PAGE_INFO_CACHE);
export const notificationsScrollTop: Writable<number> = chromeStorageLocal(KEY_NOTIFICATION_SCROLL_TOP_CACHE);


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
export const pendingProxyActions: Writable<PendingProxyActionMap> = chromeStorageLocal(KEY_PENDING_PROXY_ACTIONS);


/**
 * Map of conversation topic to last read message timestamp
 */
export interface MessageTimestampMap {
    [id: string]: number;
}

export const KEY_MESSAGE_TIMESTAMPS = 'messageTimestamps';
export const messageTimestamps: Writable<MessageTimestampMap> = chromeStorageLocal(KEY_MESSAGE_TIMESTAMPS, {});

export const KEY_SELECTED_MAIN_TAB = 'selectedMainTab';
export const selectedMainTab: Writable<number> = chromeStorageLocal(KEY_SELECTED_MAIN_TAB, 0);

export const KEY_SELECTED_MESSAGES_TAB = 'selectedMessagesTab';
export const selectedMessagesTab: Writable<number | undefined> = chromeStorageLocal(KEY_SELECTED_MESSAGES_TAB, 0);


/**
 * Map of conversation topic to window id
 */
export interface WindowTopicMap {
    [id: string]: string;
}

export const KEY_WINDOW_TOPIC_MAP = 'windowTopicMap';
export const windowTopicMap: Writable<WindowTopicMap> = chromeStorageLocal(KEY_WINDOW_TOPIC_MAP, {});


export interface ProfileMap {
    [id: string]: Profile;
}

export const KEY_PROFILES = 'cachedProfiles';
export const profiles: Writable<Map<string, Profile>> = chromeStorageLocal(KEY_PROFILES);