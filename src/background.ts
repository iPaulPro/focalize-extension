import {DateTime} from 'luxon';

import {getOrRefreshAccessToken} from './lib/lens-auth';
import {pollForPublicationId} from './lib/has-transaction-been-indexed';

import gqlClient from "./graph/graphql-client";
import {NotificationTypes, SearchRequestTypes} from "./graph/lens-service";

import type {
    PublicationMetadataV2Input,
    Profile,
    Notification,
    NewFollowerNotification,
    NewMirrorNotification,
    NewMentionNotification,
    NewCommentNotification,
    NewReactionNotification,
    NewCollectNotification,
} from "./graph/lens-service";
import type {User} from "./lib/user";
import type {LensNode} from "./lib/lens-nodes";
import {getAvatar, limitString, stripMarkdown} from "./lib/utils";
import type {PublicationState} from "./lib/store/state-store";
import {getPublicationUrl, getProfileUrl, getPublicationUrlFromNode} from "./lib/lens-nodes";

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

    const localStorage = await chrome.storage.local.get('currentUser');
    if (!localStorage.currentUser) return undefined;
    const user: User = localStorage.currentUser;

    const notificationTypes: NotificationTypes[] = [];
    const syncStorage = await chrome.storage.sync.get(
        ['notificationsForFollows', 'notificationsForMentions', 'notificationsForReactions', 'notificationsForComments', 'notificationsForCollects']
    );
    if (syncStorage.notificationsForFollows) notificationTypes.push(NotificationTypes.Followed);
    if (syncStorage.notificationsForReactions) notificationTypes.push(NotificationTypes.ReactionPost, NotificationTypes.ReactionComment);
    if (syncStorage.notificationsForCollects) notificationTypes.push(NotificationTypes.CollectedPost, NotificationTypes.CollectedComment);
    if (syncStorage.notificationsForComments) notificationTypes.push(NotificationTypes.CommentedPost, NotificationTypes.CommentedComment);
    if (syncStorage.notificationsForMentions) notificationTypes.push(NotificationTypes.MentionPost, NotificationTypes.MentionPost);
    if (syncStorage.notificationsForMirrors) notificationTypes.push(NotificationTypes.MirroredPost, NotificationTypes.MirroredComment);

    if (notificationTypes.length === 0) return undefined;

    try {
        const {notifications} = await gqlClient.Notifications({
            request: {
                profileId: user.profileId,
                limit: NOTIFICATIONS_QUERY_LIMIT,
                notificationTypes
            }
        })

        if (notifications.items) {
            return notifications.items as Notification[];
        }
    } catch (e) {
        return [];
    }

    return [];
}

const createReactionNotification = (notification: NewReactionNotification, currentUser: User, node: LensNode) => {
    const reactionProfile = notification.profile;
    if (!reactionProfile || notification.reaction !== 'UPVOTE') return;
    const reactionAvatarUrl = getAvatar(reactionProfile);
    const content = notification.publication.metadata.content;
    const contentStripped = stripMarkdown(content);
    const publicationType = notification.notificationId.startsWith('reaction_comment') ? 'comment' : 'post';
    const notificationId = getPublicationUrlFromNode(node, notification.publication.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: `@${reactionProfile.handle.replace('.lens', '')} liked your ${publicationType}`,
            message: limitString(contentStripped, 25) ?? notification.publication.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: reactionAvatarUrl
        }
    );
};

const createMirrorNotification = (notification: NewMirrorNotification, currentUser: User, node: LensNode) => {
    const mirrorProfile = notification.profile;
    if (!mirrorProfile) return;
    const mirrorAvatarUrl = getAvatar(mirrorProfile);
    const content = notification.publication.metadata.content;
    const contentStripped = stripMarkdown(content);
    const notificationId = getPublicationUrlFromNode(node, notification.publication.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: `@${mirrorProfile.handle.replace('.lens', '')} mirrored your post`,
            message: limitString(contentStripped, 25) ?? notification.publication.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: mirrorAvatarUrl
        }
    );
};

