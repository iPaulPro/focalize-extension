import type {Notification, PaginatedNotificationResult} from '../graph/lens-service';
import {NotificationTypes, type PaginatedResultInfo, type Profile} from '../graph/lens-service';
import {getOrRefreshAccessToken} from '../user/lens-auth';
import lensApi from '../lens-api';
import {getAvatarForLensHandle, getAvatarFromAddress, stripMarkdown, truncate} from '../utils/utils';
import type {LensNode} from '../publications/lens-nodes';
import {getNodeForPublicationMainFocus, getProfileUrl, getPublicationUrlFromNode} from '../publications/lens-nodes';

import type {User} from '../user/user';

import {KEY_NOTIFICATION_ITEMS_CACHE, KEY_NOTIFICATION_PAGE_INFO_CACHE} from '../stores/cache-store';

export const NOTIFICATIONS_QUERY_LIMIT = 50;

const cacheNotifications = async (notificationRes: PaginatedNotificationResult, prepend: boolean) => {
    console.log('cacheNotifications', notificationRes, prepend);
    const notifications = notificationRes.items as Notification[];
    if (notifications.length === 0) return;

    const storage = await chrome.storage.local.get([KEY_NOTIFICATION_ITEMS_CACHE, KEY_NOTIFICATION_PAGE_INFO_CACHE]);
    const notificationItemsCache = storage.notificationItemsCache || [];
    console.log('cacheNotifications: notificationItemsCache', notificationItemsCache);

    const newItems = notifications.filter((notification) => {
        return !notificationItemsCache.find((cached: Notification) => cached.notificationId === notification.notificationId);
    });
    console.log('cacheNotifications: newItems', newItems);

    if (newItems.length > 0) {
        let pageInfo: PaginatedResultInfo = storage.notificationPageInfoCache;

        if (!pageInfo) {
            // If we don't have a cache yet, we need to set the entire pageInfo object
            pageInfo = notificationRes.pageInfo;
        }
        // If we're prepending, we need to update only the prev cursor, and vice versa
        else if (prepend) {
            pageInfo.prev = notificationRes.pageInfo.prev;
        } else {
            pageInfo.next = notificationRes.pageInfo.next;
        }

        await chrome.storage.local.set({
            notificationPageInfoCache: pageInfo,
            notificationItemsCache: prepend ? [...newItems, ...notificationItemsCache] : [...notificationItemsCache, ...newItems],
        });
    }
};

export const getNotificationType = (notification: Notification): NotificationTypes => {
    switch (notification.__typename) {
        case 'NewFollowerNotification':
            return NotificationTypes.Followed;
        case 'NewCollectNotification':
            return notification.notificationId.includes('comment') ? NotificationTypes.CollectedComment : NotificationTypes.CollectedPost;
        case 'NewReactionNotification':
            return notification.notificationId.includes('comment') ? NotificationTypes.ReactionComment : NotificationTypes.ReactionPost;
        case 'NewCommentNotification':
            return notification.notificationId.includes('comment') ? NotificationTypes.CommentedComment : NotificationTypes.CollectedPost;
        case 'NewMentionNotification':
            return notification.notificationId.includes('comment') ? NotificationTypes.MentionComment : NotificationTypes.MentionPost;
        case 'NewMirrorNotification':
            return notification.notificationId.includes('comment') ? NotificationTypes.MirroredComment : NotificationTypes.MirroredPost;
        default:
            throw new Error(`Unknown notification type: ${notification.__typename}`);
    }
}

const getPaginatedNotificationResult = async (
    cursor?: any,
    limit: number = NOTIFICATIONS_QUERY_LIMIT,
): Promise<PaginatedNotificationResult | null> => {
    console.log('getPaginatedNotificationResult: cursor', cursor, 'limit', limit);
    let accessToken;
    try {
        accessToken = await getOrRefreshAccessToken();
    } catch (e) {
        console.error('getNotifications: Error getting access token', e);
        chrome.runtime.openOptionsPage();
        window?.close();
    }
    if (!accessToken) return null;

    const localStorage = await chrome.storage.local.get('currentUser');
    if (!localStorage.currentUser) return null;
    const user: User = localStorage.currentUser;

    const syncStorage = await chrome.storage.sync.get(
        ['notificationsForFollows', 'notificationsForMentions', 'notificationsForReactions',
            'notificationsForComments', 'notificationsForCollects', 'notificationsFiltered']
    );

    try {
        const {notifications} = await lensApi.notifications({
            request: {
                profileId: user.profileId,
                limit,
                highSignalFilter: syncStorage.notificationsFiltered === true,
                cursor
            },
            userProfileId: user.profileId
        });
        console.log('getPaginatedNotificationResult: notifications', notifications);

        if (notifications.__typename === 'PaginatedNotificationResult') {
            const notificationsRes = notifications as PaginatedNotificationResult;
            await cacheNotifications(notificationsRes, cursor && JSON.parse(cursor).cursorDirection === 'BEFORE');
            return notificationsRes;
        }
    } catch (e) {
        console.error('getNotifications: Error getting notifications', e);
        return null;
    }
    return null;
}

