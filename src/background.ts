import {DateTime} from 'luxon';

import {getOrRefreshAccessToken} from './lib/lens-auth';
import {pollForPublicationId} from './lib/has-transaction-been-indexed';

import gqlClient from "./lib/graph/graphql-client";
import {NotificationTypes, SearchRequestTypes} from "./lib/graph/lens-service";

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
} from "./lib/graph/lens-service";
import type {User} from "./lib/user";
import type {LensNode} from "./lib/lens-nodes";
import {getAvatarFromProfile, truncate, stripMarkdown} from "./lib/utils";
import type {PublicationState} from "./lib/stores/state-store";
import {getPublicationUrl, getProfileUrl, getPublicationUrlFromNode} from "./lib/lens-nodes";
import {getLatestNotifications, NOTIFICATIONS_QUERY_LIMIT} from "./lib/lens-notifications";

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

const createReactionNotification = (notification: NewReactionNotification, currentUser: User, node: LensNode) => {
    const reactionProfile = notification.profile;
    if (!reactionProfile || notification.reaction !== 'UPVOTE') return;
    const reactionAvatarUrl = getAvatarFromProfile(reactionProfile);
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
            message: truncate(contentStripped, 25) ?? notification.publication.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: reactionAvatarUrl
        }
    );
};

const createMirrorNotification = (notification: NewMirrorNotification, currentUser: User, node: LensNode) => {
    const mirrorProfile = notification.profile;
    if (!mirrorProfile) return;
    const mirrorAvatarUrl = getAvatarFromProfile(mirrorProfile);
    const content = notification.publication.metadata.content;
    const contentStripped = stripMarkdown(content);
    const notificationId = getPublicationUrlFromNode(node, notification.publication.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: `@${mirrorProfile.handle.replace('.lens', '')} mirrored your post`,
            message: truncate(contentStripped, 25) ?? notification.publication.metadata.name ?? `@${currentUser.handle}`,
            contextMessage: 'Focalize',
            iconUrl: mirrorAvatarUrl
        }
    );
};

const createFollowerNotification = (notification: NewFollowerNotification, currentUser: User, node: LensNode) => {
    const followerProfile = notification.wallet.defaultProfile;
    if (!followerProfile) return;
    const followerAvatarUrl = getAvatarFromProfile(followerProfile);
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
    const mentionAvatarUrl = getAvatarFromProfile(mentionProfile);
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
    const commentAvatarUrl = getAvatarFromProfile(commentProfile);
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
    const collectProfile = notification.wallet.defaultProfile;
    if (!collectProfile) return;
    const collectAvatarUrl = getAvatarFromProfile(collectProfile);
    const content = notification.collectedPublication.metadata.content;
    const contentStripped = stripMarkdown(content);
    const notificationId = getPublicationUrlFromNode(node, notification.collectedPublication.id);

    chrome.notifications.create(
        notificationId,
        {
            type: 'basic',
            eventTime: DateTime.fromISO(notification.createdAt).toMillis(),
            title: `@${collectProfile.handle.replace('.lens', '')} collected your post`,
            message: truncate(contentStripped, 25) ?? notification.collectedPublication.metadata.name ?? `@${currentUser.handle}`,
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

    const latestNotifications = await getLatestNotifications(true);
    console.log('onAlarmTriggered: notifications', latestNotifications);
    if (!latestNotifications.notifications) {
        await updateNotificationsTimestamp();
        return;
    }

    const syncStorage = await chrome.storage.sync.get(
        ['notificationsTimestamp', 'notificationsGrouped', 'nodeNotifications']
    );
    const lastUpdateDate = syncStorage.notificationsTimestamp ? DateTime.fromISO(syncStorage.notificationsTimestamp) : null;

    let notifications: Notification[] = latestNotifications.notifications;
    console.log(`onAlarmTriggered: ${notifications.length} new notifications ${lastUpdateDate ? 'since last update at ' + lastUpdateDate.toLocaleString(DateTime.TIME_SIMPLE) : ''}`);

    await updateNotificationsTimestamp();

    if (notifications.length === 0) {
        return;
    }

    if (syncStorage.notificationsGrouped) {
        createGroupNotification(notifications, currentUser);
        return;
    }

    for (const notification of notifications) {
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