const createFollowerNotification = (notification: NewFollowerNotification, currentUser: User, node: LensNode) => {
    const followerProfile = notification.wallet.defaultProfile;
    if (!followerProfile) return;
    const followerAvatarUrl = getAvatar(followerProfile);
    const notificationId = getProfileUrl(node, followerProfile.handle);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: `@${followerProfile.handle.replace('.lens', '')} followed you`,
            message: `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: followerAvatarUrl,
            buttons: [
                {
                    title: 'Follow back',
                }
            ]
        }
    );
};

const createMentionNotification = (notification: NewMentionNotification, currentUser: User, node: LensNode) => {
    const mentionProfile = notification.mentionPublication.profile;
    if (!mentionProfile) return;
    const mentionAvatarUrl = getAvatar(mentionProfile);
    const content = notification.mentionPublication.metadata.content;
    const contentStripped = stripMarkdown(content);
    const notificationId = getPublicationUrlFromNode(node, notification.mentionPublication.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            requireInteraction: true,
            title: `@${mentionProfile.handle.replace('.lens', '')} mentioned you`,
            message: contentStripped ?? notification.mentionPublication.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: mentionAvatarUrl
        }
    );
};

const createCommentNotification = (notification: NewCommentNotification, currentUser: User, node: LensNode) => {
    const commentProfile = notification.profile;
    if (!commentProfile) return;
    const commentAvatarUrl = getAvatar(commentProfile);
    const content = notification.comment.metadata?.content;
    const contentStripped = stripMarkdown(content);
    const notificationId = getPublicationUrlFromNode(node, notification.comment.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            requireInteraction: true,
            title: `@${commentProfile.handle.replace('.lens', '')} commented on your post`,
            message: contentStripped ?? notification.comment.commentOn?.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: commentAvatarUrl
        }
    );
};

const createCollectNotification = (notification: NewCollectNotification, currentUser: User, node: LensNode) => {
    const collectProfile = notification.collectedPublication.profile;
    if (!collectProfile) return;
    const collectAvatarUrl = getAvatar(collectProfile);
    const content = notification.collectedPublication.metadata.content;
    const contentStripped = stripMarkdown(content);
    const notificationId = getPublicationUrlFromNode(node, notification.collectedPublication.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: `@${collectProfile.handle.replace('.lens', '')} collected your post`,
            message: limitString(contentStripped, 25) ?? notification.collectedPublication.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: collectAvatarUrl
        }
    );
};

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

const onAlarmTriggered = async () => {
    console.log(`onAlarmTriggered called`)

    const localStorage = await chrome.storage.local.get('currentUser');
    const currentUser: User = localStorage.currentUser;
    if (!currentUser) return;

    const notifications = await getNotifications();
    if (!notifications) return;
    console.log('onAlarmTriggered: notifications', notifications);

    const syncStorage = await chrome.storage.sync.get(
        ['notificationsTimestamp', 'notificationsGrouped', 'nodeNotifications']
    );
    const lastUpdateDate = syncStorage.notificationsTimestamp ? DateTime.fromISO(syncStorage.notificationsTimestamp) : null;

    let newNotifications: Notification[] = [];
    if (lastUpdateDate) {
        newNotifications = notifications.filter(notification =>
            DateTime.fromISO(notification.createdAt) > lastUpdateDate
        );
        console.log(`onAlarmTriggered: ${newNotifications.length} notifications since last update at ${lastUpdateDate.toLocaleString(DateTime.TIME_SIMPLE)}`);
    }

    await updateNotificationsTimestamp();

    if (newNotifications.length === 0) {
        return;
    }

    if (syncStorage.notificationsGrouped) {
        createGroupNotification(newNotifications, currentUser);
        return;
    }

    for (const notification of newNotifications) {
        switch (notification.__typename) {
            case 'NewCollectNotification':
                createCollectNotification(notification, currentUser, syncStorage.nodeNotifications);
                break;
            case 'NewCommentNotification':
                createCommentNotification(notification, currentUser, syncStorage.nodeNotifications);
                break;
            case 'NewFollowerNotification':
                createFollowerNotification(notification, currentUser, syncStorage.nodeNotifications);
                break;
            case 'NewMentionNotification':
                createMentionNotification(notification, currentUser, syncStorage.nodeNotifications);
                break;
            case 'NewMirrorNotification':
                createMirrorNotification(notification, currentUser, syncStorage.nodeNotifications);
                break;
            case 'NewReactionNotification':
                createReactionNotification(notification, currentUser, syncStorage.nodeNotifications);
                break;
        }
    }
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
    if (notificationId.startsWith('http')) {
        chrome.notifications.clear(notificationId);
        await chrome.tabs.create({url: notificationId});
        return;
    }

    chrome.notifications.clear(notificationId);
    await launchNotifications();
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

    chrome.windows.create({
        url: url.toString(),
        focused: true,
        type: 'popup',
        width: compactMode ? 672 : 768,
        height: compactMode ? 396 : 600
    }).catch(console.error);
}

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