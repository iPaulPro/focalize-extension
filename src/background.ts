import {DateTime} from 'luxon';

import {pollForPublicationId} from './lib/utils/has-transaction-been-indexed';

import lensApi from './lib/lens-api';
import type {
    Notification,
    Profile,
    PublicationMetadataV2Input,
} from './lib/graph/lens-service';
import {ProxyActionStatusTypes, SearchRequestTypes} from './lib/graph/lens-service';
import type {User} from './lib/user/user';
import {
    getAvatarForLensHandle,
    getAvatarFromAddress,
    getXmtpKeys,
    launchThreadWindow,
    stripMarkdown,
    truncate,
    truncateAddress, updateBadge
} from './lib/utils/utils';
import type {PublicationState} from './lib/stores/state-store';
import {getPublicationUrl, type LensNode} from './lib/publications/lens-nodes';
import {
    getAvatarFromNotification,
    getLatestNotifications,
    getNotificationAction,
    getNotificationContent,
    getNotificationHandle,
    getNotificationLink,
    NOTIFICATIONS_QUERY_LIMIT
} from './lib/notifications/lens-notifications';
import {
    KEY_MESSAGE_TIMESTAMPS, KEY_NOTIFICATION_ITEMS_CACHE, KEY_PENDING_PROXY_ACTIONS, KEY_WINDOW_TOPIC_MAP,
    type WindowTopicMap, type PendingProxyActionMap, type MessageTimestampMap,
} from './lib/stores/cache-store';
import {
    KEY_MESSAGES_REFRESH_INTERVAL, KEY_MESSAGES_UNREAD_TOPICS, KEY_NOTIFICATIONS_GROUPED,
} from './lib/stores/preferences-store';
import {getPeerName, getUnreadThreads, type Thread} from './lib/xmtp-service';
import type {DecodedMessage} from '@xmtp/xmtp-js';
import {Client} from '@xmtp/xmtp-js';

const ALARM_ID_NOTIFICATIONS = 'focalize-notifications-alarm';
const ALARM_ID_MESSAGES = 'focalize-messages-alarm';
const NOTIFICATION_ID = 'focalize-notifications-id';
const NOTIFICATION_ID_ENABLE_XMTP = 'focalize-enable-xmtp';
const STORAGE_KEY_ENABLE_XMTP_NOTIFICATION = 'focalize-enable-xmtp-notification';

const XMTP_TOPIC_PREFIX = '/xmtp/';

const clearAlarm = (name: string) => chrome.alarms.clear(name);

const setAlarm = async (name: string, periodInMinutes: number) => {
    console.log(`setlAlarm:`, name,  periodInMinutes)
    await clearAlarm(name)
    await chrome.alarms.create(name, {
        periodInMinutes,
        delayInMinutes: 0
    })
};

const clearAllNotifications = () => {
    chrome.notifications.getAll(notifications => {
        Object.keys(notifications).forEach(notificationId => {
            chrome.notifications.clear(notificationId);
        })
    });
}

const createNotificationMessage = (
    notification: Notification,
    contentStripped: string | null | undefined,
    currentUser: User
): string => {
    switch (notification.__typename) {
        case 'NewCollectNotification':
            return truncate(contentStripped, 25) ?? notification.collectedPublication.metadata.name ?? `@${currentUser.handle}`;
        case 'NewCommentNotification':
            return contentStripped ?? notification.comment.commentOn?.metadata.name ?? `@${currentUser.handle}`;
        case 'NewMentionNotification':
            return contentStripped ?? notification.mentionPublication.metadata.name ?? `@${currentUser.handle}`;
        case 'NewMirrorNotification':
        case 'NewReactionNotification':
            return truncate(contentStripped, 25) ?? notification.publication.metadata.name ?? `@${currentUser.handle}`;
    }
    return `@${currentUser.handle}`;
};

const shouldNotificationRequireInteraction = (notification: Notification): boolean => {
    switch (notification.__typename) {
        case 'NewCommentNotification':
        case 'NewMentionNotification':
            return true;
    }
    return false;
};

