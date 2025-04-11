<script lang="ts">
    import { formatFollowerCount, truncateAddress } from '../utils/utils';
    import { onMount } from 'svelte';
    import FollowButton from './FollowButton.svelte';
    import SocialText from './SocialText.svelte';
    import { currentUser } from '../stores/user-store';
    import { getNodeUrlForUsername } from '../lens/lens-nodes';
    import { nodeSearch } from '../stores/preferences-store';
    import { slide, fade, scale } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    import { getGraphStats, getMutualFollowers, getAccount } from '../lens-service';
    import type { Account, AccountGraphsFollowStats } from '@lens-protocol/client';
    import { getAccountAvatar } from '../utils/lens-utils.js';
    import { onError } from '@/lib/utils/error-utils';

    export let account: Account;

    let loading = true;
    let mutualFollows: Account[];
    let stats: AccountGraphsFollowStats | null;

    $: avatarUrl = getAccountAvatar(account, false);
    $: userAccountUrl =
        account.username && $nodeSearch && getNodeUrlForUsername($nodeSearch, account.username);
    $: isCurrentUserAccount = account && account.address === $currentUser?.account;

    onMount(async () => {
        try {
            const updatedAccount = await getAccount({ address: account.address });
            if (updatedAccount) {
                account = updatedAccount;
            }
            if ($currentUser && account) {
                mutualFollows = await getMutualFollowers(account.address);
                stats = await getGraphStats(account.address);
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    /**
     * Returns a string describing the mutual follows between the current user and the given account.
     */
    const getMutualFollowsText = (mutualFollows: Account[]): string => {
        const usernames: string[] = mutualFollows
            .filter((account) => account.username)
            .slice(0, 3)
            .map((account) => account.username!.localName.split('.')[0]);

        let includedNames = 0;
        for (let i = 0; i < usernames.length; i++) {
            if (usernames.slice(0, includedNames).join(', ').length > 25) {
                break;
            }
            // Only include another name if it won't push us past the 25-character limit
            if (usernames.slice(0, includedNames + 1).join(', ').length <= 25) {
                includedNames++;
            }
        }

        const nameText = usernames.slice(0, includedNames).join(', ');
        const remaining = mutualFollows.length - includedNames;
        const text = mutualFollows.length == 50 ? '50+' : `${remaining}`;

        if (remaining > 0) {
            return `Followed by ${nameText} and ${text} other${remaining > 1 ? 's' : ''} you follow`;
        } else {
            return `Followed by ${nameText}`;
        }
    };

    const onFollowError = (event: CustomEvent) => {
        if (event.detail instanceof Error) {
            onError(event.detail);
        }
    };
</script>

<div
    in:scale={{ duration: 100, opacity: 0.5, easing: cubicOut }}
    class="flex w-80 flex-col rounded-2xl border border-gray-200 bg-white p-5 text-base shadow-lg
    dark:border-gray-700 dark:bg-gray-900"
>
    <div class="flex items-start justify-between gap-2 pb-2">
        <a href={userAccountUrl} target="_blank" rel="noreferrer">
            <img
                src={avatarUrl}
                alt="Avatar"
                class="aspect-square w-16 cursor-pointer rounded-full bg-gray-300 object-cover text-white hover:opacity-80"
            />
        </a>

        {#if !loading && !isCurrentUserAccount}
            <div class="flex gap-2" in:fade={{ duration: 100 }}>
                <FollowButton {account} on:error={onFollowError} />
            </div>
        {/if}
    </div>

    {#if account.metadata?.name}
        <a
            href={userAccountUrl}
            target="_blank"
            rel="noreferrer"
            class="text-lg font-semibold !text-black !no-underline hover:!underline dark:!text-white"
        >
            {account.metadata.name}
        </a>
    {/if}

    <div class="-mt-0.5 flex flex-wrap items-center gap-2">
        <a
            href={userAccountUrl}
            target="_blank"
            rel="noreferrer"
            class="!text-base !text-orange-600 !no-underline hover:!text-orange-400 dark:!text-orange-300
          dark:hover:!text-orange-400"
        >
            {account.username ? account.username.localName : truncateAddress(account.owner)}
        </a>

        {#if account.operations?.isFollowingMe}
            <span class="badge variant-soft">Follows you</span>
        {/if}
    </div>

    {#if account.metadata?.bio}
        <div class="pt-3 text-sm">
            <SocialText text={account.metadata.bio} maxLength={150} />
        </div>
    {/if}

    {#if stats}
        <div class="flex gap-3 pt-3">
            <div>
                <span class="font-semibold">{formatFollowerCount(stats.following)}</span>
                <span class="opacity-60">Following</span>
            </div>

            <div>
                <span class="font-semibold">{formatFollowerCount(stats.followers)}</span>
                <span class="opacity-60">Followers</span>
            </div>
        </div>
    {/if}

    {#if mutualFollows && $currentUser && account}
        {#if mutualFollows.length > 0}
            <div class="flex gap-2 pt-3" in:slide={{ duration: 200 }}>
                <div class="overlap flex flex-shrink-0">
                    {#each mutualFollows.slice(0, 3) as mutualFollow (mutualFollow.address)}
                        <img
                            src={getAccountAvatar(mutualFollow)}
                            alt="Avatar"
                            class="h-7 w-7 rounded-full border-2 border-white bg-gray-300 object-cover text-white dark:border-gray-900"
                        />
                    {/each}
                </div>

                <div class="flex min-h-full items-center text-sm leading-tight opacity-60">
                    {getMutualFollowsText(mutualFollows)}
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
    .overlap > *:not(:first-child) {
        margin-left: -0.75rem;
    }
</style>
