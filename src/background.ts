import {DateTime} from 'luxon';

import {pollForPublicationId} from './lib/has-transaction-been-indexed';

import gqlClient from './lib/graph/graphql-client';
import type {
    NewCollectNotification,
    NewCommentNotification,
    NewMentionNotification,
    NewMirrorNotification,
    NewReactionNotification,
    Notification,
    Profile,
    PublicationMetadataV2Input,
} from './lib/graph/lens-service';
import {ProxyActionStatusTypes, SearchRequestTypes} from './lib/graph/lens-service';
import type {User} from './lib/user';
import {stripMarkdown, truncate} from './lib/utils';
import type {PublicationState} from './lib/stores/state-store';
import {getPublicationUrl, type LensNode} from './lib/lens-nodes';
import {
    getAvatarFromNotification,
    getLatestNotifications,
    getNotificationAction,
    getNotificationContent,
    getNotificationHandle,
    getNotificationLink,
    NOTIFICATIONS_QUERY_LIMIT
} from './lib/lens-notifications';
import {
    KEY_NOTIFICATION_ITEMS_CACHE,
    KEY_PENDING_PROXY_ACTIONS,
    KEY_WINDOW_TOPIC_MAP,
    type WindowTopicMap,
    type PendingProxyActionMap,
} from './lib/stores/cache-store';

const ALARM_ID_NOTIFICATIONS = 'focalize-notifications-alarm';
const NOTIFICATION_ID = 'focalize-notifications-id';

const clearAlarm = () => chrome.alarms.clear(ALARM_ID_NOTIFICATIONS);

const setAlarm = async () => {
    const storage = await chrome.storage.sync.get('notificationsRefreshInterval');
    const alarmPeriodInSeconds = storage.notificationsRefreshInterval;
    console.log(`setlAlarm: alarmPeriodInSeconds`, alarmPeriodInSeconds)
    await clearAlarm()
    await chrome.alarms.create(ALARM_ID_NOTIFICATIONS, {
        periodInMinutes: alarmPeriodInSeconds.value,
        delayInMinutes: 0
    })
};

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
            iconUrl: avatar ?? chrome.runtime.getURL('images/icon-128.png'),
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

const getNotificationCountSinceLastOpened = async (): Promise<number> => {
    const storage = await chrome.storage.local.get(['notificationItemsCache'])
    const syncStorage = await chrome.storage.sync.get(['notificationsTimestamp']);
    const lastUpdateDate = syncStorage.notificationsTimestamp ? DateTime.fromISO(syncStorage.notificationsTimestamp) : null;

    if (!lastUpdateDate) return 0;

    const notifications = storage.notificationItemsCache;
    if (!notifications || notifications.length === 0) {
        return 0;
    }

    const newNotifications = notifications.filter((n: Notification) => {
        return DateTime.fromISO(n.createdAt) > lastUpdateDate
    });
    console.log(`getNotificationCountSinceLastOpened: ${newNotifications.length} new notifications since last opened at ${lastUpdateDate.toLocaleString(DateTime.TIME_SIMPLE)}`);

    return newNotifications.length;
}

const updateBadge = async (notificationsTimestamp: string | null) => {
    const lastUpdateDate = notificationsTimestamp ? DateTime.fromISO(notificationsTimestamp) : null;
    if (!lastUpdateDate) return;

    const newNotifications = await getNotificationCountSinceLastOpened();
    const notificationsSize: string = newNotifications > 99 ? '99+' : `${newNotifications}`;

    await chrome.action.setBadgeBackgroundColor({color: '#6B2300'});
    await chrome.action.setBadgeText({text: newNotifications > 0 ? notificationsSize : ''});
    await chrome.action.setTitle({title: `${notificationsSize} new notifications`});
};

const launchNotifications = async () => {
    const syncStorage = await chrome.storage.sync.get('nodeNotifications');
    const url = syncStorage.nodeNotifications.baseUrl + syncStorage.nodeNotifications.notifications;
    await chrome.tabs.create({url});
};

