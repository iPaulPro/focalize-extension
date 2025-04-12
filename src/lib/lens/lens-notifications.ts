import { stripMarkdown, truncate } from '../utils/utils';
import { getNodeForPost, getNodeUrlForUsername, getPostUrlFromNode } from './lens-nodes';
import {
    KEY_NOTIFICATION_ITEMS_CACHE,
    KEY_NOTIFICATION_PAGE_INFO_CACHE,
} from '../stores/cache-store';
import { getNotifications, isAuthenticated } from '../lens-service';
import { getMetadataContent, getAccountAvatar } from '../utils/lens-utils';
import {
    Account,
    DateTime,
    Notification,
    Paginated,
    PaginatedResultInfo,
    type FollowNotification,
    type ReactionNotification,
    type ReferencedPost,
    type PostActionExecutedNotification,
    type AccountActionExecutedNotification,
    type GroupMembershipRequestApprovedNotification,
    type GroupMembershipRequestRejectedNotification,
    type SimpleCollectPostActionExecuted,
    type TippingAccountActionExecuted,
    type TippingPostActionExecuted,
    type UnknownAccountActionExecuted,
    type UnknownPostActionExecuted,
    type CommentNotification,
    type QuoteNotification,
    type MentionNotification,
    type RepostNotification,
} from '@lens-protocol/client';
import { LensNode } from '@/lib/types/LensNode';
import {
    KEY_NODE_GROUP,
    KEY_NODE_NOTIFICATIONS,
    KEY_NODE_POST,
    KEY_NOTIFICATIONS_FILTERED,
    KEY_NOTIFICATIONS_FOR_POST_ACTIONS,
    KEY_NOTIFICATIONS_FOR_COMMENTS,
    KEY_NOTIFICATIONS_FOR_FOLLOWS,
    KEY_NOTIFICATIONS_FOR_MENTIONS,
    KEY_NOTIFICATIONS_FOR_MIRRORS,
    KEY_NOTIFICATIONS_FOR_QUOTES,
    KEY_NOTIFICATIONS_FOR_REACTIONS,
    KEY_NOTIFICATIONS_FOR_ACCOUNT_ACTIONS,
    KEY_NOTIFICATIONS_FOR_GROUPS,
} from '@/lib/stores/preferences-store';
import { onError } from '@/lib/utils/error-utils';
import { browser } from 'wxt/browser/chrome';

export const NOTIFICATIONS_QUERY_LIMIT = 50;

export type KnownNotification =
    | CommentNotification
    | MentionNotification
    | RepostNotification
    | QuoteNotification
    | FollowNotification
    | ReactionNotification
    | PostActionExecutedNotification
    | AccountActionExecutedNotification
    | GroupMembershipRequestApprovedNotification
    | GroupMembershipRequestRejectedNotification;

export type BatchedNotification =
    | FollowNotification
    | ReactionNotification
    | PostActionExecutedNotification
    | AccountActionExecutedNotification;

export type ActionNotification = AccountActionExecutedNotification | PostActionExecutedNotification;

export type GroupNotification =
    | GroupMembershipRequestApprovedNotification
    | GroupMembershipRequestRejectedNotification;

export type KnownAction =
    | SimpleCollectPostActionExecuted
    | TippingAccountActionExecuted
    | TippingPostActionExecuted
    | UnknownAccountActionExecuted
    | UnknownPostActionExecuted;

export const isKnownNotification = (notification: any): notification is KnownNotification =>
    notification.__typename === 'CommentNotification' ||
    notification.__typename === 'MentionNotification' ||
    notification.__typename === 'RepostNotification' ||
    notification.__typename === 'QuoteNotification' ||
    notification.__typename === 'FollowNotification' ||
    notification.__typename === 'ReactionNotification' ||
    notification.__typename === 'PostActionExecutedNotification' ||
    notification.__typename === 'AccountActionExecutedNotification' ||
    notification.__typename === 'GroupMembershipRequestApprovedNotification' ||
    notification.__typename === 'GroupMembershipRequestRejectedNotification';

export const isBatchedNotification = (
    notification: Notification,
): notification is BatchedNotification =>
    (notification.__typename === 'FollowNotification' && notification.followers.length > 1) ||
    (notification.__typename === 'ReactionNotification' && notification.reactions.length > 1) ||
    (notification.__typename === 'PostActionExecutedNotification' &&
        notification.actions.length > 1) ||
    (notification.__typename === 'AccountActionExecutedNotification' &&
        notification.actions.length > 1);