const getAppIconUrl = () => chrome.runtime.getURL('images/icon-128.png');

const createIndividualNotification = (notification: Notification, currentUser: User) => {
    const handle = getNotificationHandle(notification);
    const avatar = getAvatarFromNotification(notification);
    const content = getNotificationContent(notification);
    const action = getNotificationAction(notification);
    const contentStripped = content ? stripMarkdown(content) : null;
    const message = createNotificationMessage(notification, contentStripped, currentUser);

    chrome.notifications.create(
        notification.notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: handle + ' ' + action,
            message,
            contextMessage: 'Focalize',
            iconUrl: avatar ?? getAppIconUrl(),
            requireInteraction: shouldNotificationRequireInteraction(notification),
        }
    );
}

const createGroupNotification = (newNotifications: Notification[], currentUser: User) => {
    const lengthStr = newNotifications.length === NOTIFICATIONS_QUERY_LIMIT ? '49+' : `${newNotifications.length}`;

    chrome.notifications.create(
        NOTIFICATION_ID,
        {
            type: 'basic',
            eventTime: DateTime.now().toMillis(),
            requireInteraction: true,
            title: `${lengthStr} new notifications`,
            message: `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: currentUser.avatarUrl ?? `https://cdn.stamp.fyi/avatar/${currentUser.address}?s=96`
        }
    );
};

const launchNotifications = async () => {
    const syncStorage = await chrome.storage.sync.get('nodeNotifications');
    const url = syncStorage.nodeNotifications.baseUrl + syncStorage.nodeNotifications.notifications;
    await chrome.tabs.create({url});
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
    })
};

chrome.notifications.onClicked.addListener(async notificationId => {
    chrome.notifications.clear(notificationId);

    if (notificationId.startsWith('http')) {
        await chrome.tabs.create({url: notificationId});
        return;
    }

    if (notificationId === NOTIFICATION_ID) {
        await launchNotifications();
        return;
    }

    if (notificationId.startsWith(XMTP_TOPIC_PREFIX)) {
        await launchThreadWindow({topic: notificationId});
        return;
    }

    if (notificationId === NOTIFICATION_ID_ENABLE_XMTP) {
        const url = chrome.runtime.getURL('src/popup/messaging/login/index.html');
        await chrome.tabs.create({url});
        await chrome.storage.local.set({[STORAGE_KEY_ENABLE_XMTP_NOTIFICATION]: true});
        return;
    }

    const storage = await chrome.storage.local.get([KEY_NOTIFICATION_ITEMS_CACHE]);
    const notifications = storage[KEY_NOTIFICATION_ITEMS_CACHE];
    const notification = notifications.find((n: Notification) => n.notificationId === notificationId);
    if (notification) {
        const url = await getNotificationLink(notification);
        await chrome.tabs.create({url});
    } else {
        await launchNotifications();
    }
});

