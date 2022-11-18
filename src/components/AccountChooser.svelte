<script lang="ts">
    import {address, profile} from '../lib/store/user.js'
    import {getProfiles} from '../lib/lens-auth.js'
    import LoadingSpinner from '../new-post/components/LoadingSpinner.svelte'
    import InlineSVG from "svelte-inline-svg";
    import ImageAvatar from '../assets/ic_avatar.svg';

    let avatarError: Number[] = [];
</script>

<div class="bg-white dark:bg-gray-700 rounded-xl flex flex-col shadow-lg border border-gray-200 dark:border-gray-600">

  {#if $address}

    {#await getProfiles($address)}

      <div class="w-32 h-16 flex justify-center items-center">
        <LoadingSpinner/>
      </div>

    {:then profiles}

      <div class="px-4 py-2 flex justify-center items-center gap-2 text-gray-500 dark:text-gray-400
           border-b border-gray-200 dark:border-gray-600 cursor-default">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-4"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 2.1l4 4-4 4"/>
          <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
          <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
        </svg>

        <div class="font-semibold text-xs">
          Switch profiles
        </div>
      </div>

      {#each profiles as p, index}

        <div class="group min-w-[16rem] flex items-center py-3 pl-4 gap-4 cursor-pointer
             hover:bg-orange-300 dark:hover:bg-gray-800 last:rounded-b-xl"
             on:click={() => $profile = p}>

          {#if !p.picture?.original || avatarError[index]}
            <InlineSVG src={ImageAvatar}
                       class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-300" />
          {:else}
            <img src={p.picture?.original?.url} alt="Profile avatar" class="w-10 h-10 rounded-full object-cover"
                 on:error={() => {avatarError.push(index)}}>
          {/if}

          <div class="flex flex-col gap-0.5 grow">
            <div class="font-semibold text-base text-black dark:text-white">{p.name || p.handle}</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">@{p.handle}</div>
          </div>

          {#if $profile.handle === p.handle}

            <div class="px-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                   class="w-5 h-5 text-orange group-hover:text-white transition-none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>

          {/if}

        </div>

      {/each}

    {/await}

  {:else}

  {/if}
</div>

<style global>
  #post-avatar .tippy-box {
    background-color: transparent !important;
    padding: 0;
    margin: 0;
  }

  #post-avatar .tippy-content {
    padding: 0 !important;
  }
</style>