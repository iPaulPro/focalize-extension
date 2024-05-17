<script lang='ts'>
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import type { BatchedNotification } from '../../lib/notifications/lens-notifications';
    import NotificationIcon from './NotificationIcon.svelte';
    import type { ProfileFragment } from '@lens-protocol/client';
    import { truncate, truncateAddress } from '../../lib/utils/utils';
    import { getNotificationPublication, getProfileDisplayName, getProfileUrl } from '../../lib/utils/lens-utils';
    import {
        getEventTime,
        getNotificationAction,
        getNotificationContent, getNotificationLink,
    } from '../../lib/notifications/lens-notifications';
    import SocialText from '../../lib/components/SocialText.svelte';
    import { DateTime } from 'luxon';
    import AutoRelativeTimeView from '../../lib/components/AutoRelativeTimeView.svelte';
    import { slide } from 'svelte/transition';
    import { isCommentPublication, PublicationReactionType } from '@lens-protocol/client';
    import ProfileAvatar from '../../lib/components/ProfileAvatar.svelte';

    export let notification: BatchedNotification;
    export let lastUpdate: DateTime | null;

    let expanded = false;

    const getProfiles = (): ProfileFragment[] => {
        let profiles: ProfileFragment[] = [];
        switch (notification.__typename) {
            case 'ActedNotification':
                profiles = notification.actions.map(action => action.by);
                break;
            case 'FollowNotification':
                profiles = notification.followers;
                break;
            case 'ReactionNotification':
                profiles = notification.reactions
                    .filter(reaction => reaction.reactions.find(r => r.reaction === PublicationReactionType.Upvote))
                    .map(reaction => reaction.profile);
                break;
        }

        // remove duplicate profiles
        profiles = Array.from(new Set(profiles.map(p => p.id)))
            .map(id => profiles.find(p => p.id === id))
            .filter((profile): profile is ProfileFragment => profile !== undefined);

        return profiles;
    };

    $: notificationContent = notification && getNotificationContent(notification);
    $: profiles = notification && getProfiles();
    $: notificationEventTime = getEventTime(notification);
    $: notificationDateTime = notificationEventTime && DateTime.fromISO(notificationEventTime);
    $: publication = notification && getNotificationPublication(notification);
    $: isNew = notification && lastUpdate && notificationDateTime && notificationDateTime > lastUpdate;
    $: isComment = publication && isCommentPublication(publication);

    type SubNotification = {
        profile: ProfileFragment;
        eventTime?: DateTime;
    }

    const getSubNotifications = (): SubNotification[] => {
        let subNotifications: SubNotification[] = [];
        switch (notification.__typename) {
            case 'ActedNotification':
                subNotifications = notification.actions.map(action => ({
                    profile: action.by,
                    eventTime: DateTime.fromISO(action.actedAt),
                }));
                break;
            case 'FollowNotification':
                subNotifications = notification.followers.map(profile => ({ profile }));
                break;
            case 'ReactionNotification':
                subNotifications = notification.reactions
                    .filter(reaction => reaction.reactions.find(r => r.reaction === PublicationReactionType.Upvote))
                    .map(reaction => ({
                        profile: reaction.profile,
                        eventTime: DateTime.fromISO(reaction.reactions[0].reactedAt),
                    }));
                break;
        }

        // remove duplicate profiles
        return Array.from(new Set(subNotifications.map(sub => sub.profile.id)))
            .map(id => subNotifications.find(sub => sub.profile.id === id))
            .filter((sub): sub is SubNotification => sub !== undefined);
    }
</script>

