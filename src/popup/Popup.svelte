<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {darkMode, messagesUnreadCount, unreadNotificationsCount} from '../lib/stores/preferences-store';
    import {storePopup, TabGroup, Tab} from '@skeletonlabs/skeleton';
    import NotificationsList from './notifications/NotificationsList.svelte';
    import {clearBadge, getOpenGraphTags, launchComposerWindow, scrollEndListener} from '../lib/utils';
    import {DateTime} from 'luxon';
    import {onMount} from 'svelte';
    import {Toaster} from 'svelte-french-toast';
    import ThreadList from './messaging/ThreadList.svelte';
    import {ensureUser} from '../lib/user';
    import {selectedMainTab} from '../lib/stores/cache-store';
    import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';

    let notificationsList: NotificationsList;
    let conversationsList: ThreadList;

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    const onCreatePostClick = async () => {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        console.log('tab', tab);
        if (!tab.id || !tab.url) {
            await launchComposerWindow();
            return;
        }

        const url = tab.url;
        const title = tab.title;

        // If the current tab is a chrome page, update the current tab with the extension page
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
            try {
                const url = chrome.runtime.getURL('src/window/index.html');
                if (tab.url.startsWith('chrome-extension://' + chrome.runtime.id)) {
                    await chrome.tabs.create({url});
                } else {
                    await chrome.tabs.update(tab.id, {url});
                }
            } finally {
                window.close();
            }
            return;
        }

        try {
            const injected = await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                func: getOpenGraphTags
            });

            const tags = injected[0]?.result ?? {};

            if (!tags?.title) tags.title = title;
            tags.icon = tab.favIconUrl;
            tags.url = url;

            return launchComposerWindow(tags);
        } catch (e) {
            console.error(e);
        }
        return launchComposerWindow({title, url});
    };

    const getLastNotificationUpdateDate = async () => {
        const syncStorage = await chrome.storage.sync.get('notificationsTimestamp');
        return syncStorage.notificationsTimestamp ? DateTime.fromISO(syncStorage.notificationsTimestamp) : null;
    };

    const onSettingsClick = () => {
        chrome.runtime.openOptionsPage();
        window.close();
    };

    const onNotificationsTabClick = async () => {
        if ($selectedMainTab !== 0) return;
        await chrome.storage.local.remove(['notificationItemsCache', 'notificationPageInfoCache']);
    };

    const scrollToTop = () => {
        if (notificationsList) {
            // @ts-ignore
            notificationsList.scrollToTop();
        } else if (conversationsList) {
            // @ts-ignore
            conversationsList.scrollToTop();
        }
    };

    onMount(async () => {
        await ensureUser();
        await clearBadge();
        storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
    });
</script>

<div class="w-full h-full flex flex-col">

  <TabGroup regionPanel="w-full flex-grow overflow-y-auto min-h-0 my-0"
            regionList="flex-shrink-0"
            padding="px-6 py-3"
            border="border-b border-gray-200 dark:border-gray-700"
            class="flex flex-col h-full !space-y-0">

    <Tab bind:group={$selectedMainTab} name="tab1" value={0} on:click={onNotificationsTabClick}>
      <div class="relative inline-block w-full h-full">
        {#if $selectedMainTab !== 0 && $unreadNotificationsCount > 0}
          <span class="w-2 h-2 variant-filled-primary absolute -top-1.5 -right-1.5 z-10 rounded-full"></span>
        {/if}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-6 h-6"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
    </Tab>

    <Tab bind:group={$selectedMainTab} name="tab2" value={1}>
      <div class="relative inline-block w-full h-full">
        {#if $selectedMainTab !== 1 && $messagesUnreadCount > 0}
          <span class="w-2 h-2 variant-filled-primary absolute -top-1.5 -right-1.5 z-10 rounded-full"></span>
        {/if}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-6 h-6"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      </div>
    </Tab>

    <div on:click={scrollToTop}
         class="w-full flex justify-end items-center px-2">
      <button type="button" on:click|stopPropagation={onCreatePostClick}
              use:tippy={{content: 'New post', placement: 'bottom', delay: 500}}
              class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
        </svg>
      </button>

      <button type="button" on:click|stopPropagation={onSettingsClick}
              use:tippy={{content: 'Settings', placement: 'bottom', delay: 500}}
              class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>

    <!-- Tab Panels --->
    <svelte:fragment slot="panel">

      {#if $selectedMainTab === 0}

        {#await getLastNotificationUpdateDate() then lastUpdate}
          <NotificationsList {lastUpdate} bind:this={notificationsList}/>
        {/await}

      {:else if $selectedMainTab === 1}

        <ThreadList bind:this={conversationsList} on:messagesDisabled={() => $selectedMainTab = 0} />

      {/if}

    </svelte:fragment>

  </TabGroup>

</div>

<Toaster/>