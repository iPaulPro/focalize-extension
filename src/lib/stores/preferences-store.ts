import { chromeStorageSync } from './chrome-storage-store';
import { type Writable } from 'svelte/store';
import type { LensNode } from '../types/LensNode';

import nodes from './nodes.json';
import type { RefreshInterval } from '../types/RefreshInterval';

export const KEY_COMPACT_MODE = 'compactMode';
export const KEY_DARK_MODE = 'darkMode';
export const KEY_DISPATCHER_DIALOG_SHOWN = 'dispatcherDialogShown';
export const KEY_AUTO_SIGN_METADATA = 'autoSignMetadata';
export const KEY_PIN_PROMPT_SHOWN = 'pinPromptShown';
export const KEY_RELEASE_DISMISSED = 'releaseDismissed';
export const KEY_NODE_POST = 'nodePost.v2';
export const KEY_NODE_IMAGE = 'nodeImage.v2';
export const KEY_NODE_VIDEO = 'nodeVideo.v2';
export const KEY_NODE_AUDIO = 'nodeAudio.v2';
export const KEY_NODE_ARTICLE = 'nodeArticle.v2';
export const KEY_NODE_GROUP = 'nodeGroup';
export const KEY_NODE_NOTIFICATIONS = 'nodeNotifications';
export const KEY_NODE_SEARCH = 'nodeSearch';
export const KEY_NOTIFICATIONS_REFRESH_ENABLED = 'notificationsEnabled';
export const KEY_NOTIFICATIONS_REFRESH_INTERVAL = 'notificationsRefreshInterval';
export const KEY_NOTIFICATIONS_GROUPED = 'notificationsGrouped';
export const KEY_NOTIFICATIONS_FILTERED = 'notificationsFiltered';
export const KEY_NOTIFICATIONS_FOR_FOLLOWS = 'notificationsForFollows';
export const KEY_NOTIFICATIONS_FOR_MIRRORS = 'notificationsForMirrors';
export const KEY_NOTIFICATIONS_FOR_POST_ACTIONS = 'notificationsForCollects';
export const KEY_NOTIFICATIONS_FOR_COMMENTS = 'notificationsForComments';
export const KEY_NOTIFICATIONS_FOR_MENTIONS = 'notificationsForMentions';
export const KEY_NOTIFICATIONS_FOR_REACTIONS = 'notificationsForReactions';
export const KEY_NOTIFICATIONS_FOR_QUOTES = 'notificationsForQuotes';
export const KEY_NOTIFICATIONS_FOR_GROUPS = 'notificationsForGroups';
export const KEY_NOTIFICATIONS_FOR_ACCOUNT_ACTIONS = 'notificationsForTips';
export const KEY_USE_POPUP_COMPOSER = 'usePopupComposer';
export const KEY_RICH_TEXT = 'richTextComposer';

/**
 * @deprecated no longer used
 */
export const KEY_USE_PROFILE_MANAGER = 'useDispatcher';

/**
 * @deprecated no longer used
 */
export const KEY_USE_RELAY = 'useRelay';

/**
 * @deprecated no longer used
 */
export const KEY_MESSAGES_REFRESH_ENABLED = 'messagesRefreshEnabled';
/**
 * @deprecated no longer used
 */
export const KEY_MESSAGES_REFRESH_INTERVAL = 'messagesRefreshInterval';
/**
 * @deprecated no longer used
 */
export const KEY_MESSAGES_UNREAD_TOPICS = 'messagesUnreadTopics';
/**
 * @deprecated no longer used
 */
export const KEY_MESSAGES_HIDE_EMPTY = 'messagesHideEmptyThreads';
/**
 * @deprecated no longer used
 */
export const KEY_MESSAGES_PLAY_SOUNDS = 'messagesPlaySounds';

export const ALL_NODE_KEYS = [
    KEY_NODE_IMAGE,
    KEY_NODE_VIDEO,
    KEY_NODE_AUDIO,
    KEY_NODE_ARTICLE,
    KEY_NODE_POST,
    KEY_NODE_GROUP,
];

