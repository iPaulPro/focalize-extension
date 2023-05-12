<script lang="ts">
    import {onDestroy, onMount} from 'svelte';
    import {getAvatarForProfile, getAvatarFromAddress, getSearchParamsMap, truncateAddress} from '../../../lib/utils';
    import {findThread, getPeerName, getThread, isLensThread, type Peer, type Thread} from '../../../lib/xmtp-service';
    import {currentUser} from '../../../lib/stores/user-store';
    import {getCurrentUser} from '../../../lib/user';
    import ImageAvatar from '../../../assets/ic_avatar.svg';
    import type {DecodedMessage} from '@xmtp/xmtp-js';
    import {darkMode, nodeSearch} from '../../../lib/stores/preferences-store';
    import MessengerTextarea from './components/MessengerTextarea.svelte';
    import FloatingComponent from '../../../lib/components/FloatingComponent.svelte';
    import ProfileHoverCard from '../../../lib/components/ProfileHoverCard.svelte';
    import MessagesList from '../MessagesList.svelte';
    import WindowBlinker from '../../../lib/WindowBlinker';
    import {getProfileUrl} from '../../../lib/lens-nodes';
    import {Toast, toastStore, storePopup} from '@skeletonlabs/skeleton';
    import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
    import LoadingSpinner from '../../../lib/components/LoadingSpinner.svelte';
    import {windowTopicMap} from '../../../lib/stores/cache-store';
    import NewThreadRecipientInput from './components/NewThreadRecipientInput.svelte';
    import {newThread} from '../../../lib/xmtp-service.js';

    let loading = true;
    let thread: Thread;
    let text: string;
    let newMessagePeer: Peer | null = null;

    let pageTitle = 'Focalize';
    let userInfoElement: HTMLElement;
    let avatarElement: HTMLImageElement;

    const windowBlinker = new WindowBlinker();

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

    const onTextChange = (event: CustomEvent) => {
        text = event.detail.text;
    };

    const saveWindowId = () => {
        chrome.windows.getCurrent().then((window) => {
            $windowTopicMap[thread.conversation.topic] = window.id;
            console.log('saveWindowId: saved window id', window.id, 'for topic', thread.conversation.topic);
        });
    };

    const sendMessage = async () => {
        let message: DecodedMessage = await thread.conversation.send(text);
        console.log('onSubmit: sent message', message);
        text = '';
        loading = false;
    };

    const onSubmit = async () => {
        if (!text || text.trim().length === 0) return;

        const onMessageSendError = () => {
            toastStore.trigger({
                message: 'Error sending message',
                background: 'variant-filled-error',
                duration: 5000,
            });
            loading = false;
        };

        if (newMessagePeer) {
            loading = true;

            const peerAddress = newMessagePeer.wallet?.address ?? newMessagePeer.profile?.ownedBy;
            const existingThread = await findThread(peerAddress);
            if (existingThread) {
                thread = existingThread;
                console.log('onSubmit: found existing thread', thread);
                await sendMessage();
                return;
            }

            try {
                thread = await newThread(newMessagePeer, text);
                console.log('onSubmit: started new thread', thread);
            } catch (e) {
                console.error('onSubmit: Error starting new thread', e);
                onMessageSendError();
                return;
            }
        }

        try {
            await sendMessage();
        } catch (e) {
            console.error('onSubmit: Error sending message', e);
            onMessageSendError();
        }
    };

    const getPeerUrl = (): string => {
        if (thread?.peer?.profile) {
            return getProfileUrl($nodeSearch, thread.peer.profile.handle);
        } else if (thread?.peer?.wallet?.ens) {
            return `https://app.ens.domains/${thread.peer.wallet?.ens}`;
        }
        return `https://etherscan.io/address/${thread.conversation.peerAddress}}`;
    };

    const getPeerHandle = (): string => {
        if (isLensThread(thread) && thread?.peer?.profile && peerName !== thread.peer.profile.handle) {
            return thread.peer.profile.handle;
        } else if (thread?.peer?.wallet?.ens && peerName !== thread.peer.wallet?.ens) {
            return thread.peer.wallet?.ens;
        }
        return truncateAddress(thread.conversation.peerAddress);
    };

    $: peerProfile = thread?.peer?.profile;
    $: avatarUrl = peerProfile ? getAvatarForProfile(peerProfile) : getAvatarFromAddress(thread?.conversation?.peerAddress);
    $: peerName = thread && getPeerName(thread);
    $: peerHandle = thread && getPeerHandle();

    $: {
        console.log('peerProfile', peerProfile, 'peerName', peerName, 'peerHandle', peerHandle);
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (peerName) {
            pageTitle = `Chat with ${peerName} | Focalize`;
        }
    }

    const onFocus = () => {
        windowBlinker.stop();
    };

    $: {
        if (thread?.conversation?.topic) {
            saveWindowId();
        }
    }

    onMount(async () => {
        storePopup.set({computePosition, autoUpdate, flip, shift, offset, arrow});

        window.addEventListener('focus', onFocus);

        await ensureUser();

        const queryString = window.location.search;
        const urlParams = getSearchParamsMap(queryString);
        const topic = urlParams.topic;

        if (!topic) {
            loading = false;
            return;
        }

        thread = await getThread(topic);

        if (!thread) {
            window.close();
            return;
        }

        chrome.notifications.clear(topic);
        loading = false;
    });

    onDestroy(() => {
        window.removeEventListener('focus', onFocus);
        windowBlinker.stop();
    });
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

