import { DateTime } from 'luxon';
import type { User } from './lib/user/user';
import {
    getAvatarForLensHandle,
    getAvatarFromAddress,
    getXmtpKeys,
    launchThreadWindow,
    stripMarkdown,
    truncate,
    truncateAddress,
    updateBadge,
} from './lib/utils/utils';
import { PublicationState } from './lib/stores/state-store';
import {
    getUrlForAnyPublicationMetadata,
    type LensNode,
} from './lib/publications/lens-nodes';
import {
    getAvatarFromNotification,
    getEventTime,
    getNewNotifications,
    getNotificationAction,
    getNotificationContent,
    getNotificationHandle,
    getNotificationLink,
    getBatchedNotificationCount,
    isBatchedNotification,
    NOTIFICATIONS_QUERY_LIMIT,
} from './lib/notifications/lens-notifications';
import {
    KEY_MESSAGE_TIMESTAMPS,
    KEY_NOTIFICATION_ITEMS_CACHE,
    KEY_PENDING_PROXY_ACTIONS,
    KEY_WINDOW_TOPIC_MAP,
    type MessageTimestampMap,
    type PendingProxyActionMap,
    type WindowTopicMap,
} from './lib/stores/cache-store';
import {
    getPreference,
    KEY_MESSAGES_ALARM_HAS_RUN,
    KEY_MESSAGES_HIDE_UNKNOWN,
    KEY_MESSAGES_REFRESH_INTERVAL,
    KEY_MESSAGES_UNREAD_TOPICS,
    KEY_NOTIFICATIONS_GROUPED,
} from './lib/stores/preferences-store';
import { getPeerName, getUnreadThreads, type Thread } from './lib/xmtp-service';
import { Client, type DecodedMessage } from '@xmtp/xmtp-js';
import { KEY_CURRENT_USER, KEY_KNOWN_SENDERS } from './lib/stores/user-store';
import { getKnownSenders } from './lib/utils/get-known-senders';
import {
    getProfiles,
    getPublication,
    searchProfiles,
    waitForTransaction,
} from './lib/lens-service';
import type {
    FollowNotificationFragment,
    NotificationFragment,
    ProfileFragment,
    PublicationMetadataFragment,
} from '@lens-protocol/client';
import { LensTransactionStatusType } from '@lens-protocol/client';
import {
    formatHandleV2toV1,
    getNotificationPublication,
    hasMetadata,
} from './lib/utils/lens-utils';
import { migrate } from './lib/utils/migrations';

const ALARM_ID_NOTIFICATIONS = 'focalize-notifications-alarm';
const ALARM_ID_MESSAGES = 'focalize-messages-alarm';
const NOTIFICATION_ID = 'focalize-notifications-id';
const NOTIFICATION_ID_ENABLE_XMTP = 'focalize-enable-xmtp';
const STORAGE_KEY_ENABLE_XMTP_NOTIFICATION =
    'focalize-enable-xmtp-notification';
const MESSAGE_LOGGED_OUT = 'loggedOut';
const MESSAGE_GET_PUBLICATION_ID = 'getPublicationId';
const MESSAGE_SET_NOTIFICATION_ALARM = 'setNotificationsAlarm';
const MESSAGE_SET_MESSAGE_ALARM = 'setMessagesAlarm';
const MESSAGE_CHECK_UNREAD_MESSAGES = 'checkForUnreadMessages';

const XMTP_TOPIC_PREFIX = '/xmtp/';

const clearAlarm = (name: string) => chrome.alarms.clear(name);

const setAlarm = async (name: string, periodInMinutes: number) => {
    console.log(`setlAlarm:`, name, periodInMinutes);
    await clearAlarm(name);
    await chrome.alarms.create(name, {
        periodInMinutes,
        delayInMinutes: 0,
    });
};

const clearAllNotifications = () => {
    chrome.notifications.getAll((notifications) => {
        Object.keys(notifications).forEach((notificationId) => {
            chrome.notifications.clear(notificationId);
        });
    });
};

