<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import NotificationIcon from './NotificationIcon.svelte';
    import type { Account } from '@lens-protocol/client';
    import { truncate, truncateAddress } from '@/lib/utils/utils';
    import { getAccountDisplayName, getAccountUrl, isCommentPost } from '@/lib/utils/lens-utils';
    import {
        type BatchedNotification,
        getEventTime,
        getNotificationAction,
        getNotificationContent,
        getNotificationLink,
        getNotificationPost,
        isActionNotification,
        isKnownAction,
        type KnownAction,
    } from '@/lib/lens/lens-notifications';
    import SocialText from '@/lib/components/SocialText.svelte';
    import { DateTime } from 'luxon';
    import AutoRelativeTimeView from '@/lib/components/AutoRelativeTimeView.svelte';
    import { slide } from 'svelte/transition';
    import { PostReactionType } from '@lens-protocol/client';
    import AccountAvatar from '@/lib/components/AccountAvatar.svelte';

    export let notification: BatchedNotification;
    export let lastUpdate: DateTime | undefined;

    let expanded = false;

    const getAccounts = (): Account[] => {
        let accounts: Account[] = [];
        switch (notification.__typename) {
            case 'PostActionExecutedNotification':
            case 'AccountActionExecutedNotification':
                accounts = notification.actions
                    .filter(isKnownAction)
                    .map((action) => action.executedBy);
                break;
            case 'FollowNotification':
                accounts = notification.followers.map((follower) => follower.account);
                break;
            case 'ReactionNotification':
                accounts = notification.reactions
                    .filter((reaction) =>
                        reaction.reactions.find((r) => r.reaction === PostReactionType.Upvote),
                    )
                    .map((reaction) => reaction.account);
                break;
        }

        // remove duplicate accounts
        accounts = Array.from(new Set(accounts.map((p) => p.address)))
            .map((address) => accounts.find((p) => p.address === address))
            .filter((account): account is Account => account !== undefined);

        return accounts;
    };

    $: notificationContent = notification && getNotificationContent(notification);
    $: accounts = notification && getAccounts();
    $: notificationEventTime = getEventTime(notification);
    $: notificationDateTime = notificationEventTime && DateTime.fromISO(notificationEventTime);
    $: post = notification && getNotificationPost(notification);
    $: isNew =
        notification && lastUpdate && notificationDateTime && notificationDateTime > lastUpdate;
    $: isComment = post && isCommentPost(post);
    $: isAllSameAction =
        !isActionNotification(notification) ||
        (isActionNotification(notification) &&
            notification.actions.every(
                (action) => action.__typename === notification.actions[0].__typename,
            ));

    type SubNotification = {
        account: Account;
        eventTime?: DateTime;
        action?: KnownAction;
    };

    const getSubNotifications = (): SubNotification[] => {
        let subNotifications: SubNotification[] = [];
        switch (notification.__typename) {
            case 'PostActionExecutedNotification':
            case 'AccountActionExecutedNotification':
                subNotifications = notification.actions.filter(isKnownAction).map(
                    (action) =>
                        ({
                            account: action.executedBy,
                            eventTime: DateTime.fromISO(action.executedAt),
                            action,
                        }) satisfies SubNotification,
                );
                break;
            case 'FollowNotification':
                subNotifications = notification.followers.map(
                    (follower) =>
                        ({
                            account: follower.account,
                        }) satisfies SubNotification,
                );
                break;
            case 'ReactionNotification':
                subNotifications = notification.reactions
                    .filter((reaction) =>
                        reaction.reactions.find((r) => r.reaction === PostReactionType.Upvote),
                    )
                    .map(
                        (reaction) =>
                            ({
                                account: reaction.account,
                                eventTime: DateTime.fromISO(reaction.reactions[0].reactedAt),
                            }) satisfies SubNotification,
                    );
                break;
        }

        // remove duplicate accounts
        return Array.from(new Set(subNotifications.map((sub) => sub.account.address)))
            .map((address) => subNotifications.find((sub) => sub.account.address === address))
            .filter((sub): sub is SubNotification => sub !== undefined);
    };
</script>

<div
    class="flex flex-col items-start
     {isNew ? 'bg-white dark:bg-gray-700/60' : ''}"