export const isActionNotification = (
    notification: Notification,
): notification is ActionNotification =>
    notification.__typename === 'PostActionExecutedNotification' ||
    notification.__typename === 'AccountActionExecutedNotification';

export const isMentionNotification = (
    notification: Notification,
): notification is MentionNotification => notification.__typename === 'MentionNotification';

export const isCommentNotification = (
    notification: Notification,
): notification is CommentNotification => notification.__typename === 'CommentNotification';

export const isReactionNotification = (
    notification: Notification,
): notification is ReactionNotification => notification.__typename === 'ReactionNotification';

export const isGroupNotification = (
    notification: Notification,
): notification is GroupNotification =>
    notification.__typename === 'GroupMembershipRequestApprovedNotification' ||
    notification.__typename === 'GroupMembershipRequestRejectedNotification';

export const isFollowNotification = (
    notification: Notification,
): notification is FollowNotification => notification.__typename === 'FollowNotification';

export const isKnownAction = (action: any): action is KnownAction =>
    action.__typename === 'SimpleCollectPostActionExecuted' ||
    action.__typename === 'TippingAccountActionExecuted' ||
    action.__typename === 'TippingPostActionExecuted' ||
    action.__typename === 'UnknownAccountActionExecuted' ||
    action.__typename === 'UnknownPostActionExecuted';

export const isGroupMembershipNotification = (
    notification: Notification,
): notification is
    | GroupMembershipRequestApprovedNotification
    | GroupMembershipRequestRejectedNotification =>
    notification.__typename === 'GroupMembershipRequestApprovedNotification' ||
    notification.__typename === 'GroupMembershipRequestRejectedNotification';

const filterForNewNotifications = async (notifications: readonly Notification[]) => {
    const storage = await browser.storage.local.get([KEY_NOTIFICATION_ITEMS_CACHE]);
    const cache: Notification[] = storage[KEY_NOTIFICATION_ITEMS_CACHE] || [];
    const cachedNotifications = new Set(cache.map((item) => getNotificationIdentifier(item)));
    return notifications.filter(
        (notification) =>
            'id' in notification &&
            !cachedNotifications.has(getNotificationIdentifier(notification)),
    );
};

const cacheNotifications = async (
    notifications: Notification[],
    pageInfo: PaginatedResultInfo,
    prepend?: boolean,
) => {
    if (notifications.length === 0) return;

    const storage = await browser.storage.local.get([
        KEY_NOTIFICATION_ITEMS_CACHE,
        KEY_NOTIFICATION_PAGE_INFO_CACHE,
    ]);

    if (notifications.length > 0) {
        const notificationsCache: Notification[] = storage[KEY_NOTIFICATION_ITEMS_CACHE] || [];
        console.log(
            'cacheNotifications: notificationItemsCache',
            notificationsCache.length,
            'newItems',
            notifications.length,
        );
        await browser.storage.local.set({
            [KEY_NOTIFICATION_ITEMS_CACHE]: prepend
                ? [...notifications, ...notificationsCache]
                : [...notificationsCache, ...notifications],
        });
    }

    let pageInfoCache: PaginatedResultInfo = storage[KEY_NOTIFICATION_PAGE_INFO_CACHE];
    console.log('cacheNotifications: cached pageInfo', pageInfoCache);
    if (!pageInfoCache) {
        // If we don't have a cache yet, we need to set the entire pageInfo object
        pageInfoCache = pageInfo;
    }
    // If we're prepending, we need to update only the prev cursor, and vice versa
    else if (prepend) {
        pageInfoCache.prev = pageInfo.prev;
    } else {
        pageInfoCache.next = pageInfo.next;
    }
    console.log('cacheNotifications: new pageInfo', pageInfoCache);
    await browser.storage.local.set({
        [KEY_NOTIFICATION_PAGE_INFO_CACHE]: pageInfoCache,
    });
};

const getPaginatedNotifications = async (cursor?: any): Promise<Paginated<Notification> | null> => {
    console.log('getPaginatedNotificationResult: cursor', cursor);

    const authenticated = await isAuthenticated();
    if (!authenticated) {
        console.warn('getNotifications: User not authenticated');
        browser.runtime.openOptionsPage();
        window?.close();
        return null;
    }

    const syncStorage = await browser.storage.sync.get([KEY_NOTIFICATIONS_FILTERED]);

    try {
        return getNotifications(cursor, syncStorage[KEY_NOTIFICATIONS_FILTERED] === true);
    } catch (e) {
        if (e instanceof Error) {
            onError(e, 'Error getting notifications');
        }
        return null;
    }
};

