import {NotificationTypes} from "./graph/lens-service";
import {getOrRefreshAccessToken} from "./lens-auth";
import gqlClient from "./graph/graphql-client";
import {getAvatarFromProfile, truncate, stripMarkdown} from "./utils";
import {getNodeForPublicationMainFocus, getProfileUrl, getPublicationUrlFromNode} from "./lens-nodes";

import type {User} from "./user";
import type {Notification, PaginatedNotificationResult} from "./graph/lens-service";
import type {LensNode} from "./lens-nodes";

import {KEY_NOTIFICATION_ITEMS_CACHE} from "./stores/cache-store";

export const NOTIFICATIONS_QUERY_LIMIT = 50;

const cacheNotifications = async (notificationRes: PaginatedNotificationResult) => {
    console.log('cacheNotifications: Caching notifications', notificationRes);
    const notifications = notificationRes.items as Notification[];
    if (notifications.length === 0) return;

    const storage = await chrome.storage.local.get(KEY_NOTIFICATION_ITEMS_CACHE);
    const notificationItemsCache = storage.notificationItemsCache || [];
    console.log('cacheNotifications: notificationItemsCache', notificationItemsCache);

    const newItems = notifications.filter((notification) => {
        return !notificationItemsCache.find((cached: Notification) => cached.notificationId === notification.notificationId);
    });
    console.log('cacheNotifications: newItems', newItems);
    if (newItems.length > 0) {
        await chrome.storage.local.set({
            notificationItemsCache: [...notificationItemsCache, ...newItems],
            notificationPageInfoCache: notificationRes.pageInfo,
        });
    }
};

export const getPaginatedNotificationResult = async (
    cursor?: any,
    limit: number = NOTIFICATIONS_QUERY_LIMIT,
    filter: boolean = false
): Promise<PaginatedNotificationResult | null> => {
    let accessToken;
    try {
        accessToken = await getOrRefreshAccessToken();
    } catch (e) {
        console.error('getNotifications: Error getting access token', e);
    }
    if (!accessToken) return null;

    const localStorage = await chrome.storage.local.get('currentUser');
    if (!localStorage.currentUser) return null;
    const user: User = localStorage.currentUser;

    const syncStorage = await chrome.storage.sync.get(
        ['notificationsForFollows', 'notificationsForMentions', 'notificationsForReactions',
            'notificationsForComments', 'notificationsForCollects', 'notificationsFiltered']
    );

    let notificationTypes: NotificationTypes[] | undefined;
    if (filter) {
        notificationTypes = [];

        if (syncStorage.notificationsForFollows !== false) {
            notificationTypes.push(NotificationTypes.Followed);
        }
        if (syncStorage.notificationsForReactions !== false) {
            notificationTypes.push(NotificationTypes.ReactionPost, NotificationTypes.ReactionComment);
        }
        if (syncStorage.notificationsForCollects !== false) {
            notificationTypes.push(NotificationTypes.CollectedPost, NotificationTypes.CollectedComment);
        }
        if (syncStorage.notificationsForComments !== false) {
            notificationTypes.push(NotificationTypes.CommentedPost, NotificationTypes.CommentedComment);
        }
        if (syncStorage.notificationsForMentions !== false) {
            notificationTypes.push(NotificationTypes.MentionPost, NotificationTypes.MentionComment);
        }
        if (syncStorage.notificationsForMirrors !== false) {
            notificationTypes.push(NotificationTypes.MirroredPost, NotificationTypes.MirroredComment);
        }

        if (notificationTypes.length === 0) return null;
    }

    try {
        const {notifications} = await gqlClient.Notifications({
            request: {
                profileId: user.profileId,
                limit,
                highSignalFilter: syncStorage.notificationsFiltered === true,
                notificationTypes,
                cursor
            },
        })
        console.log('getPaginatedNotificationResult: notifications', notifications);

        if (notifications.__typename === 'PaginatedNotificationResult') {
            const notificationsRes = notifications as PaginatedNotificationResult;
            await cacheNotifications(notificationsRes);
            return notificationsRes;
        }
    } catch (e) {
        return null;
    }
    return null;
}

export const getNotifications = async (): Promise<Notification[] | null> => {
    const notifications = await getPaginatedNotificationResult();
    console.log('getNotifications: notifications', notifications);
    if (notifications?.items) {
        return notifications.items as Notification[];
    }
    return null;
}

