import { GraphQLClient } from 'graphql-request'
import {DateTime} from 'luxon';

import {LENS_API} from "./config";

import {NotificationsDoc} from "./graph/lens-service";
import {notificationsTimestamp} from "./lib/store/preferences";
import {getOrRefreshAccessToken} from "./lib/lens-auth";

import type {Notification} from "./graph/lens-service";

const ALARM_ID = 'focalize-notifications-alarm';
const NOTIFICATION_ID = 'focalize-notifications-id';
const NOTIFICATIONS_QUERY_LIMIT = 50;

const client = new GraphQLClient(LENS_API, {fetch});

const clearAlarm = () => chrome.alarms.clear(ALARM_ID);

const setAlarm = async () => {
    const storage = await chrome.storage.sync.get('notificationsRefreshInterval');
    const alarmPeriodInSeconds = storage.notificationsRefreshInterval;
    console.log(`setlAlarm: alarmPeriodInSeconds`, alarmPeriodInSeconds)
    await clearAlarm()
    chrome.alarms.create(ALARM_ID, {
        periodInMinutes: alarmPeriodInSeconds.value,
        delayInMinutes: 0
    })
};

const getNotifications = async (): Promise<Notification[] | undefined> => {
    let accessToken;
    try {
        accessToken = await getOrRefreshAccessToken();
    } catch (e) {
        console.error('getLatestNotifications: Error getting access token', e);
    }
    if (!accessToken) return undefined;

    const storage = await chrome.storage.local.get('profileId');
    if (!storage.profileId) return undefined;

    const data  = await client.request(
        NotificationsDoc,
        {request: {profileId: storage.profileId, limit: NOTIFICATIONS_QUERY_LIMIT}},
        {'x-access-token': `Bearer ${accessToken}`}
    );

    return data.notifications?.items;
}

const onAlarmTriggered = async () => {
    console.log(`onAlarmTriggered called`)

    const notifications = await getNotifications();
    if (!notifications) return;
    console.log('onAlarmTriggered: notifications', notifications);

    const address = await chrome.storage.local.get('address');
    const storage = await chrome.storage.sync.get('notificationsTimestamp');
    const lastUpdateDate = storage.notificationsTimestamp ? DateTime.fromISO(storage.notificationsTimestamp) : null;

    let newNotifications;
    if (lastUpdateDate) {
        newNotifications = notifications.filter(notification =>
            DateTime.fromISO(notification.createdAt) > lastUpdateDate
        );
        console.log(`onAlarmTriggered: ${newNotifications.length} notifications since last update at ${lastUpdateDate.toLocaleString(DateTime.TIME_SIMPLE)}`);
    }

    if (!newNotifications || newNotifications.length === 0) {
        await updateNotificationsTimestamp();
        return;
    }

    const lengthStr = newNotifications.length === NOTIFICATIONS_QUERY_LIMIT ? '49+' : `${newNotifications.length}`;

    chrome.notifications.create(
        NOTIFICATION_ID,
        {
            type: 'basic',
            requireInteraction: true,
            title: `${lengthStr} new notifications`,
            message: 'Click to see your Lens notifications',
            contextMessage: 'Focalize',
            iconUrl: 'https://cdn.stamp.fyi/avatar/' + address
        }
    );
};

const launchNotifications = async () => {
    const syncStorage = await chrome.storage.sync.get('nodeNotifications');
    const url = syncStorage.nodeNotifications.baseUrl + syncStorage.nodeNotifications.notifications;
    await chrome.tabs.create({url});
};

const updateNotificationsTimestamp = async () => chrome.storage.sync.set({
    notificationsTimestamp: DateTime.now().toISO()
});

chrome.notifications.onClicked.addListener(async notificationId => {
    if (notificationId !== NOTIFICATION_ID) return;

    await launchNotifications();

    chrome.notifications.clear(notificationId);

    await updateNotificationsTimestamp();
});

chrome.notifications.onClosed.addListener(async (notificationId, byUser) => {
    if (!byUser || notificationId !== NOTIFICATION_ID) return;

    await updateNotificationsTimestamp();
});

chrome.alarms.onAlarm.addListener(onAlarmTriggered);

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
});

const parseOGTags = (): {
    url?: string;
    title?: string | null,
    description?: string | null
} => ({
    title: document.head.querySelector("meta[property='og:title']")?.getAttribute("content") ||
        document.head.querySelector("meta[name='twitter:title']")?.getAttribute("content"),
    description: document.head.querySelector("meta[property='og:description']")?.getAttribute("content") ||
        document.head.querySelector("meta[name='description']")?.getAttribute("content") ||
        document.head.querySelector("meta[name='twitter:description']")?.getAttribute("content")
});

const truncate = (str: string, n: number) => (str.length > n) ? str.slice(0, n - 1) + '&hellip;' : str;

const shareUrl = async (tags: any) => {
    console.log('shareUrl called with', tags);
    const path = chrome.runtime.getURL('src/index.html#/post');
    const url = new URL(path);

    url.searchParams.append('type', 'link');

    if (tags.url) {
        url.searchParams.append('url', tags.url);
    }

    if (tags.title) {
        url.searchParams.append('title', truncate(tags.title, 160));
    }

    if (tags.description) {
        url.searchParams.append('desc', truncate(tags.description, 160));
    }

    const storage = await chrome.storage.sync.get('compactMode');
    const compactMode = storage.compactMode;
    console.log('shareUrl', compactMode);

    chrome.windows.create({
        url: url.toString(),
        focused: true,
        type: 'popup',
        width: compactMode ? 672 : 768,
        height: compactMode ? 396 : 600
    }).catch(console.error);
}

chrome.runtime.onMessage.addListener(
    async (req, sender, res) => {
        console.log(`Got a message`, req);
        if (sender.id !== chrome.runtime.id || sender.frameId !== 0) {
            res('Unauthorized')
            return false;
        }

        if (req.setAlarm !== undefined) {
            if (req.setAlarm) {
                await setAlarm();
            } else {
                await clearAlarm();
            }
        }

        return true;
    }
);

chrome.action.onClicked.addListener(tab => {
    const url = tab.url!!;
    const title = tab.title;

    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
        chrome.tabs.update(
            // @ts-ignore
            tab.id,
            {
                url: chrome.runtime.getURL('src/index.html#/post')
            }
        ).catch(console.error);
        return;
    }

    chrome.scripting.executeScript(
        {
            // @ts-ignore
            target: {tabId: tab.id},
            func: parseOGTags
        }
    ).then(results => {
        const tags = results[0]?.result;
        if (tags) {
            console.log('found open graph tags', tags);
            tags.url = url; // og:url is often misused
            if (!tags.title) tags.title = title;
            return shareUrl(tags);
        } else {
            console.log('no tags found')
            return shareUrl({title, url});
        }
    }).catch(e => {
        console.error(e)
        shareUrl({title, url}).catch(console.error);
    })
})

export {}