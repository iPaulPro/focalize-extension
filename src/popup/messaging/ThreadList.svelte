<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import { createEventDispatcher, onDestroy, onMount } from 'svelte';
    import {
        getAllMessagesStream,
        getAllThreads,
        getThreadStream,
        isLensThread,
        isProfileThread,
        isUnread,
        isXmtpEnabled,
        markAllAsRead,
        toCompactMessage,
        updateLatestMessageCache,
        type Thread,
    } from '../../lib/xmtp-service';
    import type { Subscription } from 'rxjs';
    import ThreadItem from './ThreadItem.svelte';
    import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';
    import { popup, RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
    import FloatingActionButton from '../../lib/components/FloatingActionButton.svelte';
    import { latestMessageMap, selectedMessagesTab, windowTopicMap } from '../../lib/stores/cache-store';
    import { launchThreadWindow } from '../../lib/utils/utils';
    import { currentUser, KEY_KNOWN_SENDERS } from '../../lib/stores/user-store';
    import { messagesHideUnknownSenders, messagesWalletToWallet } from '../../lib/stores/preferences-store';
    import { isFollowingOrKnownSender } from '../../lib/utils/is-following-or-known-sender';

    const dispatch = createEventDispatcher();

    let scrollElement: HTMLElement;

    let messagesEnabled = false;
    let threads: Thread[];
    let unfilteredThreads: Thread[];
    let conversationsSubscription: Subscription;
    let messagesSubscription: Subscription;
    let loading = false;

    export const scrollToTop = () => {
        scrollElement.scrollTop = 0;
    };

    const reloadThreads = async () => {
        if (loading) return;
        loading = true;
        unfilteredThreads = await getAllThreads();
        loading = false;
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
                thread.unread = await isUnread(thread.latestMessage);
            }

            threads = threads;
        });

        await updateLatestMessageCache();

        listenForCacheChanges();
    };

    const onMessageTabSwitch = async () => {
        const localStorage = await chrome.storage.local.get([KEY_KNOWN_SENDERS]);
        const knownSenders = localStorage[KEY_KNOWN_SENDERS] || [];

        console.log('onMessageTabSwitch: selectedMessagesTab', $selectedMessagesTab, '', );
        switch ($selectedMessagesTab) {
            case 0:
                threads = $messagesHideUnknownSenders
                    ? unfilteredThreads.filter(thread => isFollowingOrKnownSender(thread, knownSenders))
                    : unfilteredThreads;
                break;
            case 1:
                threads = unfilteredThreads.filter(thread => $currentUser?.profileId
                    && isLensThread(thread)
                    && isProfileThread(thread, $currentUser?.profileId)
                    && ($messagesHideUnknownSenders
                            ? isFollowingOrKnownSender(thread, knownSenders)
                            : !$messagesWalletToWallet)
                );
                break;
            case 2:
                threads = unfilteredThreads.filter(thread =>
                    !isLensThread(thread)
                    && ($messagesHideUnknownSenders ? isFollowingOrKnownSender(thread, knownSenders) : false)
                );
                break;
            case 3:
                threads = unfilteredThreads.filter(thread => $messagesWalletToWallet
                    ? !isFollowingOrKnownSender(thread, knownSenders)
                    : !isFollowingOrKnownSender(thread, knownSenders) && isLensThread(thread)
                );
                break;
        }
    };

    const getRequestsCount = async (): Promise<number> => {
        const localStorage = await chrome.storage.local.get([KEY_KNOWN_SENDERS]);
        const knownSenders = localStorage[KEY_KNOWN_SENDERS] || [];
        const requests = unfilteredThreads.filter(thread =>
            !isFollowingOrKnownSender(thread, knownSenders) && thread.unread
        );
        return requests.length;
    };

    const onMarkAllAsReadClick = async () => {
        threads = await markAllAsRead(threads);
    };

    const onThreadSelected = async (event: CustomEvent) => {
        const thread: Thread = event.detail.thread;

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

        await launchThreadWindow({topic: thread.conversation.topic});
    };

    $: if (messagesEnabled && !unfilteredThreads) {
        init().catch(console.error);
    }

    $: if ($selectedMessagesTab !== undefined && unfilteredThreads) {
        onMessageTabSwitch().catch(console.error);
    }

    $: if ($currentUser && !unfilteredThreads) {
        reloadThreads().catch(console.error);
    }

    $: if ($messagesWalletToWallet === false) {
        $selectedMessagesTab = 1;
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
        {#if $selectedMessagesTab === 3}
            <div class='flex gap-2 items-center'>
                <button type='button'
                        class='flex items-center justify-center p-2 hover:variant-soft-surface rounded-full'
                        on:click={() => $selectedMessagesTab = 0}>
                    <svg viewBox='0 0 24 24' fill='none' class='w-5'
                         stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                        <line x1='18' y1='6' x2='6' y2='18'></line>
                        <line x1='6' y1='6' x2='18' y2='18'></line>
                    </svg>
                </button>
                <div class='text-sm'>Requests</div>
            </div>
        {:else if $messagesWalletToWallet === true}
            <RadioGroup active="variant-filled-surface" hover="hover:variant-soft-surface"
                        background="bg-none" border="border-none" class="gap-1">
                <RadioItem name="all-messages" bind:group={$selectedMessagesTab} value={0} class="text-sm">All</RadioItem>
                <RadioItem name="lens-messages" bind:group={$selectedMessagesTab} value={1} class="text-sm">Lens</RadioItem>
                <RadioItem name="wallet-to-wallet" bind:group={$selectedMessagesTab} value={2} class="text-sm">Other</RadioItem>
            </RadioGroup>
        {:else}
            <div class='px-2 text-sm'>Lens Messages</div>
        {/if}

        <div class="flex gap-1 items-center grow justify-end">
            {#if $messagesHideUnknownSenders && $selectedMessagesTab !== 3}
                {#await getRequestsCount() then requestsCount}
                    {@const hasRequests = requestsCount > 0}
                    <button type="button"
                            class="text-xs hover:opacity-100 rounded-full px-2 py-1 opacity-70
                                  {hasRequests ? 'font-bold' : 'font-normal'}"
                            on:click={() => {$selectedMessagesTab = 3}}
                            use:tippy={{
                              delay: 500,
                              content: 'Requests are messages from addresses you\'ve never spoken with and Lens Profiles you\'re not following'
                             }}>
                        {hasRequests ? requestsCount + ' requests' : 'Requests'}
                    </button>
                {/await}
            {/if}
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

    </div>

    {#if threads.length > 0}
      <ul class="w-full h-fit bg-gray-100 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
