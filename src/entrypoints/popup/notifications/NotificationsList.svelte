<script lang="ts">
    import {
        getEventTime,
        getNewNotifications,
        getNextNotifications,
        isBatchedNotification,
        getNotificationIdentifier,
    } from '@/lib/lens/lens-notifications';
    import InfiniteLoading from 'svelte-infinite-loading';
    import NotificationItem from './NotificationItem.svelte';
    import LoadingSpinner from '@/lib/components/LoadingSpinner.svelte';
    import { DateTime } from 'luxon';
    import {
        notificationsCache,
        notificationPageInfoCache,
        notificationsScrollTop,
        notificationsTimestamp,
        KEY_NOTIFICATIONS_TIMESTAMP,
    } from '@/lib/stores/cache-store';
    import { get } from '@/lib/stores/chrome-storage-store';
    import { onMount, tick } from 'svelte';
    import { hideOnScroll, scrollEndListener } from '@/lib/utils/utils';
    import type { Notification } from '@lens-protocol/client';
    import BatchedNotificationItem from './BatchedNotificationItem.svelte';

    export const scrollToTop = () => {
        scrollElement.scrollTop = 0;
    };

    let lastUpdate: DateTime | undefined;

    let notifications: Notification[] = [];
    let newNotifications: Notification[] = [];
    let cursor: any = null;
    let infiniteId = 0;
    let listElement: HTMLUListElement;
    let scrollElement: HTMLElement;

    const reload = () => {
        notifications = [];
        cursor = null;
        infiniteId++;
    };

    $: if (!$notificationsCache?.length) {
        console.log('clearing notifications');
        reload();
    }

    const updateNotificationsTimestamp = async (isoDate?: string) => {
        $notificationsTimestamp = isoDate ?? DateTime.now().toISO() ?? new Date().toISOString();
    };

    const addNewNotifications = async () => {
        if (newNotifications.length) {
            notifications = [...newNotifications, ...notifications];
        }

        newNotifications = [];

        await tick();
        scrollElement.scrollTop = 0;
    };

    const onLatestNotificationSeen = async () =>
        updateNotificationsTimestamp(getEventTime(notifications[0]));

    const getLastNotificationUpdateDate = async () => {
        // eslint-disable-next-line no-undef
        const syncStorage = await browser.storage.sync.get(KEY_NOTIFICATIONS_TIMESTAMP);
        return syncStorage.notificationsTimestamp
            ? DateTime.fromISO(syncStorage.notificationsTimestamp)
            : undefined;
    };

    const checkForNewNotifications = async () => {
        const latestNotifications = await getNewNotifications();
        newNotifications = latestNotifications.notifications ?? [];
        console.log('checkForNewNotifications: newNotifications', newNotifications);

        if (scrollElement.scrollTop == 0 && newNotifications.length) {
            await addNewNotifications();
            await onLatestNotificationSeen();
        }
    };

    const restoreScroll = async () => {
        if ($notificationsScrollTop > 0) {
            await tick();
            scrollElement.scrollTop = $notificationsScrollTop;
            $notificationsScrollTop = 0;
        } else {
            // Only update the timestamp if we're not restoring the scroll position since new notifications are visible
            await onLatestNotificationSeen();
            console.log(
                'restoreScroll: updating notifications timestamp',
                getEventTime(notifications[0]),
            );
        }
    };

    const findFirstVisibleListItem = (): Notification => {
        const parentTop = listElement.parentElement?.getBoundingClientRect()?.top ?? 0;
        const listItemElements = listElement.querySelectorAll('li');
        let firstVisibleListItemIndex = 0;

        for (let i = 0; i < listItemElements.length; i++) {
            const li = listItemElements[i];
            const rect = li.getBoundingClientRect();
            if (rect.top >= parentTop) {
                firstVisibleListItemIndex = i;
                break;
            }
        }

        return notifications[firstVisibleListItemIndex];
    };

    const onScrollEnd = (node: HTMLElement) => {
        $notificationsScrollTop = node.scrollTop;

        const firstNotification = findFirstVisibleListItem();
        const eventTime = getEventTime(firstNotification);
        if (
            firstNotification &&
            $notificationsTimestamp &&
            eventTime &&
            DateTime.fromISO($notificationsTimestamp) < DateTime.fromISO(eventTime)
        ) {
            onLatestNotificationSeen().catch(console.error);
        }
    };

    const infiniteHandler = async ({
        detail: { loaded, complete, error },
    }: {
        detail: { loaded: () => void; complete: () => void; error: () => void };
    }) => {
        try {
            if (!cursor) {
                const cachedNotifications = await get(notificationsCache);
                if (cachedNotifications?.length) {
                    notifications = cachedNotifications;
                    loaded();
                    console.log('infiniteHandler: using cache');

                    const pageInfo = await get(notificationPageInfoCache);
                    cursor = pageInfo.next;
                    if (!cursor) {
                        complete();
                    }

                    await restoreScroll();
                    await checkForNewNotifications();

                    return;
                }
            }

            const nextNotifications = await getNextNotifications();
            cursor = nextNotifications.cursor;

            if (!nextNotifications.notifications?.length) {
                loaded();
                complete();
                return;
            }

            notifications = [...notifications, ...nextNotifications.notifications];
            loaded();

            if (!cursor) {
                complete();
            }
        } catch (e) {
            console.error('infiniteHandler: error', e);
            error();
        }
    };

    onMount(async () => {
        lastUpdate = await getLastNotificationUpdateDate();
    });
</script>

<div
    bind:this={scrollElement}
    use:scrollEndListener={{ onScrollEnd }}
    class="z-0 h-full w-full overflow-y-auto"
>
    <ul
        bind:this={listElement}
        class="z-0 h-fit w-full divide-y divide-gray-200 bg-gray-100 dark:divide-gray-700 dark:bg-gray-800"
    >
        {#each notifications as notification (getNotificationIdentifier(notification))}
            <li>
                {#if isBatchedNotification(notification)}
                    <BatchedNotificationItem {notification} {lastUpdate} />
                {:else}
                    <NotificationItem {notification} {lastUpdate} />
                {/if}
            </li>
        {/each}

        <InfiniteLoading on:infinite={infiniteHandler} identifier={infiniteId}>
            <div slot="noMore"></div>

            <div
                slot="noResults"
                class="flex w-full flex-col items-center justify-center gap-2 py-56"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    class="h-12 w-12 opacity-40"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"
                    />
                </svg>
                <div class="text-sm font-semibold opacity-40">No notifications</div>
            </div>

            <div slot="spinner" class="p-10">
                <LoadingSpinner />
            </div>

            <div slot="error">
                <div class="flex h-full flex-col items-center justify-center gap-1">
                    <div class="text-xl font-bold text-gray-900 dark:text-gray-100">Error</div>
                    <div class="text text-gray-600 dark:text-gray-400">
                        There was an error loading notifications.
                    </div>
                    <button type="button" on:click={reload} class="btn variant-ringed-error"
                        >Retry
                    </button>
                </div>
            </div>
        </InfiniteLoading>
    </ul>
</div>

{#if newNotifications.length > 0}
    <div use:hideOnScroll={{ scrollElement }} class="absolute top-12 flex w-full justify-center">
        <button
            type="button"
            on:click={addNewNotifications}
            class="btn btn-sm variant-filled-surface mt-4 shadow-lg"
        >
            {newNotifications.length} new notification{newNotifications.length > 1 ? 's' : ''}
        </button>
    </div>
{/if}
