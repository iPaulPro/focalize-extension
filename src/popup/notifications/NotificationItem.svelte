<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import type {Notification} from '../../lib/graph/lens-service';
    import {
        getAvatarFromNotification,
        getNotificationAction,
        getNotificationContent,
        getNotificationHandle,
        getNotificationLink,
        getNotificationProfile,
        getNotificationWalletAddress
    } from '../../lib/lens-notifications';
    import {DateTime} from 'luxon';
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import {getProfileUrl} from '../../lib/lens-nodes';
    import {nodeSearch} from '../../lib/stores/preferences-store';
    import {truncate, truncateAddress} from '../../lib/utils';
    import NotificationIcon from './NotificationIcon.svelte';
    import FloatingComponent from '../../lib/components/FloatingComponent.svelte';
    import ProfileHoverCard from '../../lib/components/ProfileHoverCard.svelte';
    import {getNotificationDisplayName} from '../../lib/lens-notifications.js';
    import AutoRelativeTimeView from '../../lib/components/AutoRelativeTimeView.svelte';

    export let notification: Notification;
    export let lastUpdate: DateTime;

    let avatarElement: HTMLImageElement;
    let handleElement: HTMLElement;

    $: notificationContent = notification && getNotificationContent(notification);
    $: notificationAvatar = notification && getAvatarFromNotification(notification);
    $: notificationDisplayName = notification && getNotificationDisplayName(notification);
    $: notificationHandle = notification && getNotificationHandle(notification);
    $: notificationWalletAddress = notification && getNotificationWalletAddress(notification);
    $: isNew = notification && lastUpdate && DateTime.fromISO(notification.createdAt) > lastUpdate;
    $: userProfileUrl = notification && notificationHandle?.length > 0 && $nodeSearch && getProfileUrl($nodeSearch, notificationHandle);
    $: polygonScanUrl = notification && notificationWalletAddress && `https://polygonscan.com/address/${notificationWalletAddress}`;

    const launchNotification = async () => {
        const url = await getNotificationLink(notification);
        await chrome.tabs.create({url});
    };
</script>

<div on:click={launchNotification}
     class="flex py-4 px-4 gap-1 items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
     {isNew ? 'bg-white dark:bg-gray-700/60' : ''}">

  <NotificationIcon {notification}/>

  <div class="w-full flex flex-col pl-2 gap-0.5">

    <div class="flex justify-between">
      <a href={userProfileUrl || polygonScanUrl} target="_blank" rel="noreferrer">
        <img loading="lazy" decoding="async" src={notificationAvatar ?? ImageAvatar} alt="avatar"
             bind:this={avatarElement}
             class="w-9 aspect-square rounded-full object-cover bg-gray-300 text-white hover:opacity-80">
      </a>

      <div class="h-fit"
           use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: DateTime.fromISO(notification.createdAt).toLocaleString(DateTime.DATETIME_MED)
           })}>
        <AutoRelativeTimeView timestamp={DateTime.fromISO(notification.createdAt).toMillis()} capitalize={true}
                              shortRelativeCutoff={120}
                              className="text-xs {isNew ? 'opacity-100 font-medium' : 'opacity-70'}" />
      </div>
    </div>

    <span class="text-sm text-gray-900 dark:text-gray-300 pt-1">
      <a href={userProfileUrl || polygonScanUrl} target="_blank" rel="noreferrer"
         bind:this={handleElement}
         class="!no-underline !text-black dark:!text-white font-semibold hover:!underline">
        {#if notificationDisplayName}
          <span>{truncate(notificationDisplayName, 25)}</span>
        {:else if notificationHandle}
          <span>{truncate(notificationHandle, 25)}</span>
        {:else if notificationWalletAddress}
          <span>{truncateAddress(notificationWalletAddress, 12)}</span>
        {/if}
      </a>
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
  {@const profile = getNotificationProfile(notification)}
  {#if profile}
    <FloatingComponent anchors={[avatarElement, handleElement]} showDelay={500} hideDelay={200} interactive={true}>
      <ProfileHoverCard {profile}/>
    </FloatingComponent>
  {/if}
{/if}