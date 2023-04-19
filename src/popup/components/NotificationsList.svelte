<script lang="ts">
    import {getNextNotifications} from "../../lib/lens-notifications";
    import InfiniteLoading from 'svelte-infinite-loading';
    import type {Notification} from "../../lib/graph/lens-service";
    import NotificationItem from "./NotificationItem.svelte";
    import LoadingSpinner from "../../window/components/LoadingSpinner.svelte";
    import {DateTime} from "luxon";
    import {
        notificationItemsCache,
        notificationPageInfoCache,
        notificationsScrollTop
    } from "../../lib/stores/cache-store";
    import {get} from "../../lib/stores/chrome-storage-store";
    import {tick} from "svelte";

    export let lastUpdate: DateTime;

    export const scrollToTop = () => {
        listElement.parentElement.scrollTop = 0;
    };

    let notifications: Notification[] = [];
    let cursor = null;
    let error = null;
    let infiniteId = 0;
    let listElement: HTMLUListElement;

    const reload = () => {
        notifications = [];
        cursor = null;
        error = null;
        infiniteId++;
    };

    $: {
        if (!$notificationItemsCache || !$notificationItemsCache.length) {
            console.log('clearing notifications');
            reload();
        }
    }

    const restoreScroll = async () => {
        if ($notificationsScrollTop) {
            await tick();
            listElement.parentElement.scrollTop = $notificationsScrollTop;
            $notificationsScrollTop = 0;
        }
    }

    const infiniteHandler = async ({detail: {loaded, complete}}) => {
        try {
            const cachedNotifications = await get(notificationItemsCache);
            if (!cursor && cachedNotifications?.length) {
                notifications = cachedNotifications;
                const pageInfo = await get(notificationPageInfoCache);
                cursor = pageInfo.next;
                loaded();
                await restoreScroll();
                console.log('infiniteHandler: using cache');
                return;
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
            error = e;
        }
    };
</script>

{#if error}

  <div class="h-full flex flex-col justify-center items-center gap-1">
    <div class="text-xl font-bold text-gray-900 dark:text-gray-100">Error</div>
    <div class="text text-gray-600 dark:text-gray-400">There was an error loading notifications.</div>
    <button type="button" on:click={reload}
            class="w-auto mt-2 py-1.5 px-8 flex justify-center items-center
            bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400
            dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600
            rounded-full shadow-md
            focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            text-white text-center text-lg font-semibold dark:disabled:text-gray-400
            transition ease-in duration-200" >
      Retry
    </button>
  </div>

{:else}

    <ul bind:this={listElement} class="w-full h-fit bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
      {#each notifications as notification}
        <li>
          <NotificationItem {notification} {lastUpdate}/>
        </li>
      {/each}

      <InfiniteLoading on:infinite={infiniteHandler} identifier={infiniteId}>
        <div slot="noMore"></div>
        <div slot="spinner" class="p-6">
          <LoadingSpinner />
        </div>
      </InfiniteLoading>
    </ul>

{/if}

<style>
</style>