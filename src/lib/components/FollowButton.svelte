<script lang="ts">
    import type {
        Profile,
        ProfileFollowModuleSettings
    } from '../graph/lens-service';
    import {followProfile, unfollowProfile} from '../user/lens-profile';
    import toast from 'svelte-french-toast';

    export let profile: Profile;

    let hovering = false;

    const unfollow = async () => {
        profile.isFollowedByMe = false;

        const unfollowed = await unfollowProfile(profile);
        if (!unfollowed) {
            profile.isFollowedByMe = true;
            toast.error('Unable to unfollow profile', {duration: 5000});
        }
    };

    const follow = async () => {
        profile.isFollowedByMe = true;

        const followed = await followProfile(profile);
        if (!followed) {
            profile.isFollowedByMe = false;
            toast.error('Unable to follow profile', {duration: 5000});
        }
    };

    const isProfileFollowModuleSettings = (obj: any): obj is ProfileFollowModuleSettings =>
        obj.__typename === 'ProfileFollowModuleSettings';

    $: isFollowSupported = profile && (!profile.followModule || profile.isFollowedByMe || isProfileFollowModuleSettings(profile.followModule));
</script>

<button disabled={!isFollowSupported}
        class="btn btn-soft font-semibold text-sm
        {profile.isFollowedByMe ? (hovering ? 'variant-ghost-error' : 'variant-ringed') : 'variant-filled-secondary'}"
        on:mouseenter={() => hovering = true}
        on:mouseleave={() => hovering = false}
        on:click={() => {
          if (profile.isFollowedByMe) {
            unfollow();
          } else {
            follow();
          }
        }}>
  {#if profile.isFollowedByMe}
    {#if hovering}
      <span>Unfollow</span>
    {:else}
      <span>Following</span>
    {/if}
  {:else}
    {#if profile.isFollowing}
      <span>Follow back</span>
    {:else}
      <span>Follow</span>
    {/if}
  {/if}
</button>