<script lang="ts">
    //@ts-ignore
    import tippy from "sveltejs-tippy";
    import type {Notification} from "../../lib/graph/lens-service";
    import {
        getAvatarFromNotification,
        getNotificationAction, getNotificationContent,
        getNotificationHandle, getNotificationLink
    } from "../../lib/lens-notifications";
    import {DateTime} from "luxon";

    export let notification: Notification;
    export let lastUpdate: DateTime;

    $: notificationContent = notification && getNotificationContent(notification);

    $: isNew = notification && lastUpdate && DateTime.fromISO(notification.createdAt) > lastUpdate;

    const launchNotification = async () => {
        const url = await getNotificationLink(notification);
        await chrome.tabs.create({url});
    };
</script>

<div on:click={launchNotification}
     class="flex py-4 px-4 gap-1 items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
     {isNew ? 'bg-gray-100 dark:bg-gray-700 dark:bg-opacity-40' : ''}">

  <div class="h-9 flex items-center">
    {#if notification.__typename === 'NewCollectNotification'}
      <svg class="w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 1 1-8 0"/>
      </svg>
    {:else if notification.__typename === 'NewCommentNotification'}
      <svg class="w-5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    {:else if notification.__typename === 'NewFollowerNotification'}
      <svg class="w-5 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="20" y1="8" x2="20" y2="14"></line>
        <line x1="23" y1="11" x2="17" y2="11"></line>
      </svg>
    {:else if notification.__typename === 'NewMentionNotification'}
      <svg class="w-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
      </svg>
    {:else if notification.__typename === 'NewMirrorNotification'}
      <svg class="w-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 2.1l4 4-4 4"/>
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
      </svg>
    {:else if notification.__typename === 'NewReactionNotification'}
      <svg class="w-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    {/if}
  </div>

  <div class="w-full flex flex-col pl-2 gap-0.5">

    <div class="flex justify-between">
      <img src={getAvatarFromNotification(notification)} alt="avatar" class="w-9 rounded-full object-cover">

      <div class="h-fit text-xs opacity-60 font-medium"
           use:tippy={({
            delay: 500,
            placement: 'bottom',
            content: DateTime.fromISO(notification.createdAt).toLocaleString(DateTime.DATETIME_MED)
           })}>
        {DateTime.fromISO(notification.createdAt).toRelative()}
      </div>
    </div>

    <div class="text-sm text-gray-900 dark:text-gray-300 pt-1">
      <span class="font-semibold">{getNotificationHandle(notification)}</span> {getNotificationAction(notification)}
    </div>

    {#if notificationContent}
      <div class="text-sm text-gray-500">
        {notificationContent}
      </div>
    {/if}
  </div>

</div>

<style>
</style>