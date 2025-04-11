import { DateTime } from 'luxon';
import type { User } from '@/lib/types/User';
import { stripMarkdown, truncate, updateBadge } from '@/lib/utils/utils';
import type { LensNode } from '@/lib/types/LensNode';
import {
    getBatchedNotificationCount,
    getEventTime,
    getNewNotifications,
    getNotificationAction,
    getNotificationContent,
    getNotificationUsername,
    getNotificationLink,
    isBatchedNotification,
    NOTIFICATIONS_QUERY_LIMIT,
    isKnownNotification,
    KnownNotification,
} from '@/lib/lens/lens-notifications';
import { KEY_NOTIFICATION_ITEMS_CACHE } from '@/lib/stores/cache-store';
import {
    KEY_NODE_NOTIFICATIONS,
    KEY_NODE_SEARCH,
    KEY_NOTIFICATIONS_GROUPED,
    KEY_NOTIFICATIONS_REFRESH_INTERVAL,
} from '@/lib/stores/preferences-store';
import { KEY_CURRENT_USER } from '@/lib/stores/user-store';
import { getAccounts, searchAccounts } from '@/lib/lens-service';
import type { Account, Notification } from '@lens-protocol/client';
import { formatUsernameV2toLocalName } from '@/lib/utils/lens-utils';
import { migrate } from '@/lib/utils/migrations';
import { browser } from 'wxt/browser/chrome';

