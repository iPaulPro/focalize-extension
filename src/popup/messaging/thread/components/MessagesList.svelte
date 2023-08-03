<script lang="ts">
    import {DateTime} from 'luxon';
    import InfiniteLoading from 'svelte-infinite-loading';
    import LoadingSpinner from '../../../../lib/components/LoadingSpinner.svelte';
    import type {DecodedMessage} from '@xmtp/xmtp-js';
    import {getMessagesStream, type Thread} from '../../../../lib/xmtp-service';
    import {messageTimestamps} from '../../../../lib/stores/cache-store';
    import {createEventDispatcher, onDestroy, onMount, tick} from 'svelte';
    import type {Subscription} from 'rxjs';
    import {get} from '../../../../lib/stores/chrome-storage-store';
    import MessageItem from './MessageItem.svelte';
    import {isPeerMessage} from '../../../../lib/utils/utils';
    import {messagesUnreadTopics} from '../../../../lib/stores/preferences-store';

    const dispatch = createEventDispatcher();

    export let thread: Thread;

    let messages: DecodedMessage[] = [];
    let messageStream: Subscription;
    let newMessagesTimestamp: number | undefined;

    let scrollElement: HTMLElement;

    const isFullyScrolled = () => scrollElement.scrollTop === scrollElement.scrollHeight - scrollElement.clientHeight;

    const scrollToBottom = async () => {
        await tick();
        scrollElement.scrollTop = scrollElement.scrollHeight;
    };

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
        const firstMessageSentTime: number | undefined = messages.length ? messages[0].sent.getTime() - 1 : undefined;
        try {
            const endTime: Date | undefined = firstMessageSentTime ? new Date(firstMessageSentTime) : undefined;
            prevMessages = await thread.conversation.messages({endTime});
            console.log('infiniteHandler: loaded', prevMessages?.length, 'messages');
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
                await scrollToBottom();
            }
        });

        updateTimestamp();
        clearNotification();
    };

    onMount(async () => {
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);

        await init();
    });

    onDestroy(() => {
        messageStream?.unsubscribe();
    });
</script>

<div bind:this={scrollElement} class="flex flex-col flex-grow p-2 overflow-y-auto gap-1 pb-4">

    <InfiniteLoading on:infinite={infiniteHandler} direction="top">
        <div slot="noMore"></div>

        <div slot="spinner" class="p-10">
            <LoadingSpinner/>
        </div>
    </InfiniteLoading>

    {#each messages as message, i (message.id)}

        {@const previousMessage = messages[i - 1]}

        <MessageItem {message} {previousMessage} {newMessagesTimestamp}/>

    {/each}

</div>
