<script lang="ts">
    import {address, profile} from '../lib/store/user.js'
    import {getProfiles} from '../lib/lens-auth.js'
    import LoadingSpinner from '../new-post/components/LoadingSpinner.svelte'
    import InlineSVG from "svelte-inline-svg";
    import ImageAvatar from '../assets/ic_avatar.svg';
    import {push} from 'svelte-spa-router';

    export let anchorNode;
    export let showSettings = true;

    let avatarError: Number[] = [];

    const launchOptions = () => {
        chrome.windows.getCurrent((window: Window) => {
            if (window['type'] === 'popup') {
                chrome.runtime.openOptionsPage();
            } else {
                push('/src/')
            }
        });
    };

    const showLogoutDialog = () => {
        const event = new CustomEvent('logout');
        anchorNode.dispatchEvent(event);
    };
</script>

<div class="bg-white dark:bg-gray-700 rounded-xl flex flex-col shadow-lg border border-gray-200 dark:border-gray-600">

  {#if $address}

    {#await getProfiles($address)}

      <div class="w-32 h-16 flex justify-center items-center">
        <LoadingSpinner/>
      </div>

    {:then profiles}

      <div class="px-4 pt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-default">
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

      <div class="py-1">

        {#each profiles as p, index}

          <div class="group min-w-[16rem] flex items-center p-2 m-1 rounded-xl gap-3 cursor-pointer
               hover:bg-orange-300 dark:hover:bg-gray-800"
               on:click={() => $profile = p} on:keydown={() => this.click()}>

            {#if !p.picture?.original || avatarError[index]}
              <InlineSVG src={ImageAvatar}
                         class="w-8 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-300"/>
            {:else}
              <img src={p.picture?.original?.url} alt="Profile avatar" class="w-8 rounded-full object-cover"
                   on:error={() => {avatarError.push(index)}}>
            {/if}

            <div class="flex flex-col gap-0.5 grow">
              <div class="font-semibold text-sm text-black dark:text-white">{p.name || p.handle}</div>
              <div class="text-xs text-gray-600 dark:text-gray-300">@{p.handle}</div>
            </div>

            {#if $profile?.handle === p.handle}
              <div class="mr-1 p-1.5 rounded-full bg-orange"></div>
            {/if}

          </div>

        {/each}

      </div>

      <div class="p-1 border-t border-gray-200 dark:border-gray-600">
        {#if showSettings}
          <button type="button" class="w-full px-2 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer
               hover:bg-orange-300 dark:hover:bg-gray-800"
               on:click={launchOptions}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-5 mx-1.5"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <div class="text-sm text-black dark:text-white">Settings</div>
          </button>
        {/if}

        <button type="button" class="w-full px-2 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer
             hover:bg-orange-300 dark:hover:bg-gray-800"
             on:click={showLogoutDialog}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-5 mx-1.5"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M16 17l5-5-5-5M19.8 12H9"/>
          </svg>
          <div class="text-sm text-black dark:text-white">Log out</div>
        </button>
      </div>

    {/await}

  {/if}
</div>