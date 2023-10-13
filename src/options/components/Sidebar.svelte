<script lang="ts">
    import InlineSVG from "svelte-inline-svg";
    import focalizeLogo from '../../assets/focalize-logo-large.svg';
    import {releaseDismissed} from '../../lib/stores/preferences-store';
    import {getLatestRelease} from "../../lib/github-service";
    import {createEventDispatcher} from "svelte";
    import { queryParams } from '../../lib/stores/url-query-store';

    const dispatch = createEventDispatcher();

    type Tab = {
        name: string,
        enabled: boolean,
        event: string,
        icon: string,
        tag?: string,
    }

    const tabs: Tab[] = [
        {
            name: 'General Settings',
            enabled: true,
            event: 'generalSettingsClick',
            icon: '<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>',
            tag: 'general'
        },
        {
            name: 'Lens Profile',
            enabled: false,
            event: 'editProfileClick',
            icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            tag: 'profile'
        },
        {
            name: 'Lens Notifications',
            enabled: true,
            event: 'notificationSettingsClick',
            icon: '<path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>',
            tag: 'notifications'
        },
        {
            name: 'Messaging',
            enabled: true,
            event: 'messagingSettingsClick',
            icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>',
            tag: 'messaging'
        },
        {
            name: 'Share feedback',
            enabled: true,
            event: 'shareFeedbackClick',
            icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
        },
    ];

    let activeTab: string = $queryParams.tab ?? tabs[0].tag;

    $: if (activeTab) {
        $queryParams.tab = activeTab;
    }

    const getVersionName = () => chrome.runtime.getManifest().version_name;

    const onShareFeedbackClick = () => {
        window.open('https://github.com/FocalizeApp/focalize-extension/issues', '_blank');
    };

    const onTabClick = (tab: Tab, index: number) => {
        if (tab.name === 'Share feedback') {
            onShareFeedbackClick();
            return;
        }
        if (tab.enabled && tab.tag) activeTab = tab.tag;
        dispatch('tabClick', index);
    }

</script>

