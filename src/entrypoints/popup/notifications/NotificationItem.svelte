<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import {
        getAvatarFromNotification,
        getEventTime,
        getNotificationAction,
        getNotificationContent,
        getNotificationUsername,
        getNotificationLink,
        getNotificationAccount,
        getNotificationWalletAddress,
        getNotificationDisplayName,
    } from '@/lib/lens/lens-notifications';
    import { DateTime } from 'luxon';
    import ImageAvatar from '~/assets/ic_avatar.svg';
    import { getNodeUrlForUsername } from '@/lib/lens/lens-nodes';
    import { nodeSearch } from '@/lib/stores/preferences-store';
    import { truncate, truncateAddress } from '@/lib/utils/utils';
    import NotificationIcon from './NotificationIcon.svelte';
    import FloatingComponent from '@/lib/components/FloatingComponent.svelte';
    import AccountHoverCard from '@/lib/components/AccountHoverCard.svelte';
    import AutoRelativeTimeView from '@/lib/components/AutoRelativeTimeView.svelte';
    import type { Notification } from '@lens-protocol/client';
    import SocialText from '@/lib/components/SocialText.svelte';
    import { htmlFromMarkdown } from '@/lib/utils/utils.js';

    export let notification: Notification;
    export let lastUpdate: DateTime | undefined;

    let avatarElement: HTMLImageElement;
    let usernameElement: HTMLElement;

    $: notificationContent = notification && getNotificationContent(notification);
    $: notificationAvatar = notification && getAvatarFromNotification(notification);
    $: notificationDisplayName = notification && getNotificationDisplayName(notification);
    $: notificationUsername = notification && getNotificationUsername(notification);
    $: notificationWalletAddress = notification && getNotificationWalletAddress(notification);
    $: notificationEventTime = notification && getEventTime(notification);
    $: notificationDateTime = notificationEventTime && DateTime.fromISO(notificationEventTime);
    $: notificationAccount = getNotificationAccount(notification);
    $: isNew = lastUpdate && notificationDateTime && notificationDateTime > lastUpdate;
    $: userAccountUrl =
        notification &&
        notificationAccount?.username &&
        $nodeSearch &&
        getNodeUrlForUsername($nodeSearch, notificationAccount.username);
    $: polygonScanUrl =
        notification &&
        notificationWalletAddress &&
        `https://polygonscan.com/address/${notificationWalletAddress}`;

    const launchNotification = async () => {
        const url = await getNotificationLink(notification);
        // eslint-disable-next-line no-undef
        await browser.tabs.create({ url });
    };
</script>

<div
    on:click={launchNotification}
    class="flex cursor-pointer items-start gap-2 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700
     {isNew ? 'bg-white dark:bg-gray-700/60' : ''}"
>
    <NotificationIcon {notification} />

    <div class="flex w-full flex-col gap-0.5 pl-2">
        <div class="flex justify-between">
            <a href={userAccountUrl || polygonScanUrl} target="_blank" rel="noreferrer">
                <img
                    loading="lazy"
                    decoding="async"
                    src={notificationAvatar ?? ImageAvatar}
                    alt="avatar"
                    bind:this={avatarElement}
                    class="aspect-square h-10 w-10 rounded-full bg-gray-300 object-cover text-white hover:opacity-80"
                />
            </a>

            {#if notificationDateTime}
                <div
                    class="h-fit"
                    use:tippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: notificationDateTime.toLocaleString(DateTime.DATETIME_MED),
                    }}
                >
                    <AutoRelativeTimeView
                        timestamp={notificationDateTime.toMillis()}
                        capitalize={true}
                        shortRelativeCutoff={120}
                        className="text-xs {isNew ? 'opacity-100 font-medium' : 'opacity-70'}"
                    />
                </div>
            {/if}
        </div>

        <span class="pt-1 text-sm text-gray-900 dark:text-gray-300">
            <a
                href={userAccountUrl || polygonScanUrl}
                target="_blank"
                rel="noreferrer"
                bind:this={usernameElement}
                class="!text-black !no-underline hover:!underline dark:!text-white"
            >
                {#if notificationDisplayName}
                    <span class="font-semibold">{truncate(notificationDisplayName, 25)}</span>
                    {#if notificationUsername && notificationUsername !== notificationDisplayName}
                        <span class="text-gray-500 dark:text-gray-400">
                            {truncate(notificationUsername, 15)}
                        </span>
                    {/if}
                {:else if notificationUsername}
                    <span>{truncate(notificationUsername, 25)}</span>
                {:else if notificationWalletAddress}
                    <span>{truncateAddress(notificationWalletAddress, 12)}</span>
                {/if}
            </a>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html htmlFromMarkdown(getNotificationAction(notification))
                ?.replace('<p>', '<span>')
                ?.replace('</p>', '</span>')}
        </span>

        {#if notificationContent}
            <div class="text-sm leading-tight text-gray-500">
                <SocialText text={notificationContent} linkify={false} />
            </div>
        {/if}
    </div>
</div>

{#if avatarElement && usernameElement}
    {@const account = getNotificationAccount(notification)}
    {#if account}
        <FloatingComponent
            anchors={[avatarElement, usernameElement]}
            showDelay={500}
            hideDelay={200}
            interactive={true}
        >
            <AccountHoverCard {account} />
        </FloatingComponent>
    {/if}
{/if}
