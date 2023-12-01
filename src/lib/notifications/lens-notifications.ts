import {
    getAvatarForLensHandle,
    getAvatarFromAddress,
    stripMarkdown,
    truncate,
} from '../utils/utils';
import {
    type LensNode,
    getNodeForPublication,
    getNodeUrlForHandle,
    getPublicationUrlFromNode,
} from '../publications/lens-nodes';
import {
    KEY_NOTIFICATION_ITEMS_CACHE,
    KEY_NOTIFICATION_PAGE_INFO_CACHE,
} from '../stores/cache-store';
import { getNotifications, isAuthenticated } from '../lens-service';
import type {
    NotificationFragment,
    PaginatedResult,
    ProfileFragment,
    PaginatedResultInfoFragment,
} from '@lens-protocol/client';
import {
    formatHandleV2toV1,
    getMetadataContent,
    getNotificationPublication,
} from '../utils/lens-utils';
import {
    isCommentPublication,
    type ActedNotificationFragment,
    type FollowNotificationFragment,
    type ReactionNotificationFragment,
} from '@lens-protocol/client';

export const NOTIFICATIONS_QUERY_LIMIT = 50;

export type BatchedNotification =
    | ActedNotificationFragment
    | FollowNotificationFragment
    | ReactionNotificationFragment;

const cacheNotifications = async (
    notificationRes: PaginatedResult<NotificationFragment>,
    prepend: boolean
) => {
    console.log('cacheNotifications', notificationRes, prepend);
    const notifications = notificationRes.items;
    if (notifications.length === 0) return;

    const storage = await chrome.storage.local.get([
        KEY_NOTIFICATION_ITEMS_CACHE,
        KEY_NOTIFICATION_PAGE_INFO_CACHE,
    ]);
    const notificationItemsCache = storage[KEY_NOTIFICATION_ITEMS_CACHE] || [];
    console.log(
        'cacheNotifications: notificationItemsCache',
        notificationItemsCache
    );
    const cachedIds = new Set(
        notificationItemsCache.map((item: { id: string }) => item.id)
    );

    const newItems = notifications.filter(
        (notification) => !cachedIds.has(notification.id)
    );
    console.log('cacheNotifications: newItems', newItems);

    if (newItems.length > 0) {
        let pageInfo: PaginatedResultInfoFragment =
            storage[KEY_NOTIFICATION_PAGE_INFO_CACHE];

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
            [KEY_NOTIFICATION_PAGE_INFO_CACHE]: pageInfo,
            [KEY_NOTIFICATION_ITEMS_CACHE]: prepend
                ? [...newItems, ...notificationItemsCache]
                : [...notificationItemsCache, ...newItems],
        });
    }
};

const getPaginatedNotificationResult = async (
    cursor?: any,
    prepend: boolean = false
): Promise<PaginatedResult<NotificationFragment> | null> => {
    console.log('getPaginatedNotificationResult: cursor', cursor);

    let authenticated = await isAuthenticated();
    if (!authenticated) {
        console.warn('getNotifications: User not authenticated');
        chrome.runtime.openOptionsPage();
        window?.close();
        return null;
    }

    const syncStorage = await chrome.storage.sync.get([
        'notificationsFiltered',
    ]);

    try {
        const res = await getNotifications(
            cursor,
            syncStorage.notificationsFiltered === true
        );
        console.log('getPaginatedNotificationResult: get notifications', res);

        if (res) {
            await cacheNotifications(res, prepend);
            return res;
        }
    } catch (e) {
        console.error('getNotifications: Error getting notifications', e);
        return null;
    }
    return null;
};