<div
    class="relative hidden h-screen border-r border-r-gray-200 bg-neutral-50 dark:bg-gray-900 dark:border-r-gray-700 lg:block w-80">

  <div class="flex flex-col h-full">

    <div class="flex items-center justify-start pt-6 ml-4">
      <InlineSVG class="h-8 w-8 inline ml-1" src={focalizeLogo} alt="Focalize"/>
      <div class="text-xl font-bold ml-2 text-neutral-800 dark:text-white">
        Focalize
      </div>
    </div>

    <nav class="mt-6 flex-grow">

      <div class="flex flex-col gap-3">

        {#each tabs as tab, index}
          <button on:click={() => onTabClick(tab, index)} disabled={!tab.enabled}
                  class="flex items-center justify-start text-start w-auto p-2 pl-6 transition-colors duration-200 rounded-full gap-1
                  {tab.enabled ? 'hover:text-neutral-800 dark:hover:text-gray-200' : ''}
                  {activeTab === tab.tag ? 'text-neutral-800 dark:text-white' : 'border-transparent text-neutral-400'}">

            <span class="text-left">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="transition-none w-5 h-5"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                {@html tab.icon}
              </svg>
            </span>

            <span class="px-2 text-lg font-medium flex items-center gap-2">
              {tab.name}
              {#if !tab.enabled}
                <span class="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full font-normal opacity-80 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" class="inline w-3">
                    <!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->
                    <path d="M413.5 237.5c-28.2 4.8-58.2-3.6-80-25.4l-38.1-38.1C280.4 159 272 138.8 272 117.6V105.5L192.3 62c-5.3-2.9-8.6-8.6-8.3-14.7s3.9-11.5 9.5-14l47.2-21C259.1 4.2 279 0 299.2 0h18.1c36.7 0 72 14 98.7 39.1l44.6 42c24.2 22.8 33.2 55.7 26.6 86L503 183l8-8c9.4-9.4 24.6-9.4 33.9 0l24 24c9.4 9.4 9.4 24.6 0 33.9l-88 88c-9.4 9.4-24.6 9.4-33.9 0l-24-24c-9.4-9.4-9.4-24.6 0-33.9l8-8-17.5-17.5zM27.4 377.1L260.9 182.6c3.5 4.9 7.5 9.6 11.8 14l38.1 38.1c6 6 12.4 11.2 19.2 15.7L134.9 484.6c-14.5 17.4-36 27.4-58.6 27.4C34.1 512 0 477.8 0 435.7c0-22.6 10.1-44.1 27.4-58.6z"/>
                  </svg>
                  Soon
                </span>
              {/if}
            </span>

            {#if activeTab === tab.tag}
              <div class="flex flex-grow justify-end pr-1">
                <div class="p-1.5 rounded-full bg-orange"></div>
              </div>
            {/if}

          </button>
        {/each}

      </div>
    </nav>

    <div class="flex flex-col">

      {#await getLatestRelease() then release}
        {#if $releaseDismissed !== release.name}
          <div class="relative flex flex-col rounded bg-white border dark:bg-gray-800 dark:border-gray-700 m-3 p-4 gap-1
                   hover:bg-orange-50 dark:hover:bg-gray-700">

            <div class="flex items-center font-bold text-base text-gray-700 dark:text-white gap-1">

              <svg xmlns="http://www.w3.org/2000/svg" class="inline w-5 transition-none" viewBox="0 0 24 24"
                   fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="2"></circle>
                <path
                    d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
              </svg>

              <a href="https://github.com/FocalizeApp/focalize-extension/releases/latest" target="_blank"
                 rel="noreferrer" class="block tracking-tight">
                What's new in {release.name}?
              </a>
            </div>

            <p class="text-gray-500 dark:text-gray-400 whitespace-pre-wrap line-clamp-6">
              {release.body}
            </p>

            <button on:click={() => $releaseDismissed = release.name}
                    class="w-fit text-orange-700 dark:text-orange-400 font-medium hover:underline pt-1 text-start">
              Dismiss
            </button>

          </div>
        {/if}
      {/await}

      <div
          class="flex items-center justify-between px-4 py-2 border-t border-t-gray-200 dark:border-t-gray-700 text-gray-500 dark:text-neutral-300">
        <a class="text-sm"
           href="https://github.com/FocalizeApp/focalize-extension/releases/tag/{'v' + getVersionName()}"
           target="_blank" rel="noreferrer">
          v{getVersionName()}
        </a>

        <div class="flex gap-2 items-center">
          <a href="https://hey.xyz/u/focalize" title="Hey" target="_blank" rel="noreferrer"
             class="w-9 h-9 flex justify-center items-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-500">
              <svg viewBox='0 0 290 186' fill='currentColor' class='w-6 transition-none'>
                  <path
                      d='M145.24.08c13.96 0 27.11 4.67 36.99 13.16 10.36 8.89 16.4 21.24 17.62 35.88 11.21-9.5 24.22-13.96 37.83-12.92 12.99.99 25.59 6.97 35.46 16.85 9.88 9.88 15.86 22.47 16.85 35.47 1.12 14.73-4.19 28.75-15.35 40.55a211.07 211.07 0 0 1-3.31 3.41c-52.846 52.836-121.756 53.963-125.992 53.98h-.108c-2.94 0-72.72-.61-126.08-53.98a151.15 151.15 0 0 1-3.31-3.41C4.67 117.27-.64 103.25.49 88.52c.99-12.99 6.97-25.59 16.85-35.47 9.88-9.88 22.47-15.86 35.47-16.85 13.61-1.04 26.62 3.42 37.83 12.92 1.21-14.64 7.26-26.99 17.61-35.88C118.14 4.75 131.28.08 145.24.08Zm15.1 141.36c-2.7 4.96-8.68 8.17-15.23 8.17-6.55 0-12.52-3.21-15.23-8.17l-7.03 3.83c4.08 7.49 12.82 12.34 22.25 12.34s18.17-4.85 22.27-12.34Zm-56.1-42.85c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.223 0 2.426.071 3.603.21a11.507 11.507 0 0 0-5.913 10.06c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.58-.043-1.15-.126-1.708 3.297 3.63 5.256 8.152 5.256 13.048h8c0-16.33-15.18-29.61-33.84-29.61Zm82.06 0c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.225 0 2.431.072 3.611.211A11.507 11.507 0 0 0 184 116.86c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.576-.042-1.142-.124-1.695 3.29 3.627 5.244 8.145 5.244 13.035h8c0-16.33-15.18-29.61-33.84-29.61Z' />
              </svg>
          </a>
          <a href="https://github.com/FocalizeApp/focalize-extension" title="Github" target="_blank"
             rel="noreferrer" class="w-9 h-9 flex justify-center items-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-500">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-5 transition-none">
              <path
                  d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.627-5.373-12-12-12"
                  fill="currentColor" fill-rule="nonzero"/>
            </svg>
          </a>
        </div>
      </div>
    </div>

  </div>

</div>

<style>
</style>