chrome.notifications.onClosed.addListener(async (notificationId: string, byUser: boolean) => {
    if (!byUser) return;

    if (notificationId.startsWith(XMTP_TOPIC_PREFIX)) {
        const localStorage = await chrome.storage.local.get(KEY_MESSAGE_TIMESTAMPS);
        const timestamps = localStorage[KEY_MESSAGE_TIMESTAMPS] as MessageTimestampMap;
        timestamps[notificationId] = DateTime.now().toMillis();
        await chrome.storage.local.set({[KEY_MESSAGE_TIMESTAMPS]: timestamps});
        return;
    }

    if (notificationId === NOTIFICATION_ID_ENABLE_XMTP) {
        await chrome.storage.local.set({[STORAGE_KEY_ENABLE_XMTP_NOTIFICATION]: true});
        return;
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
});

const notifyOfPublishedPost = async (metadata: PublicationMetadataV2Input, publicationId: string) => {
    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;
    if (!currentUser) return;

    const postId = `${currentUser.profileId}-${publicationId}`;
    const url = await getPublicationUrl(metadata.mainContentFocus, postId);

    chrome.notifications.create(
        url,
        {
            type: 'basic',
            requireInteraction: true,
            title: `Post published!`,
            message: `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: currentUser.avatarUrl ?? `https://cdn.stamp.fyi/avatar/${currentUser.address}?s=96`
        }
    );
};

const getUser = async () => {
    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;
    return currentUser;
};

const onNotificationsAlarm = async () => {
    const currentUser = await getUser();
    if (!currentUser) return;

    const latestNotifications = await getLatestNotifications(true);
    console.log('onAlarmTriggered: notifications', latestNotifications);

    try {
        await updateBadge();
    } catch (e) {
        console.error('onAlarmTriggered: error updating badge', e);
    }

    const notifications: Notification[] | undefined = latestNotifications.notifications;
    console.log(`onAlarmTriggered: ${notifications?.length ?? 0} new notifications since last query`);
    if (!notifications || notifications.length === 0) {
        return;
    }

    const syncStorage = await chrome.storage.sync.get([KEY_NOTIFICATIONS_GROUPED]);
    if (syncStorage[KEY_NOTIFICATIONS_GROUPED]) {
        createGroupNotification(notifications, currentUser);
        return;
    }

    for (const notification of notifications) {
        createIndividualNotification(notification, currentUser);
    }
};

const onMessageError = (error: any, res: (response?: any) => void) => {
    console.error('onMessageError', error);
    res({error});
}

const onSetNotificationsAlarmMessage = async (req: any, res: (response?: any) => void) => {
    if (req.enabled) {
        const storage = await chrome.storage.sync.get('notificationsRefreshInterval');
        const alarmPeriodInMinutes = storage.notificationsRefreshInterval.value;
        setAlarm(ALARM_ID_NOTIFICATIONS, alarmPeriodInMinutes).then(() => res()).catch(e => onMessageError(e, res));
    } else {
        clearAlarm(ALARM_ID_NOTIFICATIONS).then(() => res()).catch(e => onMessageError(e, res));
    }
}

const onGetPublicationIdMessage = async (sender: chrome.runtime.MessageSender, req: any, res: (response?: any) => void) => {
    let port: chrome.runtime.Port;
    if (sender.tab?.id) {
        port = chrome.tabs.connect(sender.tab.id, {name: 'getPublicationId'});
    }
    const onPublicationStateChange = (state: PublicationState) => {
        if (!port) return;
        port.postMessage({state});
    };

    try {
        const publicationId = await pollForPublicationId(req.post.txHash, onPublicationStateChange);
        res({publicationId});
        return notifyOfPublishedPost(req.post.metadata.mainContentFocus, publicationId);
    } catch (e) {
        return onMessageError(e, res);
    }
};

const getPendingProxyActions = async () => {
    const storage = await chrome.storage.local.get(KEY_PENDING_PROXY_ACTIONS);
    return storage.pendingProxyActions as PendingProxyActionMap ?? {};
};

const checkProxyActionStatus = async (proxyActionId: string, handle: string) => {
    console.log('checkProxyActionStatus: checking status of proxy action', proxyActionId, handle);
    const {proxyActionStatus} = await lensApi.proxyActionStatus({proxyActionId});
    console.log('checkProxyActionStatus: proxyActionStatus', proxyActionStatus);

    if (proxyActionStatus.__typename === 'ProxyActionError') {
        // show a notification that the follow was unsuccessful
        chrome.notifications.create(
            'proxyActionError',
            {
                type: 'basic',
                requireInteraction: true,
                title: `Error following @${handle}`,
                message: 'Please try again',
                contextMessage: 'Focalize',
                iconUrl: getAppIconUrl(),
            }
        );
    }

    const saveProxyAction = async () => {
        const pendingProxyActions: PendingProxyActionMap = await getPendingProxyActions();
        pendingProxyActions[proxyActionId] = handle;
        await chrome.storage.local.set({pendingProxyActions});
    }

    if (proxyActionStatus.__typename === 'ProxyActionQueued') {
        console.log('checkProxyActionStatus: proxy action still queued, setting an alarm for 1 minute from now');
        await saveProxyAction();
        return chrome.alarms.create(proxyActionId, {delayInMinutes: 1});
    }

    if (proxyActionStatus.__typename === 'ProxyActionStatusResult') {
        if (proxyActionStatus.status === ProxyActionStatusTypes.Complete) {
            const pendingProxyActions: PendingProxyActionMap = await getPendingProxyActions();
            delete pendingProxyActions[proxyActionId];
            await chrome.storage.local.set({pendingProxyActions});
            return chrome.alarms.clear(proxyActionId);
        }

        console.log('checkProxyActionStatus: proxy action still minting or transferring, setting an alarm for 1 minute from now');
        await saveProxyAction();
        return chrome.alarms.create(proxyActionId, {delayInMinutes: 1});
    }
}

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
        const storage = await chrome.storage.sync.get(KEY_MESSAGES_REFRESH_INTERVAL);
        const alarmPeriodInMinutes = storage[KEY_MESSAGES_REFRESH_INTERVAL].value;
        setAlarm(ALARM_ID_MESSAGES, alarmPeriodInMinutes).then(() => res()).catch(e => onMessageError(e, res));
    } else {
        clearAlarm(ALARM_ID_MESSAGES).then(() => res()).catch(e => onMessageError(e, res));
    }
};