>
    <div
        on:click={() => (expanded = !expanded)}
        class="flex min-h-28 w-full cursor-pointer items-center gap-2 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
        <NotificationIcon {notification} />

        <div class="flex flex-grow flex-col pl-2">
            <div class="flex w-full items-center overflow-hidden">
                <div class="flex flex-grow">
                    {#each accounts.slice(0, 10) as account (account.address)}
                        <AccountAvatar {account} size="w-9 h-9" border overlap />
                    {/each}
                </div>

                {#if accounts.length === 1 && notificationDateTime}
                    <div
                        class="h-fit flex-none"
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
                {:else}
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        class="h-4 w-4 opacity-50"
                        class:rotate-180={expanded}
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                {/if}
            </div>
            <div class="pt-2 text-sm text-gray-900 dark:text-gray-300">
                <span class="font-semibold">
                    {#if accounts.length === 2}
                        {truncate(getAccountDisplayName(accounts[0]), 25)} and {truncate(
                            getAccountDisplayName(accounts[1]),
                            25,
                        )}
                    {:else}
                        {truncate(getAccountDisplayName(accounts[0]), 25)}
                        {#if accounts.length > 1}
                            and {accounts.length - 1} others
                        {/if}
                    {/if}
                </span>
                {getNotificationAction(notification)}
            </div>
            {#if notificationContent}
                <div class="text-sm leading-tight text-gray-500">
                    <SocialText text={notificationContent} linkify={false} />
                </div>
            {/if}
        </div>
    </div>

    {#if expanded}
        <div class="flex w-full flex-col gap-1 pl-12" transition:slide>
            <div class="border-t py-2 pr-8 dark:border-gray-700">
                {#each getSubNotifications() as sub (sub.account)}
                    {@const displayName = getAccountDisplayName(sub.account)}
                    {@const username = sub.account.username?.localName}
                    {@const walletAddress = sub.account.owner}
                    <a
                        href={getAccountUrl(sub.account) ?? '#'}
                        target="_blank"
                        class="notification"
                    >
                        <AccountAvatar account={sub.account} size="w-9 h-9" />
                        <div class="flex flex-grow flex-col">
                            <div class="flex gap-1">
                                {#if displayName}
                                    <span class="text-sm font-semibold"
                                        >{truncate(displayName, 15)}
                                    </span>
                                    {#if username}
                                        <span class="text-sm text-gray-500 dark:text-gray-400">
                                            {truncate(username, 10)}
                                        </span>
                                    {/if}
                                {:else if username}
                                    <span>{truncate(username, 15)}</span>
                                {:else if walletAddress}
                                    <span>{truncateAddress(walletAddress, 12)}</span>
                                {/if}
                            </div>
                            {#if !isAllSameAction}
                                <div class="text-sm text-gray-500 dark:text-gray-400">
                                    {#if sub.action?.__typename === 'TippingPostActionExecuted'}
                                        <span>Tipped </span>
                                        <span class="font-bold">
                                            ${sub.action?.amount.value} ${sub.action.amount.asset
                                                .symbol}
                                        </span>
                                        <span> on your post</span>
                                    {:else if sub.action?.__typename === 'TippingAccountActionExecuted'}
                                        {`Sent you ${sub.action.amount.value} ${sub.action.amount.asset.symbol}`}
                                    {:else if sub.action?.__typename === 'SimpleCollectPostActionExecuted'}
                                        Collected your post
                                    {:else}
                                        Acted on your {sub.action?.__typename ===
                                        'UnknownAccountActionExecuted'
                                            ? 'account'
                                            : 'post'}
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        {#if sub.eventTime}
                            <div
                                class="h-fit flex-none"
                                use:tippy={{
                                    delay: 500,
                                    placement: 'bottom',
                                    content: sub.eventTime.toLocaleString(DateTime.DATETIME_MED),
                                }}
                            >
                                <AutoRelativeTimeView
                                    timestamp={sub.eventTime.toMillis()}
                                    capitalize={true}
                                    shortRelativeCutoff={120}
                                    className="text-xs {isNew
                                        ? 'opacity-100 font-medium'
                                        : 'opacity-70'}"
                                />
                            </div>
                        {/if}
                    </a>
                {/each}
                {#if notification.__typename !== 'FollowNotification'}
                    {#await getNotificationLink(notification) then link}
                        <div class="w-full border-t pt-2 dark:border-gray-700">
                            <a
                                href={link}
                                class="notification w-fit justify-end text-sm opacity-80"
                                target="_blank"
                            >
                                View {isComment ? 'comment' : 'post'}
                                <svg
                                    viewBox="0 0 24 24"
                                    class="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <g fill="none" fill-rule="evenodd">
                                        <path
                                            d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5M15 3h6v6M10 14L20.2 3.8"
                                        />
                                    </g>
                                </svg>
                            </a>
                        </div>
                    {/await}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .notification {
        @apply flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-2 !text-black !no-underline hover:bg-gray-50 dark:!text-white dark:hover:bg-gray-700;
    }
</style>