export const getLatestNotifications = async (
    filter: boolean = false
): Promise<{ notifications?: Notification[], cursor?: any }> => {
    const storage = await chrome.storage.local.get(
        [KEY_NOTIFICATION_PAGE_INFO_CACHE, KEY_NOTIFICATION_ITEMS_CACHE]
    );
    const pageInfo: PaginatedResultInfo = storage.notificationPageInfoCache;

    const notificationsRes: PaginatedNotificationResult | null = await getPaginatedNotificationResult(pageInfo?.prev);
    console.log('getNotifications: notifications result', notificationsRes);

    // If we don't have a cache yet there are no "latest" notifications
    if (!storage.notificationItemsCache || !notificationsRes?.items) {
        return {};
    }

    if (!filter) {
        return {
            notifications: notificationsRes.items,
            cursor: notificationsRes.pageInfo.prev,
        };
    }

    const syncStorage = await chrome.storage.sync.get(
        ['notificationsForFollows', 'notificationsForMentions', 'notificationsForReactions',
            'notificationsForComments', 'notificationsForCollects', 'notificationsFiltered']
    );

    const filteredNotifications: Notification[] = notificationsRes.items.filter((notification: Notification) => {
        const notificationType: NotificationTypes = getNotificationType(notification);
        switch (notificationType) {
            case NotificationTypes.Followed:
                return syncStorage.notificationsForFollows !== false;
            case NotificationTypes.ReactionPost:
            case NotificationTypes.ReactionComment:
                return syncStorage.notificationsForReactions !== false;
            case NotificationTypes.CollectedPost:
            case NotificationTypes.CollectedComment:
                return syncStorage.notificationsForCollects !== false;
            case NotificationTypes.CommentedPost:
            case NotificationTypes.CommentedComment:
                return syncStorage.notificationsForComments !== false;
            case NotificationTypes.MentionPost:
            case NotificationTypes.MentionComment:
                return syncStorage.notificationsForMentions !== false;
            case NotificationTypes.MirroredPost:
            case NotificationTypes.MirroredComment:
                return syncStorage.notificationsForMirrors !== false;
            default:
                return false;
        }
    });

    return {
        notifications: filteredNotifications,
        cursor: notificationsRes.pageInfo.prev
    };
}

export const getNextNotifications = async (): Promise<{ notifications?: Notification[], cursor?: any }> => {
    const storage = await chrome.storage.local.get([KEY_NOTIFICATION_PAGE_INFO_CACHE]);
    const pageInfo: PaginatedResultInfo = storage.notificationPageInfoCache;
    const notifications = await getPaginatedNotificationResult(pageInfo?.next);
    console.log('getNotifications: notifications', notifications);
    if (notifications?.items) {
        return {
            notifications: notifications.items as Notification[],
            cursor: notifications.pageInfo.next
        };
    }
    return {};
}

/**
 * Returns the profile of the user that triggered the notification
 */
export const getNotificationProfile = (notification: Notification): Profile | null | undefined => {
    switch (notification.__typename) {
        case 'NewCollectNotification':
        case 'NewFollowerNotification':
            return notification.wallet.defaultProfile;
        case 'NewMentionNotification':
            return notification.mentionPublication.profile;
        case 'NewCommentNotification':
        case 'NewReactionNotification':
        case 'NewMirrorNotification':
            return notification.profile;
    }
    return null;
}

export const getNotificationWalletAddress = (notification: Notification): string => {
    switch (notification.__typename) {
        case 'NewCollectNotification':
        case 'NewFollowerNotification':
            return notification.wallet.address;
        case 'NewMentionNotification':
            return notification.mentionPublication.profile.ownedBy;
        case 'NewCommentNotification':
        case 'NewReactionNotification':
        case 'NewMirrorNotification':
            return notification.profile.ownedBy;
    }
    throw new Error('Unknown notification type');
}

export const getAvatarFromNotification = (notification: Notification): string | null => {
    if (notification.notificationId === 'followed-0x1e904dB986C7223bFE75083e84A8800956574504-0x46ed') {
        console.log('getAvatarFromNotification: notification', notification);
    }
    const profile = getNotificationProfile(notification);
    if (notification.notificationId === 'followed-0x1e904dB986C7223bFE75083e84A8800956574504-0x46ed') {
        console.log('getAvatarFromNotification: profile', profile);
    }
    if (profile) {
        if (notification.notificationId === 'followed-0x1e904dB986C7223bFE75083e84A8800956574504-0x46ed') {
            console.log('getAvatarFromNotification: avatar', getAvatarForLensHandle(profile.handle));
        }
        return getAvatarForLensHandle(profile.handle);
    }

    const wallet = getNotificationWalletAddress(notification);
    return getAvatarFromAddress(wallet);
};

/**
 * Returns a human-readable action for the notification
 */
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
    return getNotificationProfile(notification)?.handle?.split('.')?.[0] ?? getNotificationWalletAddress(notification);
};

export const getNotificationDisplayName = (notification: Notification): string => {
    return getNotificationProfile(notification)?.name ?? '';
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
            return truncate(contentStripped, 250) ?? notification.mentionPublication.metadata.name;
        }
        case 'NewCommentNotification': {
            const content = notification.comment.metadata?.content;
            const contentStripped = stripMarkdown(content);
            return truncate(contentStripped, 250) ?? notification.comment.commentOn?.metadata?.name;
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

    const syncStorage = await chrome.storage.sync.get('nodeNotifications');
    return syncStorage.nodeNotifications.baseUrl + syncStorage.nodeNotifications.notifications;
};