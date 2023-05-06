<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import InfiniteLoading from 'svelte-infinite-loading';
    import {onDestroy, onMount, tick} from 'svelte';
    import { fade } from 'svelte/transition';
    import {getAvatarForProfile, getSearchParamsMap, isToday, truncateAddress} from '../../../lib/utils';
    import {getMessagesStream, getThread, type Thread} from '../../../lib/xmtp-service';
    import {currentUser} from '../../../lib/stores/user-store';
    import {getCurrentUser} from '../../../lib/user';
    import ImageAvatar from '../../../assets/ic_avatar.svg';
    import type {DecodedMessage} from '@xmtp/xmtp-js';
    import LoadingSpinner from '../../../lib/components/LoadingSpinner.svelte';
    import {darkMode} from '../../../lib/stores/preferences-store';
    import SocialText from '../../../lib/components/SocialText.svelte';
    import MessengerTextarea from './MessengerTextarea.svelte';
    import {DateTime} from 'luxon';
    import type {Subscription} from 'rxjs';
    import FloatingComponent from '../../../lib/components/FloatingComponent.svelte';
    import ProfileHoverCard from '../../../lib/components/ProfileHoverCard.svelte';
    import {messageTimestamps} from '../../../lib/stores/cache-store';

    let thread: Thread;
    let messages: DecodedMessage[] = [];
    let text: string;
    let messageStream: Subscription;
    let newMessagesTimestamp: number;

    let pageTitle = 'Focalize';
    let scrollElement: HTMLElement;
    let userInfoElement: HTMLElement;
    let avatarElement: HTMLImageElement;

    const isFullyScrolled = () => scrollElement.scrollTop === scrollElement.scrollHeight - scrollElement.clientHeight;

    const updateTimestamp = (timestamp: number = DateTime.now().toMillis()) =>
        $messageTimestamps[thread.conversation.topic] = timestamp;

    const ensureUser = async () => {
        if ($currentUser) return;

        try {
            const {user, error} = await getCurrentUser();

            if (error || !user) {
                chrome.runtime.openOptionsPage();
                return;
            }

            $currentUser = user;
        } catch (e) {
            chrome.runtime.openOptionsPage();
        }
    };

    const getPeerName = (): string | null => {
        if (!thread) return null;

        const peerProfile = thread.peerProfile;
        if (!peerProfile) return truncateAddress(thread.conversation.peerAddress);

        return peerProfile.name ?? peerProfile.handle ?? truncateAddress(thread.conversation.peerAddress);
    };

    const onThreadLoaded = () => {
        newMessagesTimestamp = $messageTimestamps[thread.conversation.topic] ?? 0;

        messageStream = getMessagesStream(thread.conversation).subscribe(async (message: DecodedMessage) => {
            // If the document has focus and the user is scrolled to the bottom, update the timestamp
            if (document.hasFocus() && isFullyScrolled()) {
                updateTimestamp(message.sent.getTime());
            }
            // If the document doesn't have focus, show the new messages indicator
            else if (!document.hasFocus()) {
                newMessagesTimestamp = $messageTimestamps[thread.conversation.topic];
            }

            messages = [...messages, message];

            if (!isPeerMessage(message) || isFullyScrolled()) {
                await tick();
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        });

        updateTimestamp();
    };

    const isPeerMessage = (message: DecodedMessage) => {
        return message.senderAddress === thread.conversation.peerAddress;
    };

    const infiniteHandler = async ({detail: {loaded, complete, error}}) => {
        if (!thread) {
            console.error('infiniteHandler: No thread found');
            error();
            return;
        }

        const endTime = messages.length > 0 ? messages[0].sent : undefined;
        let prevMessages: DecodedMessage[] = [];
        try {
            prevMessages = await thread.conversation.messages({endTime});
            console.log('infiniteHandler: loaded messages', prevMessages);
        } catch (e) {
            console.error('infiniteHandler: Error loading messages', e);
            error();
        }

        // end time is inclusive, so we need to ignore the first message
        if (prevMessages.length <= 1) {
            complete();
            return;
        }

        prevMessages = prevMessages.filter(m => m.id !== messages[0]?.id);

        if (messages.length == 0 && document.hasFocus()) {
            updateTimestamp();
        }

        messages = [...prevMessages, ...messages];

        loaded();
    };

    const onTextChange = (event: CustomEvent) => {
        text = event.detail.text;
    };

    const onSubmit = async () => {
        if (text.trim().length === 0) return;

        try {
            let message: DecodedMessage = await thread.conversation.send(text);
            console.log('onSubmit: sent message', message);
            text = '';
        } catch (e) {
            console.error('onSubmit: Error sending message', e);
            // TODO: handle error
        }
    };

    const onBlur = () => {
        newMessagesTimestamp = undefined;

    };

    $: peerProfile = thread && thread.peerProfile;
    $: avatarUrl = peerProfile && getAvatarForProfile(peerProfile);
    $: peerName = thread && getPeerName();
    $: peerHandle = peerProfile && peerProfile?.handle;

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (peerName) {
            pageTitle = `Chat with ${peerName} | Focalize`;
        }
    }

    onMount(async () => {
        window.addEventListener('blur', onBlur);

        await ensureUser();

        const queryString = window.location.search;
        const urlParams = getSearchParamsMap(queryString);
        const topic = urlParams.topic;
        console.log('onMount: topic', topic);

        if (!topic) {
            // TODO: support creating new threads
            window.close();
            return;
        }

        thread = await getThread(topic);
        console.log('thread', thread);

        if (!thread) {
            window.close();
            return;
        }

        onThreadLoaded();
    });

    onDestroy(() => {
        messageStream?.unsubscribe();
    });