const createNotificationMessage = (
    notification: NotificationFragment,
    contentStripped: string | null | undefined,
    currentUser: User
): string => {
    const publication = getNotificationPublication(notification);
    switch (notification.__typename) {
        case 'ActedNotification':
            return (
                truncate(contentStripped, 25) ??
                publication?.metadata?.marketplace?.name ??
                `${formatHandle(currentUser.handle)}`
            );
        case 'CommentNotification':
            return (
                contentStripped ??
                notification.comment.commentOn?.metadata?.marketplace?.name ??
                `${formatHandle(currentUser.handle)}`
            );
        case 'MentionNotification':
            return (
                contentStripped ??
                notification.publication.metadata?.marketplace?.name ??
                `${formatHandle(currentUser.handle)}`
            );
        case 'MirrorNotification':
        case 'ReactionNotification':
            return (
                truncate(contentStripped, 25) ??
                notification.publication.metadata?.marketplace?.name ??
                `${formatHandle(currentUser.handle)}`
            );
        case 'QuoteNotification':
            return (
                truncate(contentStripped, 25) ??
                notification.quote.metadata?.marketplace?.name ??
                `${formatHandle(currentUser.handle)}`
            );
    }
    return `${formatHandle(currentUser.handle)}`;
};

const shouldNotificationRequireInteraction = (
    notification: NotificationFragment
): boolean => {
    switch (notification.__typename) {
        case 'CommentNotification':
        case 'MentionNotification':
        case 'QuoteNotification':
            return true;
    }
    return false;
};

const getAppIconUrl = () => chrome.runtime.getURL('images/icon-128.png');

const getNotificationById = (id: string) =>
    new Promise((resolve) => {
        chrome.notifications.getAll((notifications: any) => {
            resolve(notifications[id]);
        });
    });

const createIndividualNotification = async (
    notification: NotificationFragment,
    currentUser: User
) => {
    const existing = await getNotificationById(notification.id);
    if (existing) {
        console.log(
            'createIndividualNotification: notification already exists'
        );
        return;
    }

    const handle = getNotificationHandle(notification);
    const avatar = getAvatarFromNotification(notification);
    const content = getNotificationContent(notification);
    const action = getNotificationAction(notification);
    const contentStripped = content ? stripMarkdown(content) : null;
    const message = createNotificationMessage(
        notification,
        contentStripped,
        currentUser
    );
    const eventTime = getEventTime(notification);

    let title = handle + ' ' + action;
    if (isBatchedNotification(notification)) {
        const batchedNotificationCount =
            getBatchedNotificationCount(notification);
        title =
            handle +
            (batchedNotificationCount > 1
                ? ` and ${batchedNotificationCount - 1} others `
                : ' ') +
            action;
    }

    chrome.notifications.create(notification.id, {
        type: 'basic',
        eventTime: eventTime
            ? DateTime.fromISO(eventTime).toMillis()
            : undefined,
        title,
        message,
        contextMessage: 'Focalize',
        iconUrl: avatar ?? getAppIconUrl(),
        requireInteraction: shouldNotificationRequireInteraction(notification),
    });
};

const createGroupNotification = (
    newNotifications: NotificationFragment[],
    currentUser: User
) => {
    const lengthStr =
        newNotifications.length === NOTIFICATIONS_QUERY_LIMIT
            ? '49+'
            : `${newNotifications.length}`;

    chrome.notifications.create(NOTIFICATION_ID, {
        type: 'basic',
        eventTime: DateTime.now().toMillis(),
        requireInteraction: true,
        title: `${lengthStr} new notifications`,
        message: `${formatHandle(currentUser.handle)}`,
        contextMessage: 'Focalize',
        iconUrl:
            currentUser.avatarUrl ??
            `https://cdn.stamp.fyi/avatar/${currentUser.address}?s=96`,
    });
};

const launchNotifications = async () => {
    const syncStorage = await chrome.storage.sync.get('nodeNotifications');
    const url =
        syncStorage.nodeNotifications.baseUrl +
        syncStorage.nodeNotifications.notifications;
    await chrome.tabs.create({ url });
};

// Cannot use the Client built with the web3modal Signer because it uses window object
const getXmtpClient = async (): Promise<Client> => {
    const user = await getUser();
    if (!user) throw new Error('getXmtpClient: no user found');

    const keys = await getXmtpKeys(user.address);
    if (!keys) throw new Error('getXmtpClient: no xmtp keys found');

    return await Client.create(null, {
        env: import.meta.env.MODE === 'development' ? 'dev' : 'production',
        privateKeyOverride: keys,
    });
};

