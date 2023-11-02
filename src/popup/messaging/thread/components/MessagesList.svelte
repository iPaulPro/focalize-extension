<script lang="ts">
    import { DateTime } from 'luxon';
    import type { DecodedMessage } from '@xmtp/xmtp-js';
    import { getMessagesStream, type Thread } from '../../../../lib/xmtp-service';
    import { messageTimestamps } from '../../../../lib/stores/cache-store';
    import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
    import type { Subscription } from 'rxjs';
    import { get } from '../../../../lib/stores/chrome-storage-store';
    import MessageItem from './MessageItem.svelte';
    import { isPeerMessage } from '../../../../lib/utils/utils';
    import { messagesUnreadTopics } from '../../../../lib/stores/preferences-store';
    import { SortDirection } from '@xmtp/xmtp-js';

    const dispatch = createEventDispatcher();

    export let thread: Thread;

    let messages: DecodedMessage[] = [];
    let messageStream: Subscription;
    let newMessagesTimestamp: number | undefined;

    let scrollElement: HTMLElement;
    let scrollElementHeight: number;
    let hasScrolled = false;
    let previouslyScrolledToBottom: boolean = true;

    let isLoading = false;
    let isLoadingComplete = false;
    let loadingError = false;

    const isFullyScrolled = () => scrollElement.scrollTop === scrollElement.scrollHeight - scrollElement.clientHeight;

    const onScroll = async () => {
        if (scrollElement.scrollTop + scrollElement.clientHeight !== scrollElement.scrollHeight) {
            hasScrolled = true;
        }

        previouslyScrolledToBottom = isFullyScrolled();

        if (
            !isLoadingComplete && !isLoading && !loadingError &&
            scrollElement.scrollTop <= -(scrollElement.scrollHeight - scrollElement.clientHeight) + 200
        ) {
            console.log('onScroll: loading more messages');
            await loadMessages();
        }
    };

    const smoothScroll = (amount: number, duration: number = 200) => {
        const startTime = Date.now();

        let scrollCount = 0;
        let scrollInterval = amount / Math.ceil(duration / 1000 * 60);

        const scrollStep = () => {
            const now = Date.now();
            const elapsedTime = now - startTime;

            if (elapsedTime < duration) {
                scrollElement.scrollBy(0, scrollInterval);
                scrollCount += scrollInterval;
                requestAnimationFrame(scrollStep);
            }
        };

        requestAnimationFrame(scrollStep);
    };

    const scrollToBottom = async () => {
        await tick();
        scrollElement.scrollTop = scrollElement.scrollHeight;
    };

    const smoothScrollToBottom = async (duration?: number) => {
        await tick();
        smoothScroll(scrollElement.scrollHeight, duration);
    }

    const updateTimestamp = (timestamp: number = DateTime.now().toMillis()) => {
        $messageTimestamps[thread.conversation.topic] = timestamp;
        $messagesUnreadTopics = $messagesUnreadTopics.filter(t => t !== thread.conversation.topic);
    };

    const clearNotification = () => {
        chrome.notifications.clear(thread.conversation.topic);
    };

    const loadMessages = async () => {
        if (isLoading || isLoadingComplete) return;
        isLoading = true;
        let prevMessages: DecodedMessage[] = [];

        const lastMessageSentTime: number | undefined = messages.length ? messages[messages.length-1].sent.getTime() - 1 : undefined;
        const endTime: Date | undefined = lastMessageSentTime ? new Date(lastMessageSentTime) : new Date();

        try {
            prevMessages = await thread.conversation.messages({
                startTime: new Date(0),
                endTime,
                limit: 40,
                direction: SortDirection.SORT_DIRECTION_DESCENDING,
            });
            console.log('loadMessages: loaded', prevMessages?.length, 'messages');

            if (messages.length == 0 && document.hasFocus()) {
                updateTimestamp();
            }

            if (!prevMessages.length) {
                isLoadingComplete = true;
                return;
            }

            prevMessages = prevMessages.filter(m => m.id !== messages[0]?.id);
            messages = [...messages, ...prevMessages];
        } catch (e) {
            console.error('loadMessages: error loading messages', e);
            loadingError = true;
        } finally {
            isLoading = false;
        }
    };

    const onBlur = () => {
        newMessagesTimestamp = undefined;
    };

    const onFocus = () => {
        updateTimestamp();
        clearNotification();
    };

    const init = async () => {
        const timestamps = await get(messageTimestamps);
        newMessagesTimestamp = timestamps[thread.conversation.topic] ?? undefined;

        messageStream = getMessagesStream(thread.conversation).subscribe(async (message: DecodedMessage) => {
            if (document.hasFocus() && isFullyScrolled()) {
                updateTimestamp();
            } else if (!document.hasFocus()) {
                // If the document doesn't have focus, show the new messages indicator and trigger a notification
                newMessagesTimestamp = $messageTimestamps[thread.conversation.topic];
                dispatch('newMessage');
                await chrome.runtime.sendMessage({type: 'checkForUnreadMessages'});
            }

            messages = [message, ...messages];

            if (!isPeerMessage(message) || isFullyScrolled()) {
                await smoothScrollToBottom(500);
            }
        });

        updateTimestamp();
        clearNotification();
    };

    const onImageLoaded = () => {
        if (!hasScrolled && previouslyScrolledToBottom) {
            scrollToBottom();
        }
    };

    // When the scroll height changes, scroll to the bottom if we were previously scrolled to the bottom
    // This typically happens when the input box grows or shrinks
    $: if (scrollElementHeight && previouslyScrolledToBottom) {
        scrollToBottom();
    }

    onMount(async () => {
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);

        await init();
        await loadMessages();
    });

    onDestroy(() => {
        messageStream?.unsubscribe();
    });
</script>

<div bind:this={scrollElement}
     bind:offsetHeight={scrollElementHeight}
     on:scroll={onScroll}
     class="flex flex-col-reverse flex-grow p-2 overflow-y-auto gap-1 pb-4">

    {#each messages as message, i (message.id)}

        {@const previousMessage = messages[i + 1]}

        <MessageItem
                {message}
                {previousMessage}
                {newMessagesTimestamp}
                on:imageLoaded={onImageLoaded}
        />

    {/each}

    {#if loadingError}
        <div class="text-center text-gray-500 px-3">Error loading messages</div>
    {/if}
</div>