export const getLatestNotifications = async (
    filter: boolean = false
): Promise<{ notifications?: NotificationFragment[]; cursor?: any }> => {
    const storage = await chrome.storage.local.get([
        KEY_NOTIFICATION_PAGE_INFO_CACHE,
        KEY_NOTIFICATION_ITEMS_CACHE,
    ]);
    const pageInfo: PaginatedResultInfoFragment =
        storage[KEY_NOTIFICATION_PAGE_INFO_CACHE];

    const notificationsRes: PaginatedResult<NotificationFragment> | null =
        await getPaginatedNotificationResult(pageInfo?.prev, true);
    console.log('getNotifications: notifications result', notificationsRes);

    // If we don't have a cache yet there are no "latest" notifications
    if (!storage[KEY_NOTIFICATION_ITEMS_CACHE] || !notificationsRes?.items) {
        return {};
    }

    if (!filter) {
        return {
            notifications: notificationsRes.items,
            cursor: notificationsRes.pageInfo.prev,
        };
    }

    const syncStorage = await chrome.storage.sync.get([
        'notificationsForFollows',
        'notificationsForMentions',
        'notificationsForReactions',
        'notificationsForMirrors',
        'notificationsForComments',
        'notificationsForCollects',
        'notificationsForQuotes',
        'notificationsFiltered',
    ]);

    const filteredNotifications: NotificationFragment[] =
        notificationsRes.items.filter((notification: NotificationFragment) => {
            switch (notification.__typename) {
                case 'FollowNotification':
                    return syncStorage.notificationsForFollows !== false;
                case 'ReactionNotification':
                    return syncStorage.notificationsForReactions !== false;
                case 'ActedNotification':
                    return syncStorage.notificationsForCollects !== false;
                case 'CommentNotification':
                    return syncStorage.notificationsForComments !== false;
                case 'MentionNotification':
                    return syncStorage.notificationsForMentions !== false;
                case 'MirrorNotification':
                    return syncStorage.notificationsForMirrors !== false;
                case 'QuoteNotification':
                    return syncStorage.notificationsForQuotes !== false;
                default:
                    return false;
            }
        });

    return {
        notifications: filteredNotifications,
        cursor: notificationsRes.pageInfo.prev,
    };
};

export const getNextNotifications = async (): Promise<{
    notifications?: NotificationFragment[];
    cursor?: any;
}> => {
    const storage = await chrome.storage.local.get([
        KEY_NOTIFICATION_PAGE_INFO_CACHE,
    ]);
    const pageInfo: PaginatedResultInfoFragment =
        storage[KEY_NOTIFICATION_PAGE_INFO_CACHE];
    const notifications = await getPaginatedNotificationResult(pageInfo?.next);
    console.log('getNotifications: notifications', notifications);
    if (notifications?.items) {
        return {
            notifications: notifications.items as NotificationFragment[],
            cursor: notifications.pageInfo.next,
        };
    }
    return {};
};

/**
 * Returns the profile of the user that triggered the notification
 */
export const getNotificationProfile = (
    notification: NotificationFragment
): ProfileFragment => {
    switch (notification.__typename) {
        case 'ReactionNotification':
            return notification.reactions[0].profile;
        case 'CommentNotification':
            return notification.comment.by;
        case 'MirrorNotification':
            return notification.mirrors[0].profile;
        case 'ActedNotification':
            return notification.actions[0].by;
        case 'MentionNotification':
            return notification.publication.by;
        case 'QuoteNotification':
            return notification.quote.by;
        case 'FollowNotification':
            return notification.followers[0];
    }
};

export const getNotificationWalletAddress = (
    notification: NotificationFragment
): string => {
    switch (notification.__typename) {
        case 'ReactionNotification':
            return notification.reactions[0].profile.ownedBy.address;
        case 'CommentNotification':
            return notification.comment.by.ownedBy.address;
        case 'QuoteNotification':
            return notification.quote.by.ownedBy.address;
        case 'MirrorNotification':
            return notification.mirrors[0].profile.ownedBy.address;
        case 'ActedNotification':
            return notification.actions[0].by.ownedBy.address;
        case 'MentionNotification':
            return notification.publication.by.ownedBy.address;
        case 'FollowNotification':
            return notification.followers[0].ownedBy.address;
    }
};

export const getAvatarFromNotification = (
    notification: NotificationFragment
): string | null => {
    const profile = getNotificationProfile(notification);
    if (profile.handle) {
        return getAvatarForLensHandle(profile.handle.fullHandle);
    }

    const wallet = getNotificationWalletAddress(notification);
    return getAvatarFromAddress(wallet);
};

/**
 * Returns a human-readable action for the notification
 */