</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

{#if thread}

  <div class="flex flex-col h-full">

    <div class="flex h-14 px-2 py-3 border-b border-surface-200-700-token items-center flex-none">

      <img src={avatarUrl ?? ImageAvatar} alt="avatar" loading="lazy" decoding="async"
           bind:this={avatarElement}
           class="w-10 h-10 none rounded-full object-cover bg-gray-300 text-white hover:opacity-80 cursor-pointer">

      <div class="flex flex-grow justify-center">
        <div bind:this={userInfoElement} class="flex flex-col justify-center text-center">
          <div class="text-sm font-medium">{peerName}</div>
          {#if peerHandle}
            <div class="text-xs opacity-50">@{peerHandle}</div>
          {/if}
        </div>
      </div>

      <div class="w-10 flex-none">

      </div>

    </div>

    <div bind:this={scrollElement} class="flex flex-col flex-grow p-2 overflow-y-auto gap-1 pb-4">

      <InfiniteLoading on:infinite={infiniteHandler} direction="top">
        <div slot="noMore"></div>

        <div slot="spinner" class="p-10">
          <LoadingSpinner/>
        </div>
      </InfiniteLoading>

      {#each messages as message, i}

        {@const isPeer = isPeerMessage(message)}
        {@const previousMessage = messages[i - 1]}
        {@const showDate = !previousMessage ||
                (!isToday(DateTime.fromJSDate(message.sent), DateTime.fromJSDate(previousMessage.sent)))}
        {@const sameSenderAsPrevious = previousMessage && (isPeerMessage(previousMessage) === isPeer)}

        {#if showDate}
          <div class="flex justify-center text-xs opacity-50 pt-2">
            <span>{DateTime.fromJSDate(message.sent).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}</span>
          </div>
        {/if}

        {#if newMessagesTimestamp && message.sent > newMessagesTimestamp &&
             (!previousMessage || previousMessage.sent < newMessagesTimestamp)}
          <div class="flex justify-center text-xs opacity-50 py-2" out:fade>
            <span class="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
              New Messages
            </span>
          </div>
        {/if}

        <div class="flex {isPeer ? 'justify-start' : 'justify-end'}
             {sameSenderAsPrevious && !showDate ? 'pt-0' : showDate ? 'pt-2' : 'pt-3' }"
        >

          <div class="flex flex-col w-4/5 px-2.5 pt-2 pb-1 text-[0.925rem] bg-gradient-to-b
               {isPeer ? 'peer-message' : 'self-message'}">

            <SocialText text={message.content}
                        anchorClass="!no-underline
                        {isPeer ? '!text-orange-100 hover:!text-orange-300' :
                        '!text-orange-800 dark:!text-orange-100 hover:!text-orange-400 dark:hover:!text-orange-300'} "/>

            <div class="flex justify-end text-xs pt-1">
              <span class="opacity-50 cursor-help"
                    use:tippy={({
                     delay: 500,
                     placement: 'bottom',
                     content: DateTime.fromJSDate(message.sent).toLocaleString(DateTime.DATETIME_MED)
                   })}>
                {DateTime.fromJSDate(message.sent).toLocaleString(DateTime.TIME_SIMPLE)}
              </span>
            </div>

          </div>

        </div>

      {/each}

    </div>

    <div class="flex flex-none border-t border-surface-200-700-token p-2 items-center">

      <div class="flex-grow flex items-center gap-2">

        <MessengerTextarea {text} on:textChanged={onTextChange} on:enterPressed={onSubmit}
                           className="!rounded-2xl" placeholder="Message"/>

        <button disabled={!text} on:click={onSubmit}
                class="btn btn-icon variant-filled-primary">
          <svg class="w-6 h-6 text-white pl-0.5" viewBox="0 96 960 960" fill="currentColor">
            <path
                d="M162 878q-15 6-28.5-2.5T120 851V674q0-11 6.5-19t16.5-10l279-69-279-71q-10-2-16.5-10t-6.5-19V301q0-16 13.5-24.5T162 274l652 274q18 8 18 28t-18 28L162 878Z"/>
          </svg>
        </button>
      </div>

    </div>
  </div>

  {#if avatarElement && peerProfile}
    <FloatingComponent anchors={[avatarElement,userInfoElement]} showDelay={500} hideDelay={200} interactive={true}>
      <ProfileHoverCard profile={peerProfile}/>
    </FloatingComponent>
  {/if}

{/if}

<style>
  .peer-message {
    @apply bg-secondary-500 dark:bg-secondary-600 text-white rounded-tr-xl rounded-b-xl;
  }

  .self-message {
    @apply bg-gray-200 dark:bg-gray-700 rounded-t-xl rounded-bl-xl;
  }
</style>