export const getNewNotifications = async (
    filter: boolean = false,
): Promise<{ notifications?: Notification[]; cursor?: any }> => {
    const storage = await browser.storage.local.get([
        KEY_NOTIFICATION_PAGE_INFO_CACHE,
        KEY_NOTIFICATION_ITEMS_CACHE,
    ]);
    const pageInfo: PaginatedResultInfo = storage[KEY_NOTIFICATION_PAGE_INFO_CACHE];

    const notificationsRes: Paginated<Notification> | null = await getPaginatedNotifications(
        pageInfo?.prev,
    );
    console.log('getNewNotifications: notifications result', notificationsRes);

    let notifications: Notification[] = [];
    if (notificationsRes) {
        notifications = await filterForNewNotifications(notificationsRes.items);
        await cacheNotifications(notifications, notificationsRes.pageInfo, true);
    }

    // If we don't have a cache yet there are no "new" notifications
    if (!storage[KEY_NOTIFICATION_ITEMS_CACHE] || !notificationsRes?.items) {
        return {};
    }

    if (!filter) {
        return {
            notifications,
            cursor: notificationsRes.pageInfo.prev,
        };
    }

    const syncStorage = await browser.storage.sync.get([
        KEY_NOTIFICATIONS_FOR_FOLLOWS,
        KEY_NOTIFICATIONS_FOR_MENTIONS,
        KEY_NOTIFICATIONS_FOR_REACTIONS,
        KEY_NOTIFICATIONS_FOR_MIRRORS,
        KEY_NOTIFICATIONS_FOR_COMMENTS,
        KEY_NOTIFICATIONS_FOR_POST_ACTIONS,
        KEY_NOTIFICATIONS_FOR_QUOTES,
        KEY_NOTIFICATIONS_FILTERED,
        KEY_NOTIFICATIONS_FOR_ACCOUNT_ACTIONS,
        KEY_NOTIFICATIONS_FOR_GROUPS,
    ]);

    const filteredNotifications: Notification[] = notifications.filter(
        (notification: Notification) => {
            switch (notification.__typename) {
                case 'FollowNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_FOLLOWS] !== false;
                case 'ReactionNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_REACTIONS] !== false;
                case 'PostActionExecutedNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_POST_ACTIONS] !== false;
                case 'AccountActionExecutedNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_ACCOUNT_ACTIONS] !== false;
                case 'CommentNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_COMMENTS] !== false;
                case 'MentionNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_MENTIONS] !== false;
                case 'RepostNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_MIRRORS] !== false;
                case 'QuoteNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_QUOTES] !== false;
                case 'GroupMembershipRequestApprovedNotification':
                case 'GroupMembershipRequestRejectedNotification':
                    return syncStorage[KEY_NOTIFICATIONS_FOR_GROUPS] !== false;
                default:
                    return false;
            }
        },
    );

    return {
        notifications: filteredNotifications,
        cursor: notificationsRes.pageInfo.prev,
    };
};

export const getNextNotifications = async (): Promise<{
    notifications?: Notification[];
    cursor?: any;
}> => {
    const storage = await browser.storage.local.get([KEY_NOTIFICATION_PAGE_INFO_CACHE]);
    const pageInfo: PaginatedResultInfo = storage[KEY_NOTIFICATION_PAGE_INFO_CACHE];
    const notificationsRes = await getPaginatedNotifications(pageInfo?.next);
    console.log('getNextNotifications: notifications result', notificationsRes);

    if (notificationsRes?.items) {
        const notifications = await filterForNewNotifications(notificationsRes.items);
        await cacheNotifications(notifications, notificationsRes.pageInfo);

        return {
            notifications,
            cursor: notificationsRes.pageInfo.next,
        };
    }
    return {};
};

/**
 * Returns the account of the user that triggered the notification
 */
