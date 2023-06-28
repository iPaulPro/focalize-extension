<script lang="ts">
    import {getLatestNotifications, getNextNotifications} from '../../lib/lens-notifications';
    import InfiniteLoading from 'svelte-infinite-loading';
    import type {Notification} from '../../lib/graph/lens-service';
    import NotificationItem from './NotificationItem.svelte';
    import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';
    import {DateTime} from 'luxon';
    import {
        notificationItemsCache,
        notificationPageInfoCache,
        notificationsScrollTop
    } from '../../lib/stores/cache-store';
    import {get} from '../../lib/stores/chrome-storage-store';
    import {tick} from 'svelte';
    import {hideOnScroll, scrollEndListener} from '../../lib/utils';
    import {notificationsTimestamp} from '../../lib/stores/preferences-store';

    export let lastUpdate: DateTime;

    export const scrollToTop = () => {
        scrollElement.scrollTop = 0;
    };

    let notifications: Notification[] = [];
    let newNotifications: Notification[] = [];
    let cursor = null;
    let infiniteId = 0;
    let listElement: HTMLUListElement;
    let scrollElement: HTMLElement;

    const reload = () => {
        notifications = [];
        cursor = null;
        infiniteId++;
    };

    $: {
        if (!$notificationItemsCache || !$notificationItemsCache.length) {
            console.log('clearing notifications');
            reload();
        }
    }

    const updateNotificationsTimestamp = async (isoDate?: string) => {
        $notificationsTimestamp = isoDate ?? DateTime.now().toISO();
    };

    const addNewNotifications = async () => {
        if (newNotifications.length) {
            notifications = [...newNotifications, ...notifications];
        }

        newNotifications = [];

        await tick();
        scrollElement.scrollTop = 0;
    };

    const onLatestNotificationSeen = async () => {
        await updateNotificationsTimestamp(notifications[0]?.createdAt);
    };

    const checkForNewNotifications = async () => {
        const latestNotifications = await getLatestNotifications();
        newNotifications = latestNotifications.notifications;
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
            console.log('restoreScroll: updating notifications timestamp', notifications[0].createdAt);
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

    const onScrollEnd = async (node: HTMLElement) => {
        $notificationsScrollTop = node.scrollTop;

        const firstNotification = findFirstVisibleListItem();
        if (
            firstNotification && $notificationsTimestamp &&
            DateTime.fromISO($notificationsTimestamp) < DateTime.fromISO(firstNotification.createdAt)
        ) {
            await onLatestNotificationSeen();
        }
    };

    const infiniteHandler = async ({detail: {loaded, complete, error}}) => {
        try {
            if (!cursor) {
                const cachedNotifications = await get(notificationItemsCache);
                if (cachedNotifications?.length) {
                    notifications = cachedNotifications;

                    const pageInfo = await get(notificationPageInfoCache);
                    cursor = pageInfo.next;

                    console.log('infiniteHandler: using cache');
                    loaded();

                    await restoreScroll();
                    await checkForNewNotifications();

                    return;
                }
            }

            const nextNotifications = await getNextNotifications();
            if (!nextNotifications.notifications || !nextNotifications.cursor) {
                complete();
                return;
            }

            cursor = nextNotifications.cursor;

            if (nextNotifications.notifications.length) {
                notifications = [...notifications, ...nextNotifications.notifications];
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error('infiniteHandler: error', e);
            error();
        }
    };
</script>

<div bind:this={scrollElement} use:scrollEndListener={{onScrollEnd}}
     class="w-full h-full overflow-y-auto">

  <ul bind:this={listElement}
      class="w-full h-fit bg-gray-100 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

    {#each notifications as notification (notification.notificationId)}
      <li>
        <NotificationItem {notification} {lastUpdate}/>
      </li>
    {/each}

    <InfiniteLoading on:infinite={infiniteHandler} identifier={infiniteId}>
      <div slot="noMore"></div>

      <div slot="spinner" class="p-10">
        <LoadingSpinner/>
      </div>

      <div slot="error">
        <div class="h-full flex flex-col justify-center items-center gap-1">
          <div class="text-xl font-bold text-gray-900 dark:text-gray-100">Error</div>
          <div class="text text-gray-600 dark:text-gray-400">There was an error loading notifications.</div>
          <button type="button" on:click={reload} class="btn variant-ringed-error">Retry</button>
        </div>
      </div>

    </InfiniteLoading>

  </ul>

</div>

{#if newNotifications.length > 0}
  <div use:hideOnScroll={{scrollElement}}
       class="absolute top-12 w-full flex justify-center">
    <button type="button" on:click={addNewNotifications}
            class="btn btn-sm variant-filled-surface mt-4 shadow-lg">
      {newNotifications.length} new notification{newNotifications.length > 1 ? 's' : ''}
    </button>
  </div>
{/if}