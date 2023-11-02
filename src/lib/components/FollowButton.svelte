<script lang="ts">
    import toast from 'svelte-french-toast';
    import type { ProfileFragment } from '@lens-protocol/client';
    import { followProfile, getProfile, unfollowProfile } from '../lens-service';
    import LoadingSpinner from './LoadingSpinner.svelte';

    export let profile: ProfileFragment;

    let hovering = false;
    let optimisticFollow = false;
    let processing = false;

    const unfollow = async () => {
        processing = true;
        try {
            const unfollowed = await unfollowProfile(profile.id);
            if (!unfollowed) {
                toast.error('Unable to unfollow profile', { duration: 5000 });
                return;
            }
            const updated = await getProfile({ profileId: profile.id });
            if (updated) profile = updated;
        } finally {
            processing = false;
        }
    };

    const follow = async () => {
        processing = true;
        try {
            const followed = await followProfile(profile.id);
            if (!followed) {
                toast.error('Unable to follow profile', { duration: 5000 });
                return;
            }
            optimisticFollow = true;
            const updated = await getProfile({ profileId: profile.id });
            if (updated) profile = updated;
        } finally {
            processing = false;
        }
    };

    $: isFollowing = profile.operations.isFollowedByMe.value || optimisticFollow;
    $: isFollowSupported = profile && (!profile.followModule || isFollowing);
</script>

<button disabled={!isFollowSupported}
        class="btn btn-soft font-semibold text-sm
        {isFollowing ? (hovering ? 'variant-ghost-error' : 'variant-ringed') : 'variant-filled-secondary'}"
        on:mouseenter={() => hovering = true}
        on:mouseleave={() => hovering = false}
        on:click={() => {
          if (isFollowing) {
            unfollow();
          } else {
            follow();
          }
        }}>
    {#if processing}
        <LoadingSpinner/>
    {:else if isFollowing}
        {#if hovering}
            <span>Unfollow</span>
        {:else}
            <span>Following</span>
        {/if}
    {:else}
        {#if profile.operations.isFollowingMe.value}
            <span>Follow back</span>
        {:else}
            <span>Follow</span>
        {/if}
    {/if}
</button>