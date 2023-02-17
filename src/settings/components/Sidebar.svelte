<script lang="ts">
    //@ts-ignore
    import tippy from "sveltejs-tippy";
    import InlineSVG from "svelte-inline-svg";
    import focalizeLogo from '../../assets/focalize-logo-large.svg';
    import {releaseDismissed} from '../../lib/store/preferences-store';
    import {getLatestRelease} from "../../lib/github-api";
    import {createEventDispatcher, getContext} from "svelte";

    const activeTab = getContext('activeTab');

    const dispatch = createEventDispatcher();

    const tabs = [
        {
            name: 'General settings',
            enabled: true,
            event: 'generalSettingsClick',
            icon: '<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>'
        },
        {
            name: 'Edit profile',
            enabled: false,
            event: 'editProfileClick',
            icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
        },
        {
            name: 'Notification settings',
            enabled: true,
            event: 'notificationSettingsClick',
            icon: '<path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>'
        },
        {
            name: 'Share feedback',
            enabled: true,
            event: 'shareFeedbackClick',
            icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
        },
    ];

    const getVersionName = () => chrome.runtime.getManifest().version_name;

    const onShareFeedbackClick = () => {
        window.open('https://github.com/FocalizeApp/focalize-extension/issues', '_blank');
    };

    const onTabClick = (tab, index) => {
        if (tab.name === 'Share feedback') {
            onShareFeedbackClick();
            return;
        }
        if (tab.enabled) $activeTab = index;
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
                  {$activeTab === index ? 'text-neutral-800 dark:text-white' : 'border-transparent text-neutral-400'}">

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

            {#if $activeTab === index}
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
                 rel="noreferrer" class="block">
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
          <a href="https://lenster.xyz/u/focalize" title="Lenster" target="_blank" rel="noreferrer"
             class="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-5 transition-none">
              <path
                  d="m23.274 20.76-.246.114a7.502 7.502 0 0 1-7.14-.492 6.058 6.058 0 0 0 4.524-.606l.258-.144-.72-1.266-.258.15c-.048.03-.096.054-.144.078a4.577 4.577 0 0 1-4.524-.138 4.672 4.672 0 0 1-2.244-3.372c1.71-.156 5.904-.888 9.27-4.254.09-.09.18-.18.264-.27.93-.984 1.374-2.154 1.278-3.39-.084-1.086-.582-2.136-1.398-2.952-.816-.816-1.872-1.32-2.952-1.398-.966-.078-1.914.186-2.748.756-.186-.996-.666-1.842-1.404-2.478C14.262.39 13.17 0 12.012 0S9.756.39 8.934 1.098c-.738.636-1.218 1.482-1.404 2.478-.834-.57-1.776-.834-2.748-.756-1.086.084-2.136.582-2.952 1.398C1.008 5.04.51 6.09.432 7.17.336 8.406.78 9.576 1.71 10.56c.084.09.174.18.264.27 3.366 3.366 7.554 4.098 9.27 4.254A4.689 4.689 0 0 1 9 18.456a4.563 4.563 0 0 1-4.524.138c-.048-.024-.096-.054-.144-.078l-.258-.15-.72 1.266.258.144a6.065 6.065 0 0 0 4.524.606 7.502 7.502 0 0 1-7.14.492L.75 20.76 0 22.02l.294.138a9.094 9.094 0 0 0 5.76.63 8.832 8.832 0 0 0 4.998-3.126c.078-.096.15-.198.228-.294v3.642h1.452v-3.654c.078.102.15.21.234.306a8.832 8.832 0 0 0 4.998 3.126 8.977 8.977 0 0 0 5.76-.63L24 22.02l-.726-1.26ZM8.88 5.022c0-.084-.006-.168-.006-.258 0-.114 0-.228.006-.336C8.934 2.376 10.536 1.44 12 1.44c1.464 0 3.066.936 3.12 2.988.006.114.006.228.006.336 0 .09 0 .174-.006.264l-.054 1.956 1.362-1.44c.054-.06.108-.114.168-.174.078-.078.162-.156.24-.234 1.488-1.41 3.282-.942 4.32.096 1.038 1.038 1.506 2.826.096 4.32a8.941 8.941 0 0 1-.234.24c-3.798 3.81-8.97 3.876-9.018 3.876-.054 0-5.214-.066-9.018-3.87-.078-.078-.156-.162-.234-.24-1.41-1.494-.942-3.282.096-4.32.624-.624 1.446-.984 2.25-.984.75 0 1.446.3 2.07.888.084.078.162.156.24.234.06.066.12.126.186.192L8.94 6.99l-.06-1.968Z"
                  fill="currentColor" fill-rule="nonzero"/>
            </svg>
          </a>
          <a href="https://github.com/FocalizeApp/focalize-extension" title="Github" target="_blank"
             rel="noreferrer" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500">
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