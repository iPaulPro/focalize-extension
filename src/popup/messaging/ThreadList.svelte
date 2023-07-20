<script lang="ts">
    import {onDestroy, onMount} from 'svelte';
    import {
        type Thread,
        getAllThreads, getAllMessagesStream, getThreadStream, isUnread, markAllAsRead,
        isLensThread, isXmtpEnabled, toCompactMessage, updateLatestMessageCache, isProfileThread
    } from '../../lib/xmtp-service';
    import type {Subscription} from 'rxjs';
    import ThreadItem from './ThreadItem.svelte';
    import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';
    import {RadioGroup, RadioItem, popup} from '@skeletonlabs/skeleton';
    import FloatingActionButton from '../../lib/components/FloatingActionButton.svelte';
    import {latestMessageMap, selectedMessagesTab, windowTopicMap} from '../../lib/stores/cache-store';
    import {launchThreadWindow} from '../../lib/utils/utils';
    import {createEventDispatcher} from 'svelte';
    import {currentUser} from '../../lib/stores/user-store';

    const dispatch = createEventDispatcher();

    let listElement: HTMLUListElement;
    let scrollElement: HTMLElement;

    let messagesEnabled = false;
    let threads: Thread[];
    let unfilteredThreads: Thread[];
    let conversationsSubscription: Subscription;
    let messagesSubscription: Subscription;

    export const scrollToTop = () => {
        scrollElement.scrollTop = 0;
    };

    const reloadThreads = async () => {
        unfilteredThreads = await getAllThreads();
        console.log('reloadThreads', unfilteredThreads);
    }

    const listenForCacheChanges = () => latestMessageMap.subscribe(reloadThreads);

    const init = async () => {
        conversationsSubscription = getThreadStream().subscribe((thread) => {
            console.log('getThreadStream: new thread', thread);
            unfilteredThreads = [thread, ...unfilteredThreads];
        });

        messagesSubscription = getAllMessagesStream().subscribe(async (message) => {
            console.log('getAllMessagesStream: new message', message);
            const thread = threads.find((thread) => thread.conversation.topic === message.conversation.topic);

            if (thread) {
                thread.latestMessage = toCompactMessage(message);
                thread.unread = await isUnread(message);
            }

            threads = threads;
        });

        await updateLatestMessageCache();

        listenForCacheChanges();
    };

    const onMessageTabSwitch = () => {
        switch ($selectedMessagesTab) {
            case 0:
                threads = unfilteredThreads;
                break;
            case 1:
                threads = unfilteredThreads.filter(thread =>
                    isLensThread(thread) && isProfileThread(thread, $currentUser?.profileId)
                );
                break;
            case 2:
                threads = unfilteredThreads.filter(thread => !isLensThread(thread));
                break;
        }
    };

    const onMarkAllAsReadClick = async () => {
        threads = await markAllAsRead(threads);
    };

    const onThreadSelected = async (event: CustomEvent) => {
        const thread: Thread = event.detail.thread;
        console.log('onThreadSelected: thread', thread);

        const existingWindow = $windowTopicMap[thread.conversation.topic];
        if (existingWindow) {
            try {
                await chrome.windows.update(existingWindow, {focused: true});
                window.close();
                return;
            } catch (e) {
                delete $windowTopicMap[thread.conversation.topic];
            }
        }

        await launchThreadWindow(thread.conversation.topic);
    };

    $: if (messagesEnabled && !unfilteredThreads) {
        init().catch(console.error);
    }

    $: if ($selectedMessagesTab !== undefined && unfilteredThreads) {
        onMessageTabSwitch();
    }

    $: if ($currentUser) {
        reloadThreads().catch(console.error);
    }

    onMount(async () => {
        messagesEnabled = await isXmtpEnabled();
        console.log('onMount: messagesEnabled', messagesEnabled);

        if (!messagesEnabled) {
            dispatch('messagesDisabled');
            const url = chrome.runtime.getURL('src/popup/messaging/login/index.html');
            await chrome.tabs.create({url});
        }
    });

    onDestroy(() => {
        conversationsSubscription?.unsubscribe();
        messagesSubscription?.unsubscribe();
    });
</script>

{#if threads}

  <div bind:this={scrollElement}
       class="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col">

    <div class="flex p-2 justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-200
       dark:border-gray-700">
      <RadioGroup active="variant-filled-surface" hover="hover:variant-soft-surface"
                  background="bg-none" border="border-none" class="gap-1">
        <RadioItem name="all-messages" bind:group={$selectedMessagesTab} value={0} class="text-sm">All</RadioItem>
        <RadioItem name="lens-messages" bind:group={$selectedMessagesTab} value={1} class="text-sm">Lens</RadioItem>
        <RadioItem name="wallet-to-wallet" bind:group={$selectedMessagesTab} value={2} class="text-sm">Other</RadioItem>
      </RadioGroup>

      <button type="button"
              class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              use:popup={{
              event: 'click',
              closeQuery: '.btn',
              placement: 'bottom-end',
              target: 'examplePopup',
            }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
             stroke-linejoin="round" class="w-5">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>
    </div>

    {#if threads.length > 0}
      <ul bind:this={listElement}
          class="w-full h-fit bg-gray-100 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {#each threads as thread (thread.conversation.topic)}
          <ThreadItem {thread} on:select={onThreadSelected}/>
        {/each}
      </ul>
    {:else}
      <div class="w-full grow flex flex-col justify-center items-center gap-2">
        <svg class="w-12 h-12 opacity-40" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5"/>
          <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z"/>
        </svg>
        <div class="opacity-80 text-sm">
          No messages
        </div>
      </div>
    {/if}

  </div>

  <FloatingActionButton {scrollElement} on:click={() => launchThreadWindow()}>
    <svg fill="currentColor" class="w-6 h-6">
      <path
          d="M18 11.25c.647 0 1.18.492 1.244 1.122l.006.128v3.25h3.25a1.25 1.25 0 0 1 .128 2.494l-.128.006h-3.25v3.25a1.25 1.25 0 0 1-2.494.128l-.006-.128v-3.25H13.5a1.25 1.25 0 0 1-.128-2.494l.128-.006h3.25V12.5c0-.69.56-1.25 1.25-1.25Z"
          fill-rule="nonzero"/>
      <path
          d="M18 3a3 3 0 0 1 3 3v6.337a5.525 5.525 0 0 0-2-1.737V6.572l-6.671 5.247a2 2 0 0 1-2.658 0L3 6.572V16a1 1 0 0 0 .883.993L4 17h7.207c.21.743.572 1.421 1.05 2H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h14Zm-.376 2H4.376L11 10l6.624-5Z"/>
    </svg>
  </FloatingActionButton>

{:else}

  <div class="p-10">
    <LoadingSpinner/>
  </div>

{/if}

<div class="card overflow-hidden" data-popup="examplePopup">
  <button type="button"
          on:click={onMarkAllAsReadClick}
          class="btn hover:!bg-gray-500 !rounded-none">
    Mark all as read
  </button>
</div>