{#if loading}

  <div class="w-full h-full flex justify-center items-center">
    <LoadingSpinner/>
  </div>

{:else if thread}

  <div class="flex flex-col h-full">

    <div class="flex h-14 px-2 py-3 border-b border-surface-200-700-token items-center flex-none">

      <a href={getPeerUrl()} target="_blank" rel="noreferrer">
        <img src={avatarUrl ?? ImageAvatar} alt="avatar" loading="lazy" decoding="async"
             bind:this={avatarElement}
             class="w-10 h-10 none rounded-full object-cover bg-gray-300 text-white hover:opacity-80 cursor-pointer">
      </a>

      <div class="flex flex-grow justify-center">
        <div bind:this={userInfoElement} class="flex flex-col justify-center text-center">
          <a href={getPeerUrl()} target="_blank" rel="noreferrer"
             class="flex flex-col !no-underline !text-black dark:!text-white hover:!text-orange-400 dark:hover:!text-orange-400">
            <span class="text-sm font-medium">{peerName}</span>
            {#if peerHandle}
              <span class="text-xs opacity-50">{peerHandle}</span>
            {/if}
          </a>
        </div>
      </div>

      <div class="w-10 flex-none">

      </div>

    </div>

    <MessagesList {thread} on:newMessage={() => windowBlinker.start(`New message from ${peerName}`, pageTitle)}/>

    <div class="flex flex-none border-t border-surface-200-700-token p-2 items-center">

      <div class="flex-grow flex items-center gap-2">

        <MessengerTextarea {text} on:textChanged={onTextChange} on:enterPressed={onSubmit}
                           className="!rounded-full" placeholder="Message"/>

        <button disabled={!text} on:click={onSubmit}
                class="btn btn-icon variant-filled-primary">
          <svg class="w-5 h-5 text-white pl-0.5" viewBox="0 96 960 960" fill="currentColor">
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

{:else}

  <div class="flex flex-col h-full">

    <div
        class="flex h-16 flex-none bg-surface-100-800-token justify-center items-center border-b border-surface-200-700-token">
      <div class="text-base text-center">
        New Message
      </div>
    </div>

    <div class="flex-grow">
      <NewThreadRecipientInput on:peerSelected={(e) => newMessagePeer = e.detail}/>
    </div>

    {#if newMessagePeer}
      <div class="flex flex-none border-t border-surface-200-700-token p-2 items-center">
        <div class="flex-grow flex items-center gap-2">

          <MessengerTextarea {text} on:textChanged={onTextChange} on:enterPressed={onSubmit}
                             className="!rounded-full" placeholder="Message"/>

          <button disabled={!text} on:click={onSubmit}
                  class="btn btn-icon variant-filled-primary">
            <svg class="w-5 h-5 text-white pl-0.5" viewBox="0 96 960 960" fill="currentColor">
              <path
                  d="M162 878q-15 6-28.5-2.5T120 851V674q0-11 6.5-19t16.5-10l279-69-279-71q-10-2-16.5-10t-6.5-19V301q0-16 13.5-24.5T162 274l652 274q18 8 18 28t-18 28L162 878Z"/>
            </svg>
          </button>

        </div>
      </div>
    {/if}

  </div>

{/if}

<Toast position="t"/>