/**
 * Preferences are saved to the `sync` chrome storage area.
 * @param key The key used to store in the `sync` chrome storage area.
 * @param fallback The fallback value if the key is not found.
 */
export const getPreference = async <T>(key: string, fallback?: T): Promise<T | undefined> => {
    const storage = await browser.storage.sync.get(key);
    if (storage[key] !== undefined) {
        return storage[key] as T;
    }
    return fallback;
};

export const savePreference = async (key: string, value: any): Promise<void> =>
    browser.storage.sync.set({ [key]: value });

export const deletePreference = async (key: string): Promise<void> =>
    browser.storage.sync.remove(key);

export const compactMode: Writable<boolean> = chromeStorageSync(KEY_COMPACT_MODE, true);

export const darkMode: Writable<boolean | undefined> = chromeStorageSync(KEY_DARK_MODE);

export const usePopupComposer: Writable<boolean> = chromeStorageSync(KEY_USE_POPUP_COMPOSER, true);

export const dispatcherDialogShown: Writable<boolean> = chromeStorageSync(
    KEY_DISPATCHER_DIALOG_SHOWN,
    false,
);

export const autoSignMetadata: Writable<boolean> = chromeStorageSync(KEY_AUTO_SIGN_METADATA, true);

export const pinPromptShown: Writable<boolean> = chromeStorageSync(KEY_PIN_PROMPT_SHOWN, false);

export const releaseDismissed: Writable<string> = chromeStorageSync(KEY_RELEASE_DISMISSED);

export const nodePost: Writable<LensNode> = chromeStorageSync(KEY_NODE_POST, nodes[0]);

export const nodeImage: Writable<LensNode> = chromeStorageSync(KEY_NODE_IMAGE, nodes[0]);

export const nodeVideo: Writable<LensNode> = chromeStorageSync(KEY_NODE_VIDEO, nodes[0]);

export const nodeAudio: Writable<LensNode> = chromeStorageSync(KEY_NODE_AUDIO, nodes[0]);

export const nodeArticle: Writable<LensNode> = chromeStorageSync(KEY_NODE_ARTICLE, nodes[0]);

export const nodeGroup: Writable<LensNode> = chromeStorageSync(KEY_NODE_GROUP, nodes[0]);

export const nodeNotifications: Writable<LensNode> = chromeStorageSync(
    KEY_NODE_NOTIFICATIONS,
    nodes[0],
);

export const nodeSearch: Writable<LensNode> = chromeStorageSync(KEY_NODE_SEARCH, nodes[0]);

export const notificationsEnabled: Writable<boolean | undefined> = chromeStorageSync(
    KEY_NOTIFICATIONS_REFRESH_ENABLED,
    true,
);

export const notificationsRefreshInterval: Writable<RefreshInterval> = chromeStorageSync(
    KEY_NOTIFICATIONS_REFRESH_INTERVAL,
    {
        value: 15,
        label: '15 min',
    },
);

export const notificationsGrouped: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_GROUPED,
    false,
);

export const notificationsFiltered: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FILTERED,
    true,
);

export const notificationsForFollows: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_FOLLOWS,
    true,
);

export const notificationsForMirrors: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_MIRRORS,
    true,
);

export const notificationsForPostActions: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_POST_ACTIONS,
    true,
);

export const notificationsForComments: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_COMMENTS,
    true,
);

export const notificationsForMentions: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_MENTIONS,
    true,
);

export const notificationsForReactions: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_REACTIONS,
    true,
);

export const notificationsForQuotes: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_QUOTES,
    true,
);

export const notificationsForGroups: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_GROUPS,
    true,
);

export const notificationsForActions: Writable<boolean> = chromeStorageSync(
    KEY_NOTIFICATIONS_FOR_ACCOUNT_ACTIONS,
    true,
);

export const richTextComposer: Writable<boolean> = chromeStorageSync(KEY_RICH_TEXT, true);
