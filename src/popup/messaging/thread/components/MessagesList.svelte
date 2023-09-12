<script lang="ts">
    import { DateTime } from 'luxon';
    import InfiniteLoading from 'svelte-infinite-loading';
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

    const isFullyScrolled = () => scrollElement.scrollTop === scrollElement.scrollHeight - scrollElement.clientHeight;

    const onScroll = () => {
        if (scrollElement.scrollTop + scrollElement.clientHeight !== scrollElement.scrollHeight) {
            hasScrolled = true;
        }
        previouslyScrolledToBottom = isFullyScrolled();
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

    const infiniteHandler = async (
        {
            detail: {loaded, complete, error}
        }: {
            detail: { loaded: () => void, complete: () => void, error: () => void }
        }
    ) => {
        if (!thread) {
            console.error('infiniteHandler: No thread found');
            error();
            return;
        }

        let prevMessages: DecodedMessage[] = [];
        const lastMessageSentTime: number | undefined = messages.length ? messages[0].sent.getTime() - 1 : undefined;
        try {
            const endTime: Date | undefined = lastMessageSentTime ? new Date(lastMessageSentTime) : new Date();
            prevMessages = await thread.conversation.messages({
                startTime: new Date(0),
                endTime,
                limit: 20,
                direction: SortDirection.SORT_DIRECTION_DESCENDING
            });
            console.log('infiniteHandler: loaded', prevMessages?.length, 'messages');
            prevMessages.reverse();
        } catch (e) {
            console.error('infiniteHandler: Error loading messages', e);
            error();
        }

        if (messages.length == 0 && document.hasFocus()) {
            updateTimestamp();
        }

        if (prevMessages.length == 0) {
            complete();
            return;
        }

        prevMessages = prevMessages.filter(m => m.id !== messages[0]?.id);
        messages = [...prevMessages, ...messages];
        loaded();
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

            messages = [...messages, message];

            if (!isPeerMessage(message) || isFullyScrolled()) {
                await smoothScrollToBottom(500);
            }
        });

        updateTimestamp();
        clearNotification();
    };

    const onImageLoaded = (event: CustomEvent) => {
        const element = event.detail.element as HTMLImageElement;
        if (!hasScrolled && previouslyScrolledToBottom) {
            scrollToBottom();
        } else if (element.offsetTop > scrollElement.scrollTop) {
            requestAnimationFrame(() => {
                scrollElement.scrollTop += element.clientHeight;
            });
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
    });

    onDestroy(() => {
        messageStream?.unsubscribe();
    });
</script>

<div bind:this={scrollElement}
     bind:offsetHeight={scrollElementHeight}
     on:scroll={onScroll}
     class="flex flex-col flex-grow p-2 overflow-y-auto gap-1 pb-4">

    <InfiniteLoading on:infinite={infiniteHandler} direction="top" distance={200}>
        <span slot="noMore"></span>
        <span slot="spinner"></span>
        <div slot="noResults" class='py-10 px-4 flex flex-col justify-center items-center'>
            <div class="text-xl tracking-tight">Say hi!</div>
            <div class="text-sm opacity-60">This conversation was started but no message has been sent yet</div>
        </div>
    </InfiniteLoading>

    {#each messages as message, i (message.id)}

        {@const previousMessage = messages[i - 1]}

        <MessageItem
                {message}
                {previousMessage}
                {newMessagesTimestamp}
                on:imageLoaded={onImageLoaded}
        />

    {/each}

</div>
