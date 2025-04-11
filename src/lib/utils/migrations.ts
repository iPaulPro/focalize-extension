import {
    ALL_NODE_KEYS,
    deletePreference,
    KEY_DISPATCHER_DIALOG_SHOWN,
    KEY_MESSAGES_HIDE_EMPTY,
    KEY_MESSAGES_PLAY_SOUNDS,
    KEY_MESSAGES_REFRESH_ENABLED,
    KEY_MESSAGES_REFRESH_INTERVAL,
    KEY_MESSAGES_UNREAD_TOPICS,
    KEY_NODE_NOTIFICATIONS,
    KEY_NODE_SEARCH,
    KEY_USE_PROFILE_MANAGER,
    KEY_USE_RELAY,
    savePreference,
} from '@/lib/stores/preferences-store';
import {
    clearNotificationCache,
    KEY_MESSAGE_TIMESTAMPS,
    KEY_PENDING_PROXY_ACTIONS,
    KEY_PROFILE_ID_BY_ADDRESS,
    KEY_PROFILES,
    KEY_SELECTED_MAIN_TAB,
    KEY_SELECTED_MESSAGES_TAB,
    KEY_WINDOW_TOPIC_MAP,
} from '@/lib/stores/cache-store';
import { clearUser, KEY_KNOWN_SENDERS } from '@/lib/stores/user-store';
import nodes from '../stores/nodes.json';

const deleteMessagePreferences = async () => {
    await deletePreference(KEY_MESSAGES_REFRESH_ENABLED);
    await deletePreference(KEY_MESSAGES_REFRESH_INTERVAL);
    await deletePreference(KEY_MESSAGES_UNREAD_TOPICS);
    await deletePreference(KEY_MESSAGES_HIDE_EMPTY);
    await deletePreference(KEY_MESSAGES_PLAY_SOUNDS);
    await deletePreference(KEY_PENDING_PROXY_ACTIONS);
    await deletePreference(KEY_MESSAGE_TIMESTAMPS);
    await deletePreference(KEY_SELECTED_MESSAGES_TAB);
    await deletePreference(KEY_WINDOW_TOPIC_MAP);
    await deletePreference(KEY_PROFILES);
    await deletePreference(KEY_PROFILE_ID_BY_ADDRESS);
    await deletePreference(KEY_KNOWN_SENDERS);

    await savePreference(KEY_SELECTED_MAIN_TAB, 0);
};

const resetSignless = async () => {
    await deletePreference(KEY_USE_PROFILE_MANAGER);
    await deletePreference(KEY_USE_RELAY);
    await savePreference(KEY_DISPATCHER_DIALOG_SHOWN, false);
};

const resetNodes = async () => {
    for (const node in ALL_NODE_KEYS) {
        await savePreference(node, nodes[0]);
    }
    await savePreference(KEY_NODE_NOTIFICATIONS, nodes[0]);
    await savePreference(KEY_NODE_SEARCH, nodes[0]);
};

export const migrate = async (previousVersion: string) => {
    const versionParts = previousVersion.split('.');
    switch (versionParts[0]) {
        case '1':
        case '2':
            // TODO: Migrate from v1/v2 to v3
            await deleteMessagePreferences();
            await resetSignless();
            await clearNotificationCache();
            await resetNodes();
            clearUser();
            break;
    }
};
