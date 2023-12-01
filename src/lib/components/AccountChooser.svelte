<script lang="ts">
    // @ts-ignore
    import InlineSVG from 'svelte-inline-svg';
    import {currentUser} from '../stores/user-store'
    import LoadingSpinner from './LoadingSpinner.svelte'
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import { onLogin } from '../user/user';
    import { getAvatarForLensHandle, getAvatarFromAddress, truncateAddress } from '../utils/utils';
    import DarkModeSwitch from './DarkModeSwitch.svelte';
    import {darkMode} from '../stores/preferences-store';
    import { getManagedProfiles, login } from '../lens-service';
    import type { ProfileFragment } from '@lens-protocol/client';
    import { formatHandleV2toV1 } from '../utils/lens-utils';
    import { getAccounts } from '../evm/ethers-service';
    import {slide} from 'svelte/transition';

    export let anchorNode: Node | undefined = undefined;
    export let showSettings = true;
    export let standalone = false;

    let avatarError: Number[] = [];

    const launchOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    const showLogoutDialog = () => {
        const event = new CustomEvent('logout');
        anchorNode?.dispatchEvent(event);
    };

    const onProfileSelected = async (profile: ProfileFragment) => {
        if (profile.id === $currentUser?.profileId) {
            return;
        }

        const authenticatedProfile = await login(profile);
        await onLogin(authenticatedProfile);
    };

    const getSortedProfiles = async (account: string): Promise<ProfileFragment[]> => {
        const profiles = await getManagedProfiles(account);
        // sort first by owned profiles, then by publications stats
        return profiles.sort((a, b) => {
            if (a.ownedBy.address === account && b.ownedBy.address !== account) {
                return -1;
            } else if (a.ownedBy.address !== account && b.ownedBy.address === account) {
                return 1;
            } else {
                return b.stats.publications - a.stats.publications;
            }
        });
    }
</script>

<div class="bg-white rounded-xl flex flex-col shadow-lg border border-gray-200
     {standalone ? 'dark:bg-gray-800 dark:border-gray-700' : 'dark:bg-gray-700 dark:border-gray-600'}">

  {#await getAccounts() then accounts}

    {#await getSortedProfiles(accounts[0])}

      <div class="w-32 h-16 flex justify-center items-center">
        <LoadingSpinner/>
      </div>

    {:then profiles}

        {#if standalone}
            <div class="flex flex-col gap-1 px-5 pt-5 pb-2">
                <div class="text-xl font-semibold">
                    Select a profile
                </div>
                <div class="opacity-60 text-sm">
                    Choose a Lens profile to sign in with.
                </div>
            </div>

            <div class="absolute right-3 top-3">
                <form method="dialog">
                    <button class="p-2 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-full transition-none
                            focus:outline-orange-400 focus:ring-orange-400 focus:ring-offset-orange-200">
                        <svg class="w-5 h-5 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </form>
            </div>
        {:else if profiles.length > 1}
            <div class='px-4 pt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-default'>
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' class='w-4'
                     stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                    <path d='M17 2.1l4 4-4 4' />
                    <path d='M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4' />
                    <path d='M21 11.8v2a4 4 0 0 1-4 4H4.2' />
                </svg>
                <div class='font-semibold text-xs'>
                    Switch profile
                </div>
            </div>
        {/if}

      <div class="py-1 overflow-y-auto {standalone ? 'max-h-96 px-1' : 'max-h-32'}" in:slide>

        {#each profiles as p, index}

          {@const avatarUrl = p.handle ? getAvatarForLensHandle(p.handle.fullHandle) : getAvatarFromAddress(p.ownedBy.address)}

          <div class="group min-w-[16rem] flex items-center p-2 m-1 rounded-xl gap-3 cursor-pointer
               hover:bg-orange-300 {standalone ? 'dark:hover:bg-gray-900' : 'dark:hover:bg-gray-800'}"
               on:click={() => onProfileSelected(p)}>

            {#if !avatarUrl || avatarError[index]}
              <InlineSVG src={ImageAvatar}
                         class="w-8 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-300"/>
            {:else}
              <img src={avatarUrl} alt="Profile avatar" class="w-8 rounded-full object-cover"
                   on:error={() => {avatarError.push(index)}}>
            {/if}

            <div class="flex flex-col gap-0.5 grow">
              <div class="font-semibold text-sm text-black dark:text-white">
                  {p.metadata?.displayName || p.handle?.localName || truncateAddress(p.ownedBy.address)}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-300">
                  {p.handle ? `@${formatHandleV2toV1(p.handle.fullHandle)}` : truncateAddress(p.ownedBy.address)}
              </div>
            </div>

            {#if $currentUser?.handle === p.handle?.fullHandle && profiles.length > 1}
              <div class="mr-1 p-1.5 rounded-full bg-orange"></div>
            {/if}

          </div>

        {/each}

      </div>

        {#if !standalone}
            <div on:click={() => {$darkMode = !$darkMode}}
                 class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                <span class="text-black dark:text-white">
                    Dark mode
                </span>
                <DarkModeSwitch/>
            </div>

            <div class="p-1 border-t border-gray-200 dark:border-gray-600">
                {#if showSettings}
                    <button type="button" class="w-full px-2 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer
                            hover:bg-orange-300 dark:hover:bg-gray-800"
                            on:click={launchOptions}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             class="w-5 mx-1.5 text-gray-600 dark:text-gray-200"
                             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path
                                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span class="text-sm text-black dark:text-white">Settings</span>
                    </button>
                {/if}

                <button type="button" class="w-full px-2 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer
                        hover:bg-orange-300 dark:hover:bg-gray-800"
                        on:click={showLogoutDialog}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                         class="w-5 mx-1.5 text-gray-600 dark:text-gray-200"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M16 17l5-5-5-5M19.8 12H9"/>
                    </svg>
                    <span class="text-sm text-black dark:text-white">Log out</span>
                </button>
            </div>

        {/if}
    {/await}

  {/await}
</div>