export const getNotificationAction = (
    notification: NotificationFragment
): string => {
    console.log('getNotificationAction', notification.__typename);
    switch (notification.__typename) {
        case 'ActedNotification':
            return (
                'collected your ' +
                (isCommentPublication(notification.publication)
                    ? 'comment'
                    : 'post')
            );
        case 'FollowNotification':
            return notification.followers[0].operations.isFollowedByMe.value
                ? 'followed you back'
                : 'followed you';
        case 'MentionNotification':
            return 'mentioned you';
        case 'CommentNotification':
            return (
                'commented on your ' +
                (isCommentPublication(notification.comment.commentOn)
                    ? 'comment'
                    : 'post')
            );
        case 'ReactionNotification':
            return (
                'liked your ' +
                (isCommentPublication(notification.publication)
                    ? 'comment'
                    : 'post')
            );
        case 'MirrorNotification':
            return (
                'mirrored your ' +
                (isCommentPublication(notification.publication)
                    ? 'comment'
                    : 'post')
            );
        case 'QuoteNotification':
            return (
                'quoted your ' +
                (isCommentPublication(notification.quote.quoteOn)
                    ? 'comment'
                    : 'post')
            );
    }
};

export const getNotificationHandle = (
    notification: NotificationFragment
): string => {
    const handle = getNotificationProfile(notification)?.handle;
    return handle
        ? formatHandleV2toV1(handle.fullHandle)
        : getNotificationWalletAddress(notification);
};

export const getNotificationDisplayName = (
    notification: NotificationFragment
): string => {
    return getNotificationProfile(notification)?.metadata?.displayName ?? '';
};

export const getNotificationContent = (
    notification: NotificationFragment
): string | undefined | null => {
    const publication = getNotificationPublication(notification);

    if (publication) {
        const content = getMetadataContent(publication);
        if (content) {
            const contentStripped = stripMarkdown(content);
            return (
                truncate(contentStripped, 45) ??
                publication.metadata.marketplace?.name
            );
        }
    }

    return undefined;
};

export const getNodeForNotification = async (
    notification: NotificationFragment
): Promise<LensNode> => {
    const publication = getNotificationPublication(notification);

    if (!publication) {
        const storage = await chrome.storage.sync.get(['nodePost']);
        return storage.nodePost;
    }

    return getNodeForPublication(publication);
};

export const getNotificationLink = async (
    notification: NotificationFragment
): Promise<string> => {
    const node = await getNodeForNotification(notification);

    switch (notification.__typename) {
        case 'FollowNotification':
            const handle = notification.followers[0].handle;
            if (handle) {
                return getNodeUrlForHandle(node, handle);
            }
            break;
        case 'CommentNotification':
            return getPublicationUrlFromNode(node, notification.comment.id);
        case 'QuoteNotification':
            return getPublicationUrlFromNode(node, notification.quote.id);
        case 'MentionNotification':
        case 'ReactionNotification':
        case 'ActedNotification':
        case 'MirrorNotification':
            return getPublicationUrlFromNode(node, notification.publication.id);
    }

    const syncStorage = await chrome.storage.sync.get('nodeNotifications');
    return (
        syncStorage.nodeNotifications.baseUrl +
        syncStorage.nodeNotifications.notifications
    );
};

export const getEventTime = (
    notification: NotificationFragment
): string | undefined => {
    switch (notification.__typename) {
        case 'CommentNotification':
            return notification.comment.createdAt;
        case 'MentionNotification':
            return notification.publication.createdAt;
        case 'ReactionNotification':
            return notification.reactions[0].reactions[0].reactedAt;
        case 'ActedNotification':
            return notification.actions[0].actedAt;
        case 'MirrorNotification':
            return notification.mirrors[0].mirroredAt;
        case 'QuoteNotification':
            return notification.quote.createdAt;
    }
    return undefined;
};

export const isBatchedNotification = (
    notification: NotificationFragment
): notification is BatchedNotification => {
    switch (notification.__typename) {
        case 'FollowNotification':
        case 'ReactionNotification':
        case 'ActedNotification':
            return true;
        default:
            return false;
    }
};

export const getBatchedNotificationCount = (
    notification: BatchedNotification
): number => {
    switch (notification.__typename) {
        case 'FollowNotification':
            return notification.followers.length;
        case 'ReactionNotification':
            return notification.reactions[0].reactions.length;
        case 'ActedNotification':
            return notification.actions.length;
    }
};