export const getNotificationAccount = (notification: Notification): Account | undefined => {
    switch (notification.__typename) {
        case 'ReactionNotification':
            return notification.reactions[0].account;
        case 'CommentNotification':
            return notification.comment.author;
        case 'RepostNotification':
            return notification.reposts[0].account;
        case 'PostActionExecutedNotification':
        case 'AccountActionExecutedNotification':
            return 'executedBy' in notification.actions[0]
                ? notification.actions[0].executedBy
                : undefined;
        case 'MentionNotification':
            return notification.post.author;
        case 'QuoteNotification':
            return notification.quote.author;
        case 'FollowNotification':
            return notification.followers[0].account;
        case 'GroupMembershipRequestRejectedNotification':
            return notification.rejectedBy;
        case 'GroupMembershipRequestApprovedNotification':
            return notification.approvedBy;
        default:
            return undefined;
    }
};

export const getNotificationWalletAddress = (notification: Notification): string => {
    switch (notification.__typename) {
        case 'ReactionNotification':
            return notification.reactions[0].account.owner;
        case 'CommentNotification':
            return notification.comment.author.owner;
        case 'QuoteNotification':
            return notification.quote.author.owner;
        case 'RepostNotification':
            return notification.reposts[0].account.owner;
        case 'PostActionExecutedNotification':
        case 'AccountActionExecutedNotification':
            return 'executedBy' in notification.actions[0]
                ? notification.actions[0].executedBy.address
                : 'anonymous';
        case 'MentionNotification':
            return notification.post.author.owner;
        case 'FollowNotification':
            return notification.followers[0].account.owner;
        case 'GroupMembershipRequestRejectedNotification':
            return notification.rejectedBy.address;
        case 'GroupMembershipRequestApprovedNotification':
            return notification.approvedBy.address;
        default:
            return 'anonymous';
    }
};

export const getAvatarFromNotification = (notification: Notification): string | undefined => {
    const account = getNotificationAccount(notification);
    return account ? getAccountAvatar(account) : undefined;
};

const getPostActionVerb = (notification: PostActionExecutedNotification): string => {
    const firstAction = notification.actions[0];
    const allSameAction = notification.actions.every(
        (action) => action.__typename === firstAction.__typename,
    );
    if (allSameAction) {
        if (firstAction.__typename === 'SimpleCollectPostActionExecuted') {
            return 'collected';
        } else if (firstAction.__typename === 'TippingPostActionExecuted') {
            return `tipped **${firstAction.amount.value} ${firstAction.amount.asset.symbol}** on`;
        }
    }
    return 'acted on';
};

const getAccountActionVerb = (notification: AccountActionExecutedNotification): string => {
    const firstAction = notification.actions[0];
    if (firstAction.__typename === 'TippingAccountActionExecuted') {
        return `sent **${firstAction.amount.value} ${firstAction.amount.asset.symbol}** to your account`;
    }
    return 'acted on';
};

/**
 * Returns a human-readable action for the notification in markdown
 */
export const getNotificationAction = (notification: Notification): string => {
    switch (notification.__typename) {
        case 'PostActionExecutedNotification':
            return (
                getPostActionVerb(notification) + ' your post'
                // + (isCommentPost(notification.post) ? 'comment' : 'post')
            );
        case 'AccountActionExecutedNotification':
            return getAccountActionVerb(notification);
        case 'FollowNotification':
            return notification.followers[0].account.operations?.isFollowedByMe
                ? 'followed you back'
                : 'followed you';
        case 'MentionNotification':
            return 'mentioned you';
        case 'CommentNotification':
            return 'commented on your post';
        // + (isCommentPost(notification.comment.commentOn) ? 'comment' : 'post')
        case 'ReactionNotification':
            return 'liked your post';
        // + (isCommentPost(notification.post) ? 'comment' : 'post');
        case 'RepostNotification':
            return 'reposted your post';
        // + (isCommentPost(notification.post) ? 'comment' : 'post');
        case 'QuoteNotification':
            return 'quoted your post';
        // + (isCommentPost(notification.quote.quoteOn) ? 'comment' : 'post')
        case 'GroupMembershipRequestApprovedNotification':
            return (
                'approved your request to join ' + (notification.group.metadata?.name ?? 'a group')
            );
        case 'GroupMembershipRequestRejectedNotification':
            return (
                'rejected your request to join ' + (notification.group.metadata?.name ?? 'a group')
            );
        default:
            return 'unknown action';
    }
};

export const getNotificationUsername = (notification: Notification): string => {
    const username = getNotificationAccount(notification)?.username;
    return username?.localName ?? getNotificationWalletAddress(notification);
};