<div
     class="flex flex-col items-start
     {isNew ? 'bg-white dark:bg-gray-700/60' : ''}">

    <div on:click={() => expanded = !expanded}
        class='w-full min-h-28 flex items-center py-4 px-4 gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'>

        <NotificationIcon {notification} />

        <div class='flex-grow flex flex-col pl-2'>
            <div class='w-full flex overflow-hidden items-center'>
                <div class='flex-grow flex'>
                    {#each profiles.slice(0, 10) as profile}
                        <ProfileAvatar {profile} size='w-9 h-9' border overlap/>
                    {/each}
                </div>

                {#if profiles.length === 1 && notificationDateTime}
                    <div class='h-fit flex-none'
                         use:tippy={({
                         delay: 500,
                         placement: 'bottom',
                         content: notificationDateTime.toLocaleString(DateTime.DATETIME_MED)
                       })}>
                        <AutoRelativeTimeView timestamp={notificationDateTime.toMillis()} capitalize={true}
                                              shortRelativeCutoff={120}
                                              className="text-xs {isNew ? 'opacity-100 font-medium' : 'opacity-70'}" />
                    </div>
                {:else}
                    <svg viewBox='0 0 24 24' fill='none' class='w-4 h-4 opacity-50' class:rotate-180={expanded}
                         stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                        <path d='M6 9l6 6 6-6' />
                    </svg>
                {/if}
            </div>
            <div class='text-sm text-gray-900 dark:text-gray-300 pt-2'>
                <span class='font-semibold'>
                    {#if profiles.length === 2}
                        {truncate(getProfileDisplayName(profiles[0]), 25)} and {truncate(getProfileDisplayName(profiles[1]), 25)}
                    {:else}
                        {truncate(getProfileDisplayName(profiles[0]), 25)}
                        {#if profiles.length > 1}
                            and {profiles.length - 1} others
                        {/if}
                    {/if}
                </span>
                {getNotificationAction(notification)}
            </div>
            {#if notificationContent}
                <div class='text-sm text-gray-500 leading-tight'>
                    <SocialText text={notificationContent} linkify={false} />
                </div>
            {/if}
        </div>
    </div>

    {#if expanded}
        <div class='w-full flex flex-col pl-12 gap-1' transition:slide>
            <div class='border-t dark:border-gray-700 py-2 pr-8'>
                {#each getSubNotifications() as sub}
                    <a href={getProfileUrl(sub.profile)} target="_blank" class='notification'>
                        <ProfileAvatar profile={sub.profile} size='w-9 h-9' />
                        <div class='flex flex-col flex-grow'>
                            <div class='text-sm font-semibold'>
                                {getProfileDisplayName(sub.profile)}
                            </div>
                            <div class='text-xs opacity-70'>
                                {
                                    sub.profile.handle
                                        ? sub.profile.handle.suggestedFormatted.localName
                                        : truncateAddress(sub.profile.ownedBy.address)
                                }
                            </div>
                        </div>
                        {#if sub.eventTime}
                            <div class='h-fit flex-none'
                                 use:tippy={({
                         delay: 500,
                         placement: 'bottom',
                         content: sub.eventTime.toLocaleString(DateTime.DATETIME_MED)
                       })}>
                                <AutoRelativeTimeView timestamp={sub.eventTime.toMillis()} capitalize={true}
                                                      shortRelativeCutoff={120}
                                                      className="text-xs {isNew ? 'opacity-100 font-medium' : 'opacity-70'}" />
                            </div>
                        {/if}
                    </a>
                {/each}
                {#if notification.__typename !== 'FollowNotification'}
                    {#await getNotificationLink(notification) then link}
                        <div class='w-full border-t dark:border-gray-700 pt-2'>
                            <a href={link} class='notification text-sm justify-end w-fit opacity-80' target='_blank'>
                                View {isComment ? 'comment' : 'post'}
                                <svg viewBox='0 0 24 24' class='w-3 h-3'
                                     fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'
                                     stroke-linejoin='round'>
                                    <g fill='none' fill-rule='evenodd'>
                                        <path
                                            d='M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5M15 3h6v6M10 14L20.2 3.8' />
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
        @apply w-full flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 !text-black dark:!text-white !no-underline;
    }
</style>