chrome.notifications.onClicked.addListener(async notificationId => {
    if (notificationId.startsWith('http')) {
        chrome.notifications.clear(notificationId);
        await chrome.tabs.create({url: notificationId});
        return;
    }

    if (notificationId === NOTIFICATION_ID) {
        await launchNotifications();
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

    chrome.notifications.clear(notificationId);
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

const onNotificationsAlarm = async () => {
    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;
    if (!currentUser) return;

    const latestNotifications = await getLatestNotifications(true);
    console.log('onAlarmTriggered: notifications', latestNotifications);

    const syncStorage = await chrome.storage.sync.get(
        ['notificationsTimestamp', 'notificationsGrouped', 'nodeNotifications']
    );

    try {
        await updateBadge(syncStorage.notificationsTimestamp);
    } catch (e) {
        console.error('onAlarmTriggered: error updating badge', e);
    }

    let notifications: Notification[] | undefined = latestNotifications.notifications;
    console.log(`onAlarmTriggered: ${notifications?.length ?? 0} new notifications since last query`);
    if (!notifications || notifications.length === 0) {
        return;
    }

    if (syncStorage.notificationsGrouped) {
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

const onSetAlarmMessage = async (req: any, res: (response?: any) => void) => {
    if (req.enabled) {
        setAlarm().then(() => res()).catch(e => onMessageError(e, res));
    } else {
        clearAlarm().then(() => res()).catch(e => onMessageError(e, res));
    }
}

const onGetPublicationIdMessage = (sender: chrome.runtime.MessageSender, req: any, res: (response?: any) => void) => {
    let port: chrome.runtime.Port;
    if (sender.tab?.id) {
        port = chrome.tabs.connect(sender.tab.id, {name: 'getPublicationId'});
    }
    const onPublicationStateChange = (state: PublicationState) => {
        if (!port) return;
        port.postMessage({state});
    };

    return pollForPublicationId(req.post.txHash, onPublicationStateChange)
        .then(publicationId => {
            res({publicationId});
            return notifyOfPublishedPost(req.post.metadata.mainContentFocus, publicationId);
        })
        .catch(e => onMessageError(e, res));
};

const getPendingProxyActions = async () => {
    const storage = await chrome.storage.local.get(KEY_PENDING_PROXY_ACTIONS);
    return storage.pendingProxyActions as PendingProxyActionMap ?? {};
};

const checkProxyActionStatus = async (proxyActionId: string, handle: string) => {
    console.log('checkProxyActionStatus: checking status of proxy action', proxyActionId, handle);
    const {proxyActionStatus} = await gqlClient.ProxyActionStatus({proxyActionId});
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
                iconUrl: chrome.runtime.getURL('images/icon-128.png'),
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

const onAlarmTriggered = async (alarm: chrome.alarms.Alarm) => {
    console.log(`onAlarmTriggered called: alarm`, alarm);

    switch (alarm.name) {
        case ALARM_ID_NOTIFICATIONS:
            await onNotificationsAlarm();
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

chrome.runtime.onMessage.addListener(
    (req, sender, res) => {
        console.log(`Got a message`, req, sender);
        if (sender.id !== chrome.runtime.id) {
            res({error: 'Unauthorized'});
            return false;
        }

        switch (req.type) {
            case 'getPublicationId':
                onGetPublicationIdMessage(sender, req, res).catch(console.error)
                return true;
            case 'setAlarm':
                onSetAlarmMessage(req, res).catch(console.error);
                return true;
            case 'proxyAction':
                checkProxyActionStatus(req.proxyActionId, req.profile.handle)
                    .then(() => res())
                    .catch(console.error);
                return true;
        }
    }
);

const searchProfiles = async (query: string, limit: number): Promise<Profile[]> => {
    const {search} = await gqlClient.SearchProfiles({request: {query, limit, type: SearchRequestTypes.Profile}});

    if (search.__typename === "ProfileSearchResult" && search.items) {
        return search.items as Profile[];
    }

    return [];
}

chrome.omnibox.onInputEntered.addListener(async text => {
    const storage = await chrome.storage.sync.get('nodeSearch');
    const nodeSearch: LensNode = storage.nodeSearch;
    const path = nodeSearch.profiles.replace('{$handle}', text);
    await chrome.tabs.create({url: nodeSearch.baseUrl + path});
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    const profiles = await searchProfiles(text, 10);
    if (!profiles) {
        suggest([]);
        return;
    }

    const suggestions = profiles.map(profile => {
        const regex = new RegExp(text, 'i');
        const handle = profile.handle.replace(regex, `<match>${text}</match>`)

        return {
            content: profile.handle,
            description: `@${handle} <dim>${profile.name}</dim>`
        }
    });

    suggest(suggestions);
});

chrome.windows.onRemoved.addListener( async (windowId: number) => {
    const storage = await chrome.storage.local.get(KEY_WINDOW_TOPIC_MAP);
    const windowTopicMap: WindowTopicMap = storage[KEY_WINDOW_TOPIC_MAP] ?? {};

    const entry = Object.entries(windowTopicMap).find(([topic, id]) => windowId === id);
    if (entry) {
        delete windowTopicMap[entry[0]];
        await chrome.storage.local.set({[KEY_WINDOW_TOPIC_MAP]: windowTopicMap});
    }
});

export {}