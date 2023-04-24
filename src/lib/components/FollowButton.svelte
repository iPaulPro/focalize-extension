<script lang="ts">
    import type {
        Profile,
        ProfileFollowModuleSettings
    } from '../graph/lens-service';
    import {currentUser} from '../stores/user-store';

    export let profile: Profile;

    let hovering = false;

    const unfollow = async () => {
        profile.isFollowedByMe = false;
    };

    const follow = async () => {
        profile.isFollowedByMe = true;
    };

    const isProfileFollowModuleSettings = (obj: any): obj is ProfileFollowModuleSettings =>
        obj.__typename === 'ProfileFollowModuleSettings';

    $: isCurrentUserProfile = profile && profile.id === $currentUser?.profileId;
    $: isFollowSupported = profile && !isCurrentUserProfile && (!profile.followModule || profile.isFollowedByMe || isProfileFollowModuleSettings(profile.followModule));
</script>

<button disabled={!isFollowSupported}
        class="btn btn-soft font-semibold text-sm {isCurrentUserProfile ? 'hidden' : ''}
        {profile.isFollowedByMe ? (hovering ? 'variant-ghost-error' : 'variant-ringed') : 'variant-filled'}"
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