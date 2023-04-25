<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import tooltip from 'svelte-ktippy';
    import type {Notification} from '../../lib/graph/lens-service';
    import {
        getAvatarFromNotification,
        getNotificationAction, getNotificationContent,
        getNotificationHandle, getNotificationLink, getNotificationProfile
    } from '../../lib/lens-notifications';
    import {DateTime} from 'luxon';
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import {getProfileUrl} from '../../lib/lens-nodes';
    import {nodeSearch} from '../../lib/stores/preferences-store';
    import {truncate} from '../../lib/utils';
    import NotificationIcon from './NotificationIcon.svelte';
    import FloatingComponent from '../../lib/components/FloatingComponent.svelte';
    import ProfileHoverCard from '../../lib/components/ProfileHoverCard.svelte';
    import {getNotificationDisplayName} from '../../lib/lens-notifications.js';

    export let notification: Notification;
    export let lastUpdate: DateTime;

    let avatarElement: HTMLImageElement;
    let handleElement: HTMLElement;

    $: notificationContent = notification && getNotificationContent(notification);
    $: notificationAvatar = notification && getAvatarFromNotification(notification);
    $: notificationDisplayName = notification && getNotificationDisplayName(notification);
    $: isNew = notification && lastUpdate && DateTime.fromISO(notification.createdAt) > lastUpdate;

    const getUserProfileUrl = async (): Promise<string | null> => {
        if (!notification) return null;
        const handle = getNotificationHandle(notification);
        return getProfileUrl($nodeSearch, handle);
    };

    const launchNotification = async () => {
        const url = await getNotificationLink(notification);
        await chrome.tabs.create({url});
    };

    const launchUserProfile = async () => {
        const url = await getUserProfileUrl();
        if (url) await chrome.tabs.create({url});
    };
</script>

<div on:click={launchNotification}
     class="flex py-4 px-4 gap-1 items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
     {isNew ? 'bg-white dark:bg-gray-700/60' : ''}">

  <NotificationIcon {notification}/>

  <div class="w-full flex flex-col pl-2 gap-0.5">

    <div class="flex justify-between">
      <img src={notificationAvatar ?? ImageAvatar} alt="avatar" loading="lazy" decoding="async"
           bind:this={avatarElement} on:click={launchUserProfile}
           class="w-9 aspect-square rounded-full object-cover bg-gray-300 text-white hover:opacity-80"
      >

      <div class="h-fit text-xs opacity-60 font-medium"
           use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: DateTime.fromISO(notification.createdAt).toLocaleString(DateTime.DATETIME_MED)
           })}>
        {DateTime.fromISO(notification.createdAt).toRelative()}
      </div>
    </div>

    <span class="text-sm text-gray-900 dark:text-gray-300 pt-1">
      <span class="font-semibold hover:underline" on:click={launchUserProfile} bind:this={handleElement}>
        {#if notificationDisplayName}
          <span>{truncate(notificationDisplayName, 25)}</span>
        {:else}
          <span>{truncate(getNotificationHandle(notification), 25)}</span>
        {/if}
      </span>
      <span>
        {getNotificationAction(notification)}
      </span>
    </span>

    {#if notificationContent}
      <div class="text-sm text-gray-500 leading-tight">
        {notificationContent}
      </div>
    {/if}
  </div>

</div>

{#if avatarElement && handleElement}
  <FloatingComponent anchors={[avatarElement, handleElement]} showDelay={500} hideDelay={200} interactive={true}>
    <ProfileHoverCard profile={getNotificationProfile(notification)}/>
  </FloatingComponent>
{/if}