<script lang="ts">
    import toast from 'svelte-french-toast';
    import type { ProfileFragment } from '@lens-protocol/client';
    import { followProfile, getProfile, unfollowProfile } from '../lens-service';

    export let profile: ProfileFragment;

    let hovering = false;

    const unfollow = async () => {
        const unfollowed = await unfollowProfile(profile.id);
        if (!unfollowed) {
            toast.error('Unable to unfollow profile', {duration: 5000});
            return;
        }
        const updated = await getProfile({profileId: profile.id});
        if (updated) profile = updated;
    };

    const follow = async () => {
        const followed = await followProfile(profile.id);
        if (!followed) {
            toast.error('Unable to follow profile', {duration: 5000});
            return;
        }
        const updated = await getProfile({profileId: profile.id});
        if (updated) profile = updated;
    };

    $: isFollowSupported = profile && (!profile.followModule || profile.operations.isFollowedByMe.value);
</script>

<button disabled={!isFollowSupported}
        class="btn btn-soft font-semibold text-sm
        {profile.operations.isFollowedByMe.value ? (hovering ? 'variant-ghost-error' : 'variant-ringed') : 'variant-filled-secondary'}"
        on:mouseenter={() => hovering = true}
        on:mouseleave={() => hovering = false}
        on:click={() => {
          if (profile.operations.isFollowedByMe.value) {
            unfollow();
          } else {
            follow();
          }
        }}>
  {#if profile.operations.isFollowedByMe.value}
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