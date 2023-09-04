<script lang="ts">
    import type {Profile} from '../graph/lens-service';
    import {formatFollowerCount, getAvatarForLensHandle, launchThreadWindow} from '../utils/utils';
    import {onMount} from 'svelte';
    import {getMutualFollows, getProfileById} from '../user/lens-profile';
    import FollowButton from './FollowButton.svelte';
    import SocialText from './SocialText.svelte';
    import {currentUser} from '../stores/user-store';
    import {getProfileUrl} from '../publications/lens-nodes';
    import {nodeSearch} from '../stores/preferences-store';
    import {canMessage, findThread, isXmtpEnabled} from "../xmtp-service";
    import LoadingSpinner from "./LoadingSpinner.svelte";

    export let profile: Profile;

    let loading = true;
    let mutualFollows: { profiles: Profile[], total: number } | undefined;
    let isMessaging = false;

    $: avatarUrl = profile && getAvatarForLensHandle(profile.handle);
    $: userProfileUrl = profile && $nodeSearch && getProfileUrl($nodeSearch, profile.handle);
    $: isCurrentUserProfile = profile && profile.id === $currentUser?.profileId;

    const canMessageProfile = async (): Promise<boolean> => {
      if (!$currentUser || !profile) return false;
      const xmtpEnabled = await isXmtpEnabled();
      const available = canMessage(profile.ownedBy);
      return xmtpEnabled && available;
    };

    const onMessageBtnClick = async () => {
      const address = profile?.ownedBy;
      if (!address) return;

      isMessaging = true;

      const existingThread = await findThread(address);
      if (existingThread) {
        const topic = existingThread.conversation.topic;
        await launchThreadWindow({topic});
        isMessaging = false;
        return;
      }

      await launchThreadWindow({address})
      isMessaging = false;
    };

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

  <div class="flex justify-between items-start pb-2 gap-2">
    <a href={userProfileUrl} target="_blank" rel="noreferrer">
      <img src={avatarUrl} alt="Avatar"
           class="w-16 aspect-square rounded-full object-cover bg-gray-300 text-white cursor-pointer hover:opacity-80">
    </a>

    {#if !loading && !isCurrentUserProfile}
      {#await canMessageProfile() then dmsEnabled}
        {#if dmsEnabled}
          <div class="flex-grow flex justify-end h-full items-center">
            <button type="button" on:click={onMessageBtnClick} disabled={isMessaging}
                    class="flex items-center justify-center w-10 h-10 rounded-full
                    border border-gray-200 dark:border-gray-700
                    hover:bg-gray-200 dark:hover:bg-gray-700">
              {#if isMessaging}
                <LoadingSpinner size="w-5 h-5" />
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-5 h-5"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              {/if}
            </button>
          </div>
        {/if}
      {/await}

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