chrome.notifications.onClicked.addListener(async (notificationId) => {
    chrome.notifications.clear(notificationId);

    if (notificationId.startsWith('http')) {
        await chrome.tabs.create({ url: notificationId });
        return;
    }

    if (notificationId === NOTIFICATION_ID) {
        await launchNotifications();
        return;
    }

    if (notificationId.startsWith(XMTP_TOPIC_PREFIX)) {
        await launchThreadWindow({ topic: notificationId });
        return;
    }

    if (notificationId === NOTIFICATION_ID_ENABLE_XMTP) {
        const url = chrome.runtime.getURL(
            'src/popup/messaging/login/index.html'
        );
        await chrome.tabs.create({ url });
        await chrome.storage.local.set({
            [STORAGE_KEY_ENABLE_XMTP_NOTIFICATION]: true,
        });
        return;
    }

    const storage = await chrome.storage.local.get([
        KEY_NOTIFICATION_ITEMS_CACHE,
    ]);
    const notifications = storage[KEY_NOTIFICATION_ITEMS_CACHE];
    const notification = notifications.find(
        (n: NotificationFragment) => n.id === notificationId
    );
    if (notification) {
        const url = await getNotificationLink(notification);
        await chrome.tabs.create({ url });
    } else {
        await launchNotifications();
    }
});

chrome.notifications.onClosed.addListener(
    async (notificationId: string, byUser: boolean) => {
        if (!byUser) return;

        if (notificationId.startsWith(XMTP_TOPIC_PREFIX)) {
            const localStorage = await chrome.storage.local.get(
                KEY_MESSAGE_TIMESTAMPS
            );
            const timestamps = localStorage[
                KEY_MESSAGE_TIMESTAMPS
            ] as MessageTimestampMap;
            timestamps[notificationId] = DateTime.now().toMillis();
            await chrome.storage.local.set({
                [KEY_MESSAGE_TIMESTAMPS]: timestamps,
            });
            return;
        }

        if (notificationId === NOTIFICATION_ID_ENABLE_XMTP) {
            await chrome.storage.local.set({
                [STORAGE_KEY_ENABLE_XMTP_NOTIFICATION]: true,
            });
            return;
        }
    }
);

chrome.notifications.onButtonClicked.addListener(
    (notificationId, buttonIndex) => {
        console.log(
            'onButtonClicked: notificationId',
            notificationId,
            'buttonIndex',
            buttonIndex
        );
    }
);

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
});

const formatHandle = (handle: string | undefined): string =>
    `@${handle ? formatHandleV2toV1(handle) : 'anonymous'}`;

const getUser = async () => {
    const localStorage = await chrome.storage.local.get(KEY_CURRENT_USER);
    const currentUser: User = localStorage[KEY_CURRENT_USER];
    return currentUser;
};