export const getNotificationDisplayName = (notification: Notification): string => {
    return getNotificationAccount(notification)?.metadata?.name ?? '';
};

export const getNotificationContent = (notification: Notification): string | undefined | null => {
    const post = getNotificationPost(notification);

    if (post) {
        const content = getMetadataContent(post);
        if (content) {
            // Replace mentions in content with custom tags
            const processed = post.mentions.reduce((updated, mention) => {
                switch (mention.__typename) {
                    case 'AccountMention':
                        return updated.replace(mention.replace.from, `${mention.replace.to}`);
                    case 'GroupMention':
                        return updated.replace(mention.replace.from, `${mention.replace.to}`);
                    default:
                        return updated;
                }
            }, content);
            const contentStripped = stripMarkdown(processed);
            return truncate(contentStripped, 45) ?? post.collectibleMetadata?.name;
        }
    }

    return undefined;
};

export const getNodeForNotification = async (notification: Notification): Promise<LensNode> => {
    const post = getNotificationPost(notification);
    if (post) {
        return getNodeForPost(post);
    }

    const storage = await browser.storage.sync.get([KEY_NODE_POST, KEY_NODE_GROUP]);
    return isGroupMembershipNotification(notification)
        ? storage[KEY_NODE_GROUP]
        : storage[KEY_NODE_POST];
};

export const getNotificationLink = async (notification: Notification): Promise<string> => {
    const node = await getNodeForNotification(notification);

    switch (notification.__typename) {
        case 'FollowNotification': {
            const username = notification.followers[0].account.username;
            if (username) {
                return getNodeUrlForUsername(node, username);
            }
            break;
        }
        case 'CommentNotification':
            return getPostUrlFromNode(node, notification.comment.id);
        case 'QuoteNotification':
            return getPostUrlFromNode(node, notification.quote.id);
        case 'AccountActionExecutedNotification': {
            const username =
                'executedBy' in notification.actions[0]
                    ? notification.actions[0].executedBy.username
                    : undefined;
            if (username) {
                return getNodeUrlForUsername(node, username);
            }
            break;
        }
        case 'PostActionExecutedNotification':
        case 'MentionNotification':
        case 'ReactionNotification':
        case 'RepostNotification':
            return getPostUrlFromNode(node, notification.post.id);
    }

    const syncStorage = await browser.storage.sync.get(KEY_NODE_NOTIFICATIONS);
    return (
        syncStorage[KEY_NODE_NOTIFICATIONS].baseUrl +
        syncStorage[KEY_NODE_NOTIFICATIONS].notifications
    );
};

export const getEventTime = (notification: Notification): DateTime | undefined => {
    switch (notification.__typename) {
        case 'CommentNotification':
            return notification.comment.timestamp;
        case 'MentionNotification':
            return notification.post.timestamp;
        case 'ReactionNotification':
            return notification.reactions[0].reactions[0].reactedAt;
        case 'PostActionExecutedNotification':
        case 'AccountActionExecutedNotification':
            return 'executedAt' in notification.actions[0]
                ? notification.actions[0].executedAt
                : undefined;
        case 'RepostNotification':
            return notification.reposts[0].repostedAt;
        case 'QuoteNotification':
            return notification.quote.timestamp;
        case 'FollowNotification':
            return notification.followers[0].followedAt;
        default:
            return undefined;
    }
};

export const getNotificationIdentifier = (notification: Notification): string | undefined => {
    if (isKnownNotification(notification)) {
        return notification.id + getEventTime(notification)?.toString();
    }
};

export const getBatchedNotificationCount = (notification: BatchedNotification): number => {
    switch (notification.__typename) {
        case 'FollowNotification':
            return notification.followers.length;
        case 'ReactionNotification':
            return notification.reactions[0].reactions.length;
        case 'PostActionExecutedNotification':
        case 'AccountActionExecutedNotification':
            return notification.actions.length;
    }
};

export const getNotificationPost = (notification: Notification): ReferencedPost | undefined => {
    switch (notification.__typename) {
        case 'CommentNotification':
            return notification.comment;
        case 'QuoteNotification':
            return notification.quote;
        case 'MentionNotification':
        case 'RepostNotification':
        case 'ReactionNotification':
        case 'PostActionExecutedNotification':
            return notification.post;
        default:
            return undefined;
    }
};

export const getBlobUrl = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('getBlobUrl: Error fetching blob', e);
        return null;
    }
};
