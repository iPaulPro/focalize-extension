<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import {getEnsFromAddress, truncate} from '../../lib/utils/utils';
    import {type CompactMessage, getPeerName, isLensThread, isUnread, type Thread} from '../../lib/xmtp-service';
    import {createEventDispatcher} from 'svelte';
    import {DateTime} from 'luxon';
    import FloatingComponent from '../../lib/components/FloatingComponent.svelte';
    import ProfileHoverCard from '../../lib/components/ProfileHoverCard.svelte';
    import AutoRelativeTimeView from '../../lib/components/AutoRelativeTimeView.svelte';
    import {getLatestMessage} from '../../lib/stores/cache-store';
    import { getProfileAvatar } from '../../lib/utils/lens-utils';

    const dispatch = createEventDispatcher();

    export let thread: Thread;

    let avatarElement: HTMLImageElement;

    let ens: string | undefined | null = thread?.peer?.wallet?.ens;

    $: peerProfile = thread?.peer?.profile;
    $: peerAddress = thread?.peer?.profile?.ownedBy.address ?? thread?.peer?.wallet?.address!;
    $: unread = thread?.unread;
    $: avatarUrl = peerProfile && getProfileAvatar(peerProfile);
    $: peerName = thread?.peer && getPeerName(thread, ens);

    const latestMessage = getLatestMessage(thread?.conversation?.topic);

    const checkIfUnread = async (message: CompactMessage) => {
        thread.unread = await isUnread(message);
    };

    $: $latestMessage && checkIfUnread($latestMessage);

    $: if (!isLensThread(thread) && ens === undefined) {
        getEnsFromAddress(peerAddress).then(result => {
            ens = result;
        });
    }
</script>

{#if thread?.conversation}
  <div on:click={() => dispatch('select', {thread})}
       class="flex p-4 gap-2 w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
       {unread ? 'bg-white dark:bg-gray-700/60' : ''}">

    <img loading="lazy" decoding="async" src={avatarUrl ?? ImageAvatar} alt="avatar"
         bind:this={avatarElement}
         class="w-10 h-10 shrink-0 rounded-full object-cover bg-gray-300 text-white hover:opacity-80">

    <div class="flex flex-col w-full h-full justify-center">

      <div class="flex gap-1 text-[0.925rem] items-center">

        <div class="flex-shrink-0 w-fit truncate {unread ? 'font-semibold' : 'font-normal'}">
          {peerName}
        </div>

        {#if $latestMessage}
          <div class="flex-shrink-0 flex-grow flex justify-end">
            <div use:tippy={{
                  delay: 500,
                  placement: 'bottom',
                  content: DateTime.fromMillis($latestMessage.timestamp).toLocaleString(DateTime.DATETIME_MED)
                 }}>
              <AutoRelativeTimeView timestamp={$latestMessage.timestamp} capitalize={true}
                                    className="text-xs {unread ? 'opacity-100 font-medium' : 'opacity-70'}" />
            </div>
          </div>
        {/if}
      </div>

      {#if !$latestMessage}
        <div class="placeholder animate-pulse"></div>
      {:else if $latestMessage}
        <div class="line-clamp-2 {unread ? 'opacity-80 font-medium' : 'opacity-60'} text-sm">
            {#if $latestMessage.content}
                {truncate($latestMessage.content, 90)}
            {/if}
        </div>
      {/if}

    </div>

  </div>
{/if}

{#if avatarElement && peerProfile}
  <FloatingComponent anchors={[avatarElement]} showDelay={500} hideDelay={200} interactive={true}>
    <ProfileHoverCard profile={peerProfile}/>
  </FloatingComponent>
{/if}