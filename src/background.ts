import {DateTime} from 'luxon';
import {BigNumber, utils} from 'ethers';

import {getOrRefreshAccessToken} from './lib/lens-auth';
import {pollUntilIndexed} from './lib/has-transaction-been-indexed';

import gqlClient from "./graph/graphql-client";
import {SearchRequestTypes} from "./graph/lens-service";

import type {PublicationMetadataV2Input, Profile, Notification,} from "./graph/lens-service";
import type {User} from "./lib/user";
import type {LensNode} from "./lib/lens-nodes";
import {getNodeUrlForPublication} from "./lib/utils";

const ALARM_ID = 'focalize-notifications-alarm';
const NOTIFICATION_ID = 'focalize-notifications-id';
const NOTIFICATIONS_QUERY_LIMIT = 50;

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
        console.error('getNotifications: Error getting access token', e);
    }
    if (!accessToken) return undefined;

    const storage = await chrome.storage.local.get('currentUser');
    if (!storage.currentUser) return undefined;
    const user: User = storage.currentUser;

    const {notifications} = await gqlClient.Notifications({request: {profileId: user.profileId, limit: NOTIFICATIONS_QUERY_LIMIT}})

    if (notifications.items) {
        return notifications.items as Notification[];
    }

    return [];
}

const onAlarmTriggered = async () => {
    console.log(`onAlarmTriggered called`)

    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;
    if (!currentUser) return;

    const notifications = await getNotifications();
    if (!notifications) return;
    console.log('onAlarmTriggered: notifications', notifications);

    const syncStorage = await chrome.storage.sync.get('notificationsTimestamp');
    const lastUpdateDate = syncStorage.notificationsTimestamp ? DateTime.fromISO(syncStorage.notificationsTimestamp) : null;

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

const updateNotificationsTimestamp = async () => chrome.storage.sync.set({
    notificationsTimestamp: DateTime.now().toISO()
});

chrome.notifications.onClicked.addListener(async notificationId => {
    if (notificationId !== NOTIFICATION_ID) {
        // If not the notifications notification we know this is a post published on and the id is the url
        // If more notification types are added we'll probably want to use some type of prefix
        chrome.notifications.clear(notificationId);
        await chrome.tabs.create({url: notificationId});
        return;
    }

    chrome.notifications.clear(notificationId);
    await launchNotifications();
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

const pollForPublicationId = async (txHash: string) => {
    console.log('pollForPublicationId: txHash=', txHash);

    const indexedResult = await pollUntilIndexed(txHash);

    const logs = indexedResult?.txReceipt?.logs;
    const topicId = utils.id(
        'PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)'
    );

    const log = logs?.find((l: any) => l.topics[0] === topicId);
    if (!log) {
        throw new Error('getPublicationId: Error while finding log');
    }

    const profileCreatedEventLog = log.topics;

    const publicationId = utils.defaultAbiCoder.decode(['uint256'], profileCreatedEventLog[2])[0];
    return BigNumber.from(publicationId).toHexString();
};

const notifyOfPublishedPost = async (metadata: PublicationMetadataV2Input, publicationId: string) => {
    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;
    if (!currentUser) return;

    const postId = `${currentUser.profileId}-${publicationId}`;
    const url = await getNodeUrlForPublication(metadata.mainContentFocus, postId);

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
                setAlarm().catch(console.error);
            } else {
                clearAlarm().catch(console.error);
            }
            return true;
        }

        if (req.getPublicationId) {
            pollForPublicationId(req.getPublicationId.txHash)
                .then(publicationId => {
                    res({publicationId});
                    return notifyOfPublishedPost(req.getPublicationId.metadata.mainContentFocus, publicationId);
                })
                .catch(error => res({error}));
            return true;
        }
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
});

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