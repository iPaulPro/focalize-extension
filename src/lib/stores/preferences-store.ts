import {chromeStorageSync} from "./chrome-storage-store";
import {derived, type Readable, type Writable} from 'svelte/store';
import type {LensNode} from "../lens-nodes";

import nodes from './/nodes.json';
import {getNotificationCountSinceLastOpened} from '../utils';

/**
 * Preferences are saved to the `sync` chrome storage area.
 * @param key The key used to store in the `sync` chrome storage area.
 */
export const getPreference = async <T>(key: string): Promise<T | undefined> => {
    const storage = await chrome.storage.sync.get(key);
    if (storage[key]) {
        return storage[key] as T;
    }
    return undefined;
};

export const savePreference = async (key: string, value: any): Promise<void> => chrome.storage.sync.set({[key]: value});

const defaultNode = nodes[0];

export type RefreshInterval = {
    value: number,
    label: string
}

export const KEY_COMPACT_MODE = 'compactMode';
export const KEY_DARK_MODE = 'darkMode';
export const KEY_DISPATCHER_DIALOG_SHOWN = 'dispatcherDialogShown';
export const KEY_USE_DISPATCHER = 'useDispatcher';
export const KEY_USE_RELAY = 'useRelay';
export const KEY_PIN_PROMPT_SHOWN = 'pinPromptShown';
export const KEY_RELEASE_DISMISSED = 'releaseDismissed';
export const KEY_NODE_POST = 'nodePost';
export const KEY_NODE_IMAGE = 'nodeImage';
export const KEY_NODE_VIDEO = 'nodeVideo';
export const KEY_NODE_AUDIO = 'nodeAudio';
export const KEY_NODE_ARTICLE = 'nodeArticle';
export const KEY_NODE_NOTIFICATIONS = 'nodeNotifications';
export const KEY_NODE_SEARCH = 'nodeSearch';
export const KEY_NOTIFICATIONS_REFRESH_ENABLED = 'notificationsEnabled';
export const KEY_NOTIFICATIONS_REFRESH_INTERVAL = 'notificationsRefreshInterval';
export const KEY_NOTIFICATIONS_TIMESTAMP = 'notificationsTimestamp';
export const KEY_NOTIFICATIONS_GROUPED = 'notificationsGrouped';
export const KEY_NOTIFICATIONS_FILTERED = 'notificationsFiltered';
export const KEY_NOTIFICATIONS_FOR_FOLLOWS = 'notificationsForFollows';
export const KEY_NOTIFICATIONS_FOR_MIRRORS = 'notificationsForMirrors';
export const KEY_NOTIFICATIONS_FOR_COLLECTS = 'notificationsForCollects';
export const KEY_NOTIFICATIONS_FOR_COMMENTS = 'notificationsForComments';
export const KEY_NOTIFICATIONS_FOR_MENTIONS = 'notificationsForMentions';
export const KEY_NOTIFICATIONS_FOR_REACTIONS = 'notificationsForReactions';
export const KEY_MESSAGES_REFRESH_ENABLED = 'messagesRefreshEnabled';
export const KEY_MESSAGES_REFRESH_INTERVAL = 'messagesRefreshInterval';
export const KEY_MESSAGES_UNREAD_TOPICS = 'messagesUnreadTopics';
export const KEY_USE_POPUP_COMPOSER = 'usePopupComposer';
export const KEY_RICH_TEXT = 'richTextComposer';

export const compactMode: Writable<boolean> = chromeStorageSync(KEY_COMPACT_MODE, true);
export const darkMode: Writable<boolean | undefined> = chromeStorageSync(KEY_DARK_MODE);
export const usePopupComposer: Writable<boolean> = chromeStorageSync(KEY_USE_POPUP_COMPOSER, true);
export const dispatcherDialogShown: Writable<boolean> = chromeStorageSync(KEY_DISPATCHER_DIALOG_SHOWN, false);
export const useDispatcher: Writable<boolean> = chromeStorageSync(KEY_USE_DISPATCHER, true);
export const useRelay: Writable<boolean> = chromeStorageSync(KEY_USE_RELAY, true);
export const pinPromptShown: Writable<boolean> = chromeStorageSync(KEY_PIN_PROMPT_SHOWN, false);
export const releaseDismissed: Writable<string> = chromeStorageSync(KEY_RELEASE_DISMISSED);
export const nodePost: Writable<LensNode> = chromeStorageSync(KEY_NODE_POST, defaultNode);
export const nodeImage: Writable<LensNode> = chromeStorageSync(KEY_NODE_IMAGE, defaultNode);
export const nodeVideo: Writable<LensNode> = chromeStorageSync(KEY_NODE_VIDEO, defaultNode);
export const nodeAudio: Writable<LensNode> = chromeStorageSync(KEY_NODE_AUDIO, defaultNode);
export const nodeArticle: Writable<LensNode> = chromeStorageSync(KEY_NODE_ARTICLE, defaultNode);
export const nodeNotifications: Writable<LensNode> = chromeStorageSync(KEY_NODE_NOTIFICATIONS, defaultNode);
export const nodeSearch: Writable<LensNode> = chromeStorageSync(KEY_NODE_SEARCH, defaultNode);
export const notificationsEnabled: Writable<boolean | undefined> = chromeStorageSync(KEY_NOTIFICATIONS_REFRESH_ENABLED, true);
export const notificationsRefreshInterval: Writable<RefreshInterval> = chromeStorageSync(KEY_NOTIFICATIONS_REFRESH_INTERVAL, {value: 15, label: '15 min'});
export const notificationsTimestamp: Writable<string> = chromeStorageSync(KEY_NOTIFICATIONS_TIMESTAMP);
export const notificationsGrouped: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_GROUPED, false);
export const notificationsFiltered: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FILTERED, false);
export const notificationsForFollows: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FOR_FOLLOWS, true);
export const notificationsForMirrors: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FOR_MIRRORS, true);
export const notificationsForCollects: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FOR_COLLECTS, true);
export const notificationsForComments: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FOR_COMMENTS, true);
export const notificationsForMentions: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FOR_MENTIONS, true);
export const notificationsForReactions: Writable<boolean> = chromeStorageSync(KEY_NOTIFICATIONS_FOR_REACTIONS, true);
export const messagesRefreshEnabled: Writable<boolean | undefined> = chromeStorageSync(KEY_MESSAGES_REFRESH_ENABLED, true);
export const messagesRefreshInterval: Writable<RefreshInterval> = chromeStorageSync(KEY_MESSAGES_REFRESH_INTERVAL, {value: 1, label: '1 min'});
export const messagesUnreadTopics: Writable<string[]> = chromeStorageSync(KEY_MESSAGES_UNREAD_TOPICS, []);
export const richTextComposer: Writable<boolean> = chromeStorageSync(KEY_RICH_TEXT, true);

export const messagesUnreadCount: Readable<number> = derived(
    messagesUnreadTopics,
    ($messagesUnreadTopics, set) => {
        set($messagesUnreadTopics?.length || 0);
    }
);

export const unreadNotificationsCount: Readable<number> = derived(
    notificationsTimestamp,
    ($notificationsTimestamp, set) => {
        getNotificationCountSinceLastOpened($notificationsTimestamp).then(count => set(count));
    }
);