const notifyOfPublishedPost = async (
    metadata: PublicationMetadataFragment,
    publicationId: string
) => {
    const currentUser: User = await getUser();
    if (!currentUser) return;

    const url = await getUrlForAnyPublicationMetadata(metadata, publicationId);

    chrome.notifications.create(url, {
        type: 'basic',
        requireInteraction: true,
        title: `Post published!`,
        message: `${formatHandle(currentUser.handle)}`,
        contextMessage: 'Focalize',
        iconUrl:
            currentUser.avatarUrl ??
            `https://cdn.stamp.fyi/avatar/${currentUser.address}?s=96`,
    });
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

    const notifications: NotificationFragment[] | undefined =
        latestNotifications.notifications;
    console.log(
        `onNotificationsAlarm: ${
            notifications?.length ?? 0
        } new notifications since last query`
    );
    if (!notifications || notifications.length === 0) {
        return;
    }

    const syncStorage = await chrome.storage.sync.get([
        KEY_NOTIFICATIONS_GROUPED,
    ]);
    if (syncStorage[KEY_NOTIFICATIONS_GROUPED]) {
        createGroupNotification(notifications, currentUser);
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

const onSetNotificationsAlarmMessage = async (
    req: any,
    res: (response?: any) => void
) => {
    if (req.enabled) {
        const storage = await chrome.storage.sync.get(
            'notificationsRefreshInterval'
        );
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

const onGetPublicationIdMessage = async (
    sender: chrome.runtime.MessageSender,
    req: any,
    res: (response?: any) => void
) => {
    let port: chrome.runtime.Port | undefined = undefined;
    if (sender.tab?.id) {
        port = chrome.tabs.connect(sender.tab.id, {
            name: MESSAGE_GET_PUBLICATION_ID,
        });
    }

    try {
        const txHash = req.post.txHash;
        const publicationStatus = await waitForTransaction({ txHash });

        if (
            publicationStatus === LensTransactionStatusType.Complete ||
            publicationStatus ===
                LensTransactionStatusType.OptimisticallyUpdated
        ) {
            port?.postMessage({ state: PublicationState.SUCCESS });

            const publication = await getPublication({ txHash });
            if (publication) {
                const publicationId = publication.id;
                res({ publicationId });

                if (hasMetadata(publication)) {
                    return notifyOfPublishedPost(
                        publication.metadata,
                        publicationId
                    );
                }
            }
        } else if (publicationStatus === LensTransactionStatusType.Failed) {
            port?.postMessage({ state: PublicationState.ERROR });
        }
    } catch (e) {
        return onMessageError(e, res);
    }
};

const getPendingProxyActions = async () => {
    const storage = await chrome.storage.local.get(KEY_PENDING_PROXY_ACTIONS);
    return (storage.pendingProxyActions as PendingProxyActionMap) ?? {};
};

// const checkProxyActionStatus = async (
//     proxyActionId: string,
//     handle: string
// ) => {
//     console.log(
//         'checkProxyActionStatus: checking status of proxy action',
//         proxyActionId,
//         handle
//     );
//     const { proxyActionStatus } = await lensApi.proxyActionStatus({
//         proxyActionId,
//     });
//     console.log('checkProxyActionStatus: proxyActionStatus', proxyActionStatus);
//
//     if (proxyActionStatus.__typename === 'ProxyActionError') {
//         // show a notification that the follow was unsuccessful
//         chrome.notifications.create('proxyActionError', {
//             type: 'basic',
//             requireInteraction: true,
//             title: `Error following @${handle}`,
//             message: 'Please try again',
//             contextMessage: 'Focalize',
//             iconUrl: getAppIconUrl(),
//         });
//     }
//
//     const saveProxyAction = async () => {
//         const pendingProxyActions: PendingProxyActionMap =
//             await getPendingProxyActions();
//         pendingProxyActions[proxyActionId] = handle;
//         await chrome.storage.local.set({ pendingProxyActions });
//     };
//
//     if (proxyActionStatus.__typename === 'ProxyActionQueued') {
//         console.log(
//             'checkProxyActionStatus: proxy action still queued, setting an alarm for 1 minute from now'
//         );
//         await saveProxyAction();
//         return chrome.alarms.create(proxyActionId, { delayInMinutes: 1 });
//     }
//
//     if (proxyActionStatus.__typename === 'ProxyActionStatusResult') {
//         if (proxyActionStatus.status === ProxyActionStatusTypes.Complete) {
//             const pendingProxyActions: PendingProxyActionMap =
//                 await getPendingProxyActions();
//             delete pendingProxyActions[proxyActionId];
//             await chrome.storage.local.set({ pendingProxyActions });
//             return chrome.alarms.clear(proxyActionId);
//         }
//
//         console.log(
//             'checkProxyActionStatus: proxy action still minting or transferring, setting an alarm for 1 minute from now'
//         );
//         await saveProxyAction();
//         return chrome.alarms.create(proxyActionId, { delayInMinutes: 1 });
//     }
// };

const onSetMessagesAlarm = async (req: any, res: (response?: any) => void) => {
    try {
        // Check if the user has connected their XMTP account
        await getXmtpClient();
    } catch (e) {
        await createEnableXmtpNotification();
        res();
        return;
    }

    if (req.enabled) {
        const storage = await chrome.storage.sync.get(
            KEY_MESSAGES_REFRESH_INTERVAL
        );
        const alarmPeriodInMinutes =
            storage[KEY_MESSAGES_REFRESH_INTERVAL].value;
        setAlarm(ALARM_ID_MESSAGES, alarmPeriodInMinutes)
            .then(() => res())
            .catch((e) => onMessageError(e, res));
    } else {
        clearAlarm(ALARM_ID_MESSAGES)
            .then(() => res())
            .catch((e) => onMessageError(e, res));
    }
};

const createEnableXmtpNotification = async () => {
    await clearAlarm(ALARM_ID_NOTIFICATIONS);

    const storage = await chrome.storage.local.get(
        STORAGE_KEY_ENABLE_XMTP_NOTIFICATION
    );
    const enableXmtpNotification =
        storage[STORAGE_KEY_ENABLE_XMTP_NOTIFICATION];
    console.log(
        'createEnableXmtpNotification: enableXmtpNotification',
        enableXmtpNotification
    );
    if (enableXmtpNotification) return;

    chrome.notifications.create(NOTIFICATION_ID_ENABLE_XMTP, {
        type: 'basic',
        requireInteraction: true,
        title: `Enable DMs`,
        message: 'Sign into XMTP to enable direct messages',
        contextMessage: 'Focalize',
        iconUrl: getAppIconUrl(),
    });
};

const onMessagesAlarm = async () => {
    let threads: Map<Thread, DecodedMessage[]> = new Map();

    const localStorage = await chrome.storage.local.get([
        KEY_MESSAGES_ALARM_HAS_RUN,
        KEY_KNOWN_SENDERS,
    ]);
    const alarmHasRun: boolean = localStorage[KEY_MESSAGES_ALARM_HAS_RUN];

    try {
        const client = await getXmtpClient();
        threads = await getUnreadThreads(client, !alarmHasRun);
    } catch (e) {
        console.warn('onMessagesAlarm: error getting unread threads', e);
        await createEnableXmtpNotification();
    }

    const savedKnownSenders = localStorage[KEY_KNOWN_SENDERS] ?? [];
    let knownSenders: string[] =
        alarmHasRun && savedKnownSenders.length
            ? savedKnownSenders ?? []
            : await updateKnownSenders();

    console.log('onMessagesAlarm: unread threads', threads);
    if (threads.size === 0) {
        return;
    }

    chrome.notifications.getAll(async (existingNotifications: any) => {
        const unreadTopics: string[] = [];

        for (const [thread, messages] of threads.entries()) {
            if (!thread.conversation.topic || !thread.peer) continue;

            const peerProfile = thread.peer.profile;
            let isFollowing =
                peerProfile?.operations.isFollowedByMe.value ?? false;

            const peerAddress = thread.conversation.peerAddress;
            if (!peerProfile && peerAddress) {
                try {
                    const res = await getProfiles({});
                    isFollowing =
                        res?.items.find(
                            (profile) => profile.operations.isFollowedByMe.value
                        ) != undefined;
                } catch (e) {}
            }

            if (!knownSenders.length) {
                const update = await updateKnownSenders();
                knownSenders.push(...update);
            }

            const hideUnknown = await getPreference(
                KEY_MESSAGES_HIDE_UNKNOWN,
                true
            );

            if (
                hideUnknown &&
                (!isFollowing || !knownSenders.find((s) => s === peerAddress))
            ) {
                console.log('onMessagesAlarm: skipping notification');
                continue;
            }

            unreadTopics.push(thread.conversation.topic);

            const options: chrome.notifications.NotificationOptions<true> = {
                type: 'basic',
                requireInteraction: true,
                title: getPeerName(thread) ?? truncateAddress(peerAddress),
                message:
                    '✉️ ' +
                    (messages.length > 1
                        ? `${messages.length} new messages`
                        : messages[0].content),
                contextMessage: 'Focalize',
                iconUrl: peerProfile?.handle
                    ? getAvatarForLensHandle(peerProfile.handle.localName)
                    : getAvatarFromAddress(peerAddress) ?? getAppIconUrl(),
                silent: false,
            };

            if (existingNotifications[thread.conversation.topic]) {
                chrome.notifications.update(thread.conversation.topic, options);
            } else {
                chrome.notifications.create(thread.conversation.topic, options);
            }
        }

        try {
            await chrome.storage.sync.set({
                [KEY_MESSAGES_UNREAD_TOPICS]: unreadTopics,
            });
            await chrome.storage.local.set({
                [KEY_MESSAGES_ALARM_HAS_RUN]: true,
            });
            await updateBadge();
        } catch (e) {
            console.error('onMessagesAlarm: error updating badge', e);
        }
    });
};

const updateKnownSenders = async (): Promise<string[]> => {
    const currentUser: User = await getUser();
    try {
        const xmtp = await getXmtpClient();

        const knownSenders = await getKnownSenders(currentUser, xmtp);
        await chrome.storage.local.set({
            [KEY_KNOWN_SENDERS]: knownSenders,
        });

        return knownSenders;
    } catch (e) {
        console.warn('updateKnownSenders: error getting known senders', e);
        return [];
    }
};

const onAlarmTriggered = async (alarm: chrome.alarms.Alarm) => {
    console.log(`onAlarmTriggered called: alarm`, alarm);

    switch (alarm.name) {
        case ALARM_ID_NOTIFICATIONS:
            await onNotificationsAlarm();
            await updateKnownSenders();
            break;
        case ALARM_ID_MESSAGES:
            await onMessagesAlarm();
            break;
        // default:
        //     const pendingProxyActions: PendingProxyActionMap =
        //         await getPendingProxyActions();
        //     const proxyActionId = alarm.name;
        //     const handle = pendingProxyActions[proxyActionId];
        //     if (handle) {
        //         await checkProxyActionStatus(proxyActionId, handle);
        //     }
        //     break;
    }
};

chrome.alarms.onAlarm.addListener(onAlarmTriggered);

const onLogoutMessage = async (res: (response?: any) => void) =>
    chrome.alarms.clearAll().then(() => {
        clearAllNotifications();
        res();
    });

const onMessage = (
    req: any,
    sender: chrome.runtime.MessageSender,
    res: (response?: any) => void
): boolean => {
    switch (req.type) {
        case MESSAGE_LOGGED_OUT:
            onLogoutMessage(res).catch(console.error);
            return true;
        case MESSAGE_GET_PUBLICATION_ID:
            onGetPublicationIdMessage(sender, req, res).catch(console.error);
            return true;
        case MESSAGE_SET_NOTIFICATION_ALARM:
            onSetNotificationsAlarmMessage(req, res).catch(console.error);
            return true;
        // case MESSAGE_PROXY_ACTION:
        //     checkProxyActionStatus(req.proxyActionId, req.profile.handle)
        //         .then(() => res())
        //         .catch(console.error);
        //     return true;
        case MESSAGE_SET_MESSAGE_ALARM:
            onSetMessagesAlarm(req, res).catch(console.error);
            return true;
        case MESSAGE_CHECK_UNREAD_MESSAGES:
            onMessagesAlarm()
                .then(() => res())
                .catch(console.error);
            return true;
    }
    return false;
};

chrome.runtime.onMessage.addListener((req, sender, res) => {
    console.log(`Got a message`, req, sender);
    if (sender.id !== chrome.runtime.id) {
        res({ error: 'Unauthorized' });
        return false;
    }

    return onMessage(req, sender, res);
});

const isEthereumAddress = (address: string): boolean =>
    /^0x[a-fA-F0-9]{40}$/.test(address);

chrome.omnibox.onInputEntered.addListener(async (text) => {
    const storage = await chrome.storage.sync.get('nodeSearch');
    const nodeSearch: LensNode = storage.nodeSearch;

    let handle;

    if (isEthereumAddress(text)) {
        try {
            const profiles = await getProfiles({ ownedBy: [text] });
            if (profiles.items.length) {
                handle = profiles.items[0].handle?.localName;
            }
        } catch (e) {
            console.warn('Error getting profiles for address', text, e);
        }
    }

    if (!handle) {
        handle = text;
    }

    const path = nodeSearch.profiles.replace('{$handle}', handle);
    await chrome.tabs.create({ url: nodeSearch.baseUrl + path });
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    let profiles: ProfileFragment[] = [];

    if (isEthereumAddress(text)) {
        const res = await getProfiles({ ownedBy: [text] });
        profiles = res.items;
    } else {
        profiles = await searchProfiles(text);
    }

    if (!profiles) {
        suggest([]);
        return;
    }

    const suggestions = profiles.map((profile) => {
        const regex = new RegExp(text, 'i');
        const handle = profile.handle?.localName.replace(
            regex,
            `<match>${text}</match>`
        );

        return {
            content: profile.handle?.localName ?? '',
            description: `@${handle} <dim>${
                profile.metadata?.displayName ?? ''
            }</dim>`,
        };
    });

    suggest(suggestions);
});

chrome.windows.onRemoved.addListener(async (windowId: number) => {
    const storage = await chrome.storage.local.get(KEY_WINDOW_TOPIC_MAP);
    const windowTopicMap: WindowTopicMap = storage[KEY_WINDOW_TOPIC_MAP] ?? {};

    const entry = Object.entries(windowTopicMap).find(
        ([_, id]) => windowId === id
    );
    if (entry) {
        delete windowTopicMap[entry[0]];
        await chrome.storage.local.set({
            [KEY_WINDOW_TOPIC_MAP]: windowTopicMap,
        });
    }
});

chrome.runtime.onInstalled.addListener(async (details) => {
    if (
        details.reason === chrome.runtime.OnInstalledReason.UPDATE &&
        details.previousVersion
    ) {
        await migrate(details.previousVersion);
    }
});

export {};
