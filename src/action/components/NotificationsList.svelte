<script lang="ts">
    import {getPaginatedNotificationResult} from "../../lib/lens-notifications";
    import InfiniteLoading from 'svelte-infinite-loading';
    import type {Notification} from "../../lib/graph/lens-service";
    import NotificationItem from "./NotificationItem.svelte";
    import LoadingSpinner from "../../window/components/LoadingSpinner.svelte";
    import {DateTime} from "luxon";

    export let lastUpdate: DateTime;

    let notifications: Notification[] = [];
    let cursor = null;
    let error = null;

    const infiniteHandler = async ({detail: {loaded, complete}}) => {
        try {
            const notificationResult = await getPaginatedNotificationResult(cursor, 20);
            console.log('infiniteHandler: notificationResult', notificationResult);
            if (!notificationResult) {
                complete();
                return;
            }

            cursor = notificationResult.pageInfo.next;

            if (notificationResult.items.length) {
                notifications = [...notifications, ...notificationResult.items];
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

  <div class="h-full flex flex-col justify-center items-center">
    <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">Error</p>
    <p class="text-gray-600 dark:text-gray-400">There was an error loading notifications.</p>
  </div>

{:else}

    <ul class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
      {#each notifications as notification}
        <li>
          <NotificationItem {notification} {lastUpdate}/>
        </li>
      {/each}

      <InfiniteLoading on:infinite={infiniteHandler}>
        <div slot="noMore"></div>
        <div slot="spinner" class="p-6">
          <LoadingSpinner />
        </div>
      </InfiniteLoading>
    </ul>

{/if}

<style>
</style>