const createEnableXmtpNotification = async () => {
    const storage = await chrome.storage.local.get(STORAGE_KEY_ENABLE_XMTP_NOTIFICATION);
    const enableXmtpNotification = storage[STORAGE_KEY_ENABLE_XMTP_NOTIFICATION];
    console.log('createEnableXmtpNotification: enableXmtpNotification', enableXmtpNotification);
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

    try {
        const client = await getXmtpClient();
        threads = await getUnreadThreads(client);
    } catch (e) {
        console.error('onMessagesAlarm: error getting unread threads', e);
        await createEnableXmtpNotification();
    }

    try {
        const topics = Array.from(threads.keys()).map(thread => thread.conversation.topic);
        await chrome.storage.sync.set({[KEY_MESSAGES_UNREAD_TOPICS]: topics});
        await updateBadge();
    } catch (e) {
        console.error('onMessagesAlarm: error updating badge', e);
    }

    console.log('onMessagesAlarm: unread threads', threads);
    if (threads.size === 0) {
        return;
    }

    for (const [thread, messages] of threads.entries()) {
        if (!thread.conversation.topic || !thread.peer) continue;

        const peerProfile = thread.peer?.profile;
        const peerAddress = thread.conversation.peerAddress;

        const options: chrome.notifications.NotificationOptions<true> = {
            type: 'basic',
            requireInteraction: true,
            title: getPeerName(thread) ?? truncateAddress(peerAddress),
            message: '✉️ ' + (messages.length > 1 ? `${messages.length} new messages` : messages[0].content),
            contextMessage: 'Focalize',
            iconUrl: peerProfile ? getAvatarForLensHandle(peerProfile.handle) : getAvatarFromAddress(peerAddress) ?? getAppIconUrl(),
            silent: false,
        };

        chrome.notifications.getAll((notifications: any) => {
            if (notifications[thread.conversation.topic]) {
                chrome.notifications.update(thread.conversation.topic, options);
            } else {
                chrome.notifications.create(thread.conversation.topic, options)
            }
        });
    }
};

const onAlarmTriggered = async (alarm: chrome.alarms.Alarm) => {
    console.log(`onAlarmTriggered called: alarm`, alarm);

    switch (alarm.name) {
        case ALARM_ID_NOTIFICATIONS:
            await onNotificationsAlarm();
            break;
        case ALARM_ID_MESSAGES:
            await onMessagesAlarm();
            break;
        default:
            const pendingProxyActions: PendingProxyActionMap = await getPendingProxyActions();
            const proxyActionId = alarm.name;
            const handle = pendingProxyActions[proxyActionId];
            if (handle) {
                await checkProxyActionStatus(proxyActionId, handle);
            }
            break;
    }
};

