<script lang="ts">
    import {onDestroy, onMount} from 'svelte';
    import {
        canMessage,
        type Thread,
        getAllThreads,
        getAllMessagesStream,
        getThreadStream, isUnread, markAllAsRead
    } from '../../lib/xmtp-service';
    import type {Subscription} from 'rxjs';
    import ThreadItem from './ThreadItem.svelte';
    import {currentUser} from '../../lib/stores/user-store';
    import {get} from '../../lib/stores/chrome-storage-store';
    import type {User} from '../../lib/user';
    import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';
    import {RadioGroup, RadioItem, popup} from '@skeletonlabs/skeleton';
    import FloatingActionButton from '../../lib/components/FloatingActionButton.svelte';
    import {selectedMessagesTab, windowTopicMap} from '../../lib/stores/cache-store';

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

    const isXmtpEnabled = async () => {
        const user: User = await get(currentUser);
        const address = user?.address;
        console.log('isXmtpEnabled: address', address);
        return address && await canMessage(address);
    };

    const init = async () => {
        unfilteredThreads = await getAllThreads();

        conversationsSubscription = getThreadStream().subscribe((thread) => {
            console.log('getThreadStream: thread', thread);
            unfilteredThreads = [unfilteredThreads, ...unfilteredThreads];
        });

        messagesSubscription = getAllMessagesStream().subscribe(async (message) => {
            console.log('getAllMessagesStream: message', message);
            const thread = threads.find((thread) => thread.conversation.topic === message.conversation.topic);

            if (thread) {
                thread.latestMessage = message;
                thread.unread = await isUnread(message);
            }

            threads = threads;
        });
    };

    const onMessageTabSwitch = () => {
        switch ($selectedMessagesTab) {
            case 0:
                threads = unfilteredThreads
                    .filter(thread => thread.conversation.context?.conversationId.startsWith('lens.dev/dm/'));
                break;
            case 1:
                threads = unfilteredThreads
                    .filter(thread => !thread.conversation.context?.conversationId.startsWith('lens.dev/dm/'));
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

        const topic = encodeURIComponent(thread.conversation.topic);
        const url = chrome.runtime.getURL('src/popup/messaging/thread/index.html?topic=' + topic);
        const newWindow: chrome.windows.Window = await chrome.windows.create({
            url,
            focused: true,
            type: 'popup',
            width: 400,
            height: 600,
        }).catch(console.error);

        $windowTopicMap[thread.conversation.topic] = newWindow.id;

        window.close();
    };

    $: {
        if (messagesEnabled && !unfilteredThreads) {
            init().catch(console.error);
        }

        if ($selectedMessagesTab !== undefined && unfilteredThreads) {
            onMessageTabSwitch();
        }
    }

    onMount(async () => {
        messagesEnabled = await isXmtpEnabled();
        console.log('onMount: messagesEnabled', messagesEnabled);
    });

    onDestroy(() => {
        conversationsSubscription?.unsubscribe();
        messagesSubscription?.unsubscribe();
    });
</script>

{#if threads}

  <div bind:this={scrollElement}
       class="w-full h-full overflow-y-auto overflow-x-hidden">

    <div class="flex p-2 justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-200
         dark:border-gray-700">
      <RadioGroup active="variant-filled-surface" hover="hover:variant-soft-surface"
                  background="bg-none" border="border-none">
        <RadioItem name="lens-messages" bind:group={$selectedMessagesTab} value={0} class="text-sm">Lens</RadioItem>
        <RadioItem name="all-messages" bind:group={$selectedMessagesTab} value={1} class="text-sm">Wallet to wallet</RadioItem>
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

    <ul bind:this={listElement}
        class="w-full h-fit bg-gray-100 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

      {#each threads as thread}
        <ThreadItem {thread} on:select={onThreadSelected}/>
      {/each}

    </ul>

  </div>

  <FloatingActionButton {scrollElement}>
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