export default defineBackground({
    type: 'module',
    main: () => {
        const ALARM_ID_NOTIFICATIONS = 'focalize-notifications-alarm';
        const NOTIFICATION_ID = 'focalize-notifications-id';
        const MESSAGE_LOGGED_OUT = 'loggedOut';
        const MESSAGE_SET_NOTIFICATION_ALARM = 'setNotificationsAlarm';

        const clearAlarm = (name: string) => browser.alarms.clear(name);

        const setAlarm = async (name: string, periodInMinutes: number) => {
            console.log(`setlAlarm:`, name, periodInMinutes);
            await clearAlarm(name);
            await browser.alarms.create(name, {
                periodInMinutes,
                delayInMinutes: 0,
            });
        };

        const clearAllNotifications = () => {
            browser.notifications.getAll((notifications) => {
                Object.keys(notifications).forEach((notificationId) => {
                    browser.notifications.clear(notificationId);
                });
            });
        };

        const createNotificationMessage = (
            notification: Notification,
            contentStripped: string | null | undefined,
            currentUser: User,
        ): string => {
            switch (notification.__typename) {
                case 'PostActionExecutedNotification':
                    return (
                        truncate(contentStripped, 25) ??
                        notification.post.collectibleMetadata?.name ??
                        `${formatUsername(currentUser.username)}`
                    );
                case 'CommentNotification':
                    return (
                        contentStripped ??
                        notification.comment?.collectibleMetadata?.name ??
                        `${formatUsername(currentUser.username)}`
                    );
                case 'MentionNotification':
                    return (
                        contentStripped ??
                        notification.post.collectibleMetadata?.name ??
                        `${formatUsername(currentUser.username)}`
                    );
                case 'RepostNotification':
                case 'ReactionNotification':
                    return (
                        truncate(contentStripped, 25) ??
                        notification.post.collectibleMetadata?.name ??
                        `${formatUsername(currentUser.username)}`
                    );
                case 'QuoteNotification':
                    return (
                        truncate(contentStripped, 25) ??
                        notification.quote.collectibleMetadata?.name ??
                        `${formatUsername(currentUser.username)}`
                    );
                default:
                    return `${formatUsername(currentUser.username)}`;
            }
        };

        const shouldNotificationRequireInteraction = (notification: Notification): boolean => {
            switch (notification.__typename) {
                case 'CommentNotification':
                case 'MentionNotification':
                case 'QuoteNotification':
                    return true;
            }
            return false;
        };

        const getNotificationById = (id: string) =>
            new Promise((resolve) => {
                browser.notifications.getAll((notifications: any) => {
                    resolve(notifications[id]);
                });
            });

        const createIndividualNotification = async (
            notification: Notification,
            currentUser: User,
        ) => {
            if (!(`id` in notification)) {
                return;
            }
            const existing = await getNotificationById(notification.id);
            if (existing) {
                console.log('createIndividualNotification: notification already exists');
                return;
            }

            const username = getNotificationUsername(notification);
            const content = getNotificationContent(notification);
            const action = stripMarkdown(getNotificationAction(notification));
            const contentStripped = content ? stripMarkdown(content) : null;
            const message = createNotificationMessage(notification, contentStripped, currentUser);
            const eventTime = getEventTime(notification);

            let title = username + ' ' + action;
            if (isBatchedNotification(notification)) {
                const batchedNotificationCount = getBatchedNotificationCount(notification);
                title =
                    username +
                    (batchedNotificationCount > 1
                        ? ` and ${batchedNotificationCount - 1} others `
                        : ' ') +
                    action;
            }

            browser.notifications.create(notification.id, {
                type: 'basic',
                eventTime: eventTime ? DateTime.fromISO(eventTime).toMillis() : undefined,
                title,
                message,
                contextMessage: 'Focalize',
                iconUrl: '/icon/128.png',
                requireInteraction: shouldNotificationRequireInteraction(notification),
            });
        };

        const createGroupNotification = async (
            newNotifications: Notification[],
            currentUser: User,
        ) => {
            const lengthStr =
                newNotifications.length === NOTIFICATIONS_QUERY_LIMIT
                    ? '49+'
                    : `${newNotifications.length}`;

            browser.notifications.create(NOTIFICATION_ID, {
                type: 'basic',
                eventTime: DateTime.now().toMillis(),
                requireInteraction: true,
                title: `${lengthStr} new notifications`,
                message: `${formatUsername(currentUser.username)}`,
                contextMessage: 'Focalize',
                iconUrl: '/icon/128.png',
            });
        };

        const launchNotifications = async () => {
            const syncStorage = await browser.storage.sync.get(KEY_NODE_NOTIFICATIONS);
            const url =
                syncStorage[KEY_NODE_NOTIFICATIONS].baseUrl +
                syncStorage[KEY_NODE_NOTIFICATIONS].notifications;
            await browser.tabs.create({ url });
        };

        browser.notifications.onClicked.addListener(async (notificationId) => {
            browser.notifications.clear(notificationId);

            if (notificationId.startsWith('http')) {
                await browser.tabs.create({ url: notificationId });
                return;
            }

            if (notificationId === NOTIFICATION_ID) {
                await launchNotifications();
                return;
            }

            const storage = await browser.storage.local.get([KEY_NOTIFICATION_ITEMS_CACHE]);
            const notifications = storage[KEY_NOTIFICATION_ITEMS_CACHE];
            const notification = notifications
                .filter(isKnownNotification)
                .find((n: KnownNotification) => n.id === notificationId);
            if (notification) {
                const url = await getNotificationLink(notification);
                await browser.tabs.create({ url });
            } else {
                await launchNotifications();
            }
        });

        browser.runtime.onInstalled.addListener((details) => {
            if (details.reason === browser.runtime.OnInstalledReason.INSTALL) {
                browser.runtime.openOptionsPage();
            }
        });

        const formatUsername = (username: string | undefined): string =>
            `${username ? formatUsernameV2toLocalName(username) : 'anonymous'}`;

        const getUser = async () => {
            const localStorage = await browser.storage.local.get(KEY_CURRENT_USER);
            const currentUser: User = localStorage[KEY_CURRENT_USER];
            return currentUser;
        };

        const onNotificationsAlarm = async () => {
            const currentUser = await getUser();
            if (!currentUser) return;

            const latestNotifications = await getNewNotifications(true);
            console.log('onNotificationsAlarm: notifications', latestNotifications);

            try {
                await updateBadge();
            } catch (e) {
                console.error('onNotificationsAlarm: error updating badge', e);
            }

            const notifications: Notification[] | undefined = latestNotifications.notifications;
            console.log(
                `onNotificationsAlarm: ${
                    notifications?.length ?? 0
                } new notifications since last query`,
            );
            if (!notifications || notifications.length === 0) {
                return;
            }

            const syncStorage = await browser.storage.sync.get([KEY_NOTIFICATIONS_GROUPED]);
            if (syncStorage[KEY_NOTIFICATIONS_GROUPED]) {
                await createGroupNotification(notifications, currentUser);
                return;
            }

            for (const notification of notifications) {
                if (notification.__typename === 'FollowNotification') continue;
                await createIndividualNotification(notification, currentUser);
            }
        };

        const onMessageError = (error: any, res: (response?: any) => void) => {
            console.error('onMessageError', error);
            res({ error });
        };

        const onSetNotificationsAlarmMessage = async (req: any, res: (response?: any) => void) => {
            if (req.enabled) {
                const storage = await browser.storage.sync.get(KEY_NOTIFICATIONS_REFRESH_INTERVAL);
                const alarmPeriodInMinutes = storage.notificationsRefreshInterval.value;
                setAlarm(ALARM_ID_NOTIFICATIONS, alarmPeriodInMinutes)
                    .then(() => res())
                    .catch((e) => onMessageError(e, res));
            } else {
                clearAlarm(ALARM_ID_NOTIFICATIONS)
                    .then(() => res())
                    .catch((e) => onMessageError(e, res));
            }
        };

        const onAlarmTriggered = async (alarm: chrome.alarms.Alarm) => {
            console.log(`onAlarmTriggered called: alarm`, alarm);

            switch (alarm.name) {
                case ALARM_ID_NOTIFICATIONS:
                    await onNotificationsAlarm();
                    break;
            }
        };

        browser.alarms.onAlarm.addListener(onAlarmTriggered);

        const onLogoutMessage = async (res: (response?: any) => void) =>
            browser.alarms.clearAll().then(() => {
                clearAllNotifications();
                res();
            });

        const onMessage = (req: any, res: (response?: any) => void): boolean => {
            switch (req.type) {
                case MESSAGE_LOGGED_OUT:
                    onLogoutMessage(res).catch(console.error);
                    return true;
                case MESSAGE_SET_NOTIFICATION_ALARM:
                    onSetNotificationsAlarmMessage(req, res).catch(console.error);
                    return true;
            }
            return false;
        };

        browser.runtime.onMessage.addListener((req, sender, res) => {
            console.log(`Got a message`, req, sender);
            if (sender.id !== browser.runtime.id) {
                res({ error: 'Unauthorized' });
                return false;
            }

            return onMessage(req, res);
        });

        const isEthereumAddress = (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address);

        browser.omnibox.onInputEntered.addListener(async (text) => {
            const storage = await browser.storage.sync.get(KEY_NODE_SEARCH);
            const nodeSearch: LensNode = storage.nodeSearch;

            let username;

            if (isEthereumAddress(text)) {
                try {
                    const accounts = await getAccounts(text);
                    if (accounts.length) {
                        username = accounts[0].username?.localName;
                    }
                } catch (e) {
                    console.warn('Error getting accounts for address', text, e);
                }
            }

            if (!username) {
                username = text;
            }

            const path = nodeSearch.accounts.replace('{username}', username);
            await browser.tabs.create({ url: 'https://' + nodeSearch.baseUrl + path });
        });

        browser.omnibox.onInputChanged.addListener(async (text, suggest) => {
            let accounts: readonly Account[];

            if (isEthereumAddress(text)) {
                accounts = await getAccounts(text);
            } else {
                accounts = await searchAccounts(text);
            }

            if (!accounts) {
                suggest([]);
                return;
            }

            const suggestions = accounts.map((account) => {
                const regex = new RegExp(text, 'i');
                const username = account.username?.localName.replace(
                    regex,
                    `<match>${text}</match>`,
                );

                return {
                    content: account.username?.localName ?? '',
                    description: `@${username} <dim>${account.metadata?.name ?? ''}</dim>`,
                };
            });

            suggest(suggestions);
        });

        browser.runtime.onInstalled.addListener(async (details) => {
            if (
                details.reason === browser.runtime.OnInstalledReason.UPDATE &&
                details.previousVersion
            ) {
                await migrate(details.previousVersion);
            }
        });
    },
});