chrome.alarms.onAlarm.addListener(onAlarmTriggered);

const onLogoutMessage = async (res: (response?: any) => void) => chrome.alarms.clearAll()
    .then(() => {
        clearAllNotifications();
        res();
    });

const onMessage = (req: any, sender: chrome.runtime.MessageSender, res: (response?: any) => void): boolean => {
    switch (req.type) {
        case 'loggedOut':
            onLogoutMessage(res).catch(console.error);
            return true;
        case 'getPublicationId':
            onGetPublicationIdMessage(sender, req, res).catch(console.error);
            return true;
        case 'setNotificationsAlarm':
            onSetNotificationsAlarmMessage(req, res).catch(console.error);
            return true;
        case 'proxyAction':
            checkProxyActionStatus(req.proxyActionId, req.profile.handle)
                .then(() => res())
                .catch(console.error);
            return true;
        case 'setMessagesAlarm':
            onSetMessagesAlarm(req, res).catch(console.error);
            return true;
        case 'checkForUnreadMessages':
            onMessagesAlarm()
                .then(() => res())
                .catch(console.error);
            return true;
    }
    return false;
};

chrome.runtime.onMessage.addListener(
    (req, sender, res) => {
        console.log(`Got a message`, req, sender);
        if (sender.id !== chrome.runtime.id) {
            res({error: 'Unauthorized'});
            return false;
        }

        return onMessage(req, sender, res);
    }
);

const searchProfiles = async (query: string, limit: number): Promise<Profile[]> => {
    const {search} = await lensApi.searchProfiles({request: {query, limit, type: SearchRequestTypes.Profile}});

    if (search.__typename === "ProfileSearchResult" && search.items) {
        return search.items as Profile[];
    }

    return [];
};

const getProfiles = async (address: string): Promise<Profile[]> => {
    const storage = await chrome.storage.local.get('currentUser');
    const userProfileId = storage.currentUser?.profileId;
    const {profiles} = await lensApi.profiles({
        request: {ownedBy: [address]}, userProfileId
    });
    return profiles.items;
};

const isEthereumAddress = (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address);

chrome.omnibox.onInputEntered.addListener(async text => {
    const storage = await chrome.storage.sync.get('nodeSearch');
    const nodeSearch: LensNode = storage.nodeSearch;

    let handle;

    if (isEthereumAddress(text)) {
        try {
            const profiles = await getProfiles(text);
            if (profiles.length) {
                handle = profiles[0].handle;
            }
        } catch (e) {
            console.warn('Error getting profiles for address', text, e);
        }
    }

    if (!handle) {
        handle = text;
    }

    const path = nodeSearch.profiles.replace('{$handle}', handle);
    await chrome.tabs.create({url: nodeSearch.baseUrl + path});
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    let profiles: Profile[] = [];

    if (isEthereumAddress(text)) {
        profiles = await getProfiles(text);
    } else {
        profiles = await searchProfiles(text, 10);
    }

    if (!profiles) {
        suggest([]);
        return;
    }

    const suggestions = profiles.map(profile => {
        const regex = new RegExp(text, 'i');
        const handle = profile.handle.replace(regex, `<match>${text}</match>`)

        return {
            content: profile.handle,
            description: `@${handle} <dim>${profile.name ?? ''}</dim>`
        }
    });

    suggest(suggestions);
});

chrome.windows.onRemoved.addListener( async (windowId: number) => {
    const storage = await chrome.storage.local.get(KEY_WINDOW_TOPIC_MAP);
    const windowTopicMap: WindowTopicMap = storage[KEY_WINDOW_TOPIC_MAP] ?? {};

    const entry = Object.entries(windowTopicMap).find(([_, id]) => windowId === id);
    if (entry) {
        delete windowTopicMap[entry[0]];
        await chrome.storage.local.set({[KEY_WINDOW_TOPIC_MAP]: windowTopicMap});
    }
});

export {}