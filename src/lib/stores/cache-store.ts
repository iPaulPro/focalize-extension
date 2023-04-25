import {chromeStorageLocal} from "./chrome-storage-store";
import type {Writable} from "svelte/store";

import type {Notification, PaginatedResultInfo} from "../graph/lens-service";

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
