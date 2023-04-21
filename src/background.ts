import {DateTime} from 'luxon';

import {pollForPublicationId} from './lib/has-transaction-been-indexed';

import gqlClient from "./lib/graph/graphql-client";
import {SearchRequestTypes} from "./lib/graph/lens-service";
import type {
    PublicationMetadataV2Input,
    Profile,
    Notification,
    NewMirrorNotification,
    NewMentionNotification,
    NewCommentNotification,
    NewReactionNotification,
    NewCollectNotification,
} from "./lib/graph/lens-service";
import type {User} from "./lib/user";
import {truncate, stripMarkdown} from "./lib/utils";
import type {PublicationState} from "./lib/stores/state-store";
import {getPublicationUrl, type LensNode} from "./lib/lens-nodes";
import {
    getAvatarFromNotification, getLatestNotifications, getNotificationAction, getNotificationContent, getNotificationHandle,
    NOTIFICATIONS_QUERY_LIMIT
} from "./lib/lens-notifications";

const ALARM_ID = 'focalize-notifications-alarm';
const NOTIFICATION_ID = 'focalize-notifications-id';

const clearAlarm = () => chrome.alarms.clear(ALARM_ID);

const setAlarm = async () => {
    const storage = await chrome.storage.sync.get('notificationsRefreshInterval');
    const alarmPeriodInSeconds = storage.notificationsRefreshInterval;
    console.log(`setlAlarm: alarmPeriodInSeconds`, alarmPeriodInSeconds)
    await clearAlarm()
    await chrome.alarms.create(ALARM_ID, {
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
    // TODO only count notifications that don't create a system notification
    const lastUpdateDate = notificationsTimestamp ? DateTime.fromISO(notificationsTimestamp) : null;
    if (!lastUpdateDate) return;

    const newNotifications = await getNotificationCountSinceLastOpened();
    const notificationsSize: string = newNotifications > 99 ? '99+' : `${newNotifications}`;

    await chrome.action.setBadgeBackgroundColor({color: '#6B2300'});
    await chrome.action.setBadgeText({text: newNotifications > 0 ? notificationsSize : ''});
    await chrome.action.setTitle({title: `${notificationsSize} new notifications`});
};

const onAlarmTriggered = async () => {
    console.log(`onAlarmTriggered called`)

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

    chrome.notifications.clear(notificationId);
    await launchNotifications();
});

chrome.alarms.onAlarm.addListener(onAlarmTriggered);

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

chrome.runtime.onMessage.addListener(
    (req, sender, res) => {
        console.log(`Got a message`, req);
        if (sender.id !== chrome.runtime.id || sender.frameId !== 0) {
            res('Unauthorized')
            return false;
        }

        if (req.setAlarm !== undefined) {
            if (req.setAlarm) {
                setAlarm().then(() => res()).catch(console.error);
            } else {
                clearAlarm().then(() => res()).catch(console.error);
            }
            return true;
        }

        if (req.getPublicationId) {
            let port: chrome.runtime.Port;
            if (sender.tab?.id) {
                port = chrome.tabs.connect(sender.tab.id, {name: 'getPublicationId'});
            }
            const onPublicationStateChange = (state: PublicationState) => {
                if (!port) return;
                port.postMessage({state})
            }

            pollForPublicationId(req.getPublicationId.txHash, onPublicationStateChange)
                .then(publicationId => {
                    res({publicationId});
                    return notifyOfPublishedPost(req.getPublicationId.metadata.mainContentFocus, publicationId);
                })
                .catch(error => res({error}));
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

export {}