<script lang="ts">
    import {type Profile} from '../graph/lens-service';
    import {formatFollowerCount, getAvatarForLensHandle, truncate} from '../utils';
    import {onMount} from 'svelte';
    import {getMutualFollows, getProfileById} from '../lens-profile';
    import {createEventDispatcher} from 'svelte';
    import FollowButton from './FollowButton.svelte';
    import SocialText from './SocialText.svelte';
    import {currentUser} from '../stores/user-store';
    import {getProfileUrl} from '../lens-nodes';
    import {nodeSearch} from '../stores/preferences-store';

    const dispatch = createEventDispatcher();

    export let profile: Profile;

    let loading = true;
    let mutualFollows: { profiles: Profile[], total: number } | undefined;

    $: avatarUrl = profile && getAvatarForLensHandle(profile.handle);
    $: userProfileUrl = profile && $nodeSearch && getProfileUrl($nodeSearch, profile.handle);
    $: isCurrentUserProfile = profile && profile.id === $currentUser?.profileId;

    onMount(async () => {
        try {
            const updatedProfile = await getProfileById(profile.id);
            if (updatedProfile) {
                profile = updatedProfile;
            }
            if ($currentUser && profile) {
                mutualFollows = await getMutualFollows(profile.id, $currentUser.profileId, 3);
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    /**
     * Returns a string describing the mutual follows between the current user and the given profile.
     */
    const getMutualFollowsText = (mutualFollows: { profiles: Profile[], total: number }): string => {
        const usernames: string[] = mutualFollows.profiles.slice(0, 3).map(profile => profile.handle.split('.')[0]);

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
        const remaining = mutualFollows.total - includedNames;

        if (remaining > 0) {
            return `Followed by ${nameText} and ${remaining} other${remaining > 1 ? 's' : ''} you follow`;
        } else {
            return `Followed by ${nameText}`;
        }
    };
</script>

<div
    class="w-80 flex flex-col text-base rounded-2xl p-5 bg-white dark:bg-gray-900 border border-gray-200
    dark:border-gray-700 shadow-lg">

  <div class="flex justify-between items-start pb-2">
    <a href={userProfileUrl} target="_blank" rel="noreferrer">
      <img src={avatarUrl} alt="Avatar"
           class="w-16 aspect-square rounded-full object-cover bg-gray-300 text-white cursor-pointer hover:opacity-80">
    </a>

    {#if !loading && !isCurrentUserProfile}
      <FollowButton {profile}/>
    {/if}
  </div>

  {#if profile.name}
    <a href={userProfileUrl} target="_blank" rel="noreferrer"
       class="!no-underline !text-black dark:!text-white text-lg font-semibold hover:!underline">
      {profile.name}
    </a>
  {/if}

  <div class="flex flex-wrap items-center gap-2 -mt-0.5">
    <a href={userProfileUrl} target="_blank" rel="noreferrer"
       class="!no-underline !text-base !text-orange-600 dark:!text-orange-300 hover:!text-orange-400
          dark:hover:!text-orange-400">
      @{profile.handle.split('.')[0]}
    </a>

    {#if profile.isFollowing}
      <span class="badge variant-soft">Follows you</span>
    {/if}
  </div>

  {#if profile.bio}
    <div class="pt-3 text-base">
      <SocialText text={profile.bio} maxLength={150}/>
    </div>
  {/if}

  <div class="flex gap-3 pt-3">
    <div>
      <span class="font-semibold">{formatFollowerCount(profile.stats.totalFollowing)}</span>
      <span class="opacity-60">Following</span>
    </div>

    <div>
      <span class="font-semibold">{formatFollowerCount(profile.stats.totalFollowers)}</span>
      <span class="opacity-60">Followers</span>
    </div>
  </div>

  {#if mutualFollows && $currentUser && profile}

    {#if mutualFollows.profiles.length > 0}

      <div class="pt-3 flex gap-2">

        <div class="flex flex-shrink-0 overlap">
          {#each mutualFollows.profiles as mutualFollow}
            <img src={getAvatarForLensHandle(mutualFollow.handle)} alt="Avatar"
                 class="w-7 h-7 rounded-full object-cover bg-gray-300 text-white border-2 border-white dark:border-gray-900">
          {/each}
        </div>

        <div class="text-sm opacity-60 leading-tight min-h-full flex items-center">
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