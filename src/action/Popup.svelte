<script lang="ts">
    //@ts-ignore
    import tippy from "sveltejs-tippy";
    import {darkMode} from "../lib/stores/preferences-store";
    import {TabGroup, Tab} from '@skeletonlabs/skeleton';
    import NotificationsList from "./components/NotificationsList.svelte";
    import {launchComposerWindow} from "../lib/utils";
    import {DateTime} from "luxon";

    let tabSet: number = 0;

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    const parseOGTags = (): {
        url?: string;
        title?: string | null,
        description?: string | null
    } => ({
        title: document.head.querySelector("meta[property='og:title']")?.getAttribute("content") ||
            document.head.querySelector("meta[name='twitter:title']")?.getAttribute("content"),
        description: document.head.querySelector("meta[property='og:description']")?.getAttribute("content") ||
            document.head.querySelector("meta[name='description']")?.getAttribute("content") ||
            document.head.querySelector("meta[name='twitter:description']")?.getAttribute("content")
    });

    const onCreatePostClick = async () => {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const url = tab.url!!;
        const title = tab.title;

        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
            chrome.tabs.update(
                // @ts-ignore
                tab.id,
                {
                    url: chrome.runtime.getURL('src/window/index.html')
                }
            ).catch(console.error);
            window.close();
            return;
        }

        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: parseOGTags
        }).then(results => {
            const tags = results[0]?.result;
            if (tags) {
                console.log('found open graph tags', tags);
                tags.url = url; // og:url is often misused
                if (!tags.title) tags.title = title;
                return launchComposerWindow(tags);
            } else {
                console.log('no tags found')
                return launchComposerWindow({title, url});
            }
        }).catch(e => {
            console.error(e)
            launchComposerWindow({title, url});
        })

        return {url, title};
    };

    const getLastNotificationUpdateDate = async () => {
        const syncStorage = await chrome.storage.sync.get('notificationsTimestamp');
        return syncStorage.notificationsTimestamp ? DateTime.fromISO(syncStorage.notificationsTimestamp) : null;
    };

    const onSettingsClick = () => {
        chrome.runtime.openOptionsPage();
        window.close();
    };
</script>

<div class="w-full h-full flex flex-col">

  <TabGroup regionPanel="w-full flex-grow overflow-y-auto min-h-0 my-0" regionList="flex-shrink-0" padding="px-6 py-3"
            border="border-b border-gray-200 dark:border-gray-700" class="flex flex-col h-full !space-y-0">
    <Tab bind:group={tabSet} name="tab1" value={0}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-6 h-6"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
      </svg>
    </Tab>
    <Tab bind:group={tabSet} name="tab2" value={1}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-6 h-6"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    </Tab>

    <div class="w-full flex justify-end items-center px-2">
      <button type="button" on:click={onCreatePostClick}  use:tippy={{content: 'New post', placement: 'bottom', delay: 500}}
              class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
        </svg>
      </button>

      <button type="button" on:click={onSettingsClick} use:tippy={{content: 'Settings', placement: 'bottom', delay: 500}}
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
      {#if tabSet === 0}
        {#await getLastNotificationUpdateDate() then lastUpdate}
          <NotificationsList {lastUpdate}/>
        {/await}
      {:else if tabSet === 1}

        <div class="w-full h-full flex flex-col justify-center items-center">

          <div class="animate-pulse">
            <svg class="w-24 opacity-60" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>

          <div class="text-base px-16 text-center">
            Direct messages via <span class="text-[#FC4F37] font-bold">XMTP</span> are coming soon!
          </div>
        </div>

      {/if}
    </svelte:fragment>
  </TabGroup>

</div>

<style>
</style>