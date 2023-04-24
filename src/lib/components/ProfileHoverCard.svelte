<script lang="ts">
    import {type Profile} from '../graph/lens-service';
    import {formatFollowerCount, getAvatarFromProfile, truncate} from '../utils';
    import {onMount} from 'svelte';
    import {getProfileById} from '../lens-profile';
    import {createEventDispatcher} from "svelte";
    import FollowButton from './FollowButton.svelte';
    import ProfileDescription from './ProfileDescription.svelte';
    const dispatch = createEventDispatcher();

    export let profile: Profile;

    $: avatarUrl = profile && getAvatarFromProfile(profile);

    const getMutualFollows = async () => {

    };

    onMount(async () => {
        const updatedProfile = await getProfileById(profile.id);
        if (updatedProfile) {
            profile = updatedProfile;
        }
    });
</script>

<div class="w-80 flex flex-col text-base rounded-2xl p-5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">

  <div class="flex justify-between items-start pb-2">
    <img src={avatarUrl} alt="Avatar"
         class="w-16 aspect-square rounded-full object-cover bg-gray-300 text-white">

    {#if !profile.isFollowedByMe}
        <FollowButton {profile}/>
    {/if}
  </div>

  {#if profile.name}
    <div class="text-lg font-semibold">
      {profile.name}
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-2">
    <span class="text-base text-orange-600 dark:text-orange-300">@{profile.handle}</span>
    {#if profile.isFollowing}
      <span class="badge variant-soft">Follows you</span>
    {/if}
  </div>

  {#if profile.bio}
    <div class="pt-3 text-base">
      <!--{truncate(profile.bio, 250)}-->
      <ProfileDescription text={profile.bio} />
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

</div>