export const getAvatarFromNotification = (notification: Notification): string | null => {
    switch (notification.__typename) {
        case 'NewCollectNotification':
            return getAvatarFromProfile(notification.collectedPublication.profile);
        case 'NewFollowerNotification':
            const profile = notification.wallet.defaultProfile;
            if (profile) return getAvatarFromProfile(profile);
            return `https://cdn.stamp.fyi/avatar/${notification.wallet.address}?s=96`
        case 'NewMentionNotification':
            return getAvatarFromProfile(notification.mentionPublication.profile);
        case 'NewCommentNotification':
        case 'NewReactionNotification':
        case 'NewMirrorNotification':
            return getAvatarFromProfile(notification.profile);
    }
    return null;
};

export const getNotificationAction = (notification: Notification): string => {
    switch (notification.__typename) {
        case 'NewCollectNotification':
            return 'collected your post';
        case 'NewFollowerNotification':
            return notification.isFollowedByMe ? 'followed you back' : 'followed you';
        case 'NewMentionNotification':
            return 'mentioned you';
        case 'NewCommentNotification':
            return 'commented on your post';
        case 'NewReactionNotification':
            const publicationType = notification.notificationId.startsWith('reaction_comment') ? 'comment' : 'post';
            return `liked your ${publicationType}`;
        case 'NewMirrorNotification':
            return 'mirrored your post';
    }
    return '';
};

export const getNotificationHandle = (notification: Notification): string => {
    switch (notification.__typename) {
        case 'NewCollectNotification':
            return notification.collectedPublication.profile.handle.replace('.lens', '');
        case 'NewFollowerNotification':
            return notification.wallet.defaultProfile?.handle.replace('.lens', '') || notification.wallet.address;
        case 'NewMentionNotification':
            return notification.mentionPublication.profile.handle.replace('.lens', '');
        case 'NewCommentNotification':
        case 'NewReactionNotification':
        case 'NewMirrorNotification':
            return notification.profile.handle.replace('.lens', '');
    }
    return '';
};

export const getNotificationContent = (notification: Notification): string | undefined | null => {
    switch (notification.__typename) {
        case 'NewCollectNotification': {
            const content = notification.collectedPublication.metadata.content;
            const contentStripped = stripMarkdown(content);
            return truncate(contentStripped, 45) ?? notification.collectedPublication.metadata.name;
        }
        case 'NewMentionNotification': {
            const content = notification.mentionPublication.metadata.content;
            const contentStripped = stripMarkdown(content);
            return truncate(contentStripped, 100) ?? notification.mentionPublication.metadata.name;
        }
        case 'NewCommentNotification': {
            const content = notification.comment.metadata?.content;
            const contentStripped = stripMarkdown(content);
            return truncate(contentStripped, 100) ?? notification.comment.commentOn?.metadata?.name;
        }
        case 'NewMirrorNotification':
        case 'NewReactionNotification': {
            const content = notification.publication.metadata.content;
            const contentStripped = stripMarkdown(content);
            return truncate(contentStripped, 45) ?? notification.publication.metadata.name;
        }
    }
    return undefined;
};

export const getNodeForNotification = async (notification: Notification): Promise<LensNode> => {
    const storage = await chrome.storage.sync.get(['nodePost'])
    switch (notification.__typename) {
        case 'NewCollectNotification':
            return await getNodeForPublicationMainFocus(notification.collectedPublication.metadata.mainContentFocus);
        case 'NewMentionNotification':
            return await getNodeForPublicationMainFocus(notification.mentionPublication.metadata.mainContentFocus);
        case 'NewCommentNotification':
            return await getNodeForPublicationMainFocus(notification.comment.metadata.mainContentFocus);
        case 'NewReactionNotification':
        case 'NewMirrorNotification':
            return await getNodeForPublicationMainFocus(notification.publication.metadata.mainContentFocus);
    }
    return storage.nodePost;
}

export const getNotificationLink = async (notification: Notification): Promise<string> => {
    const node = await getNodeForNotification(notification);
    switch (notification.__typename) {
        case 'NewCollectNotification':
            return getPublicationUrlFromNode(node, notification.collectedPublication.id);
        case 'NewFollowerNotification':
            return getProfileUrl(node, notification.wallet.defaultProfile?.handle);
        case 'NewMentionNotification':
            return getPublicationUrlFromNode(node, notification.mentionPublication.id);
        case 'NewCommentNotification':
            return getPublicationUrlFromNode(node, notification.comment.id);
        case 'NewReactionNotification':
        case 'NewMirrorNotification':
            return getPublicationUrlFromNode(node, notification.publication.id);
    }
    return '';
}