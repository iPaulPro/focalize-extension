<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import {getAvatarForProfile, getAvatarFromAddress, truncate, truncateAddress} from '../../lib/utils';
    import {getPeerName, type Thread} from '../../lib/xmtp-service';
    import {createEventDispatcher} from 'svelte';
    import {DateTime} from 'luxon';
    import FloatingComponent from '../../lib/components/FloatingComponent.svelte';
    import ProfileHoverCard from '../../lib/components/ProfileHoverCard.svelte';
    import AutoRelativeTimeView from '../../lib/components/AutoRelativeTimeView.svelte';

    const dispatch = createEventDispatcher();

    export let thread: Thread;

    let avatarElement: HTMLImageElement;

    $: peerProfile = thread?.peer?.profile;
    $: peerAddress = thread?.conversation?.peerAddress;
    $: latestMessage = thread?.latestMessage;
    $: isUnread = thread?.unread;
    $: avatarUrl = peerProfile ? getAvatarForProfile(peerProfile) : getAvatarFromAddress(peerAddress);
    $: peerName = thread && getPeerName(thread);
    $: peerHandle = peerProfile?.handle?.split('.')[0] ?? thread?.peer?.wallet?.ens ? truncateAddress(peerAddress) : undefined;
</script>

{#if thread?.conversation}
  <div on:click={() => dispatch('select', {thread})}
       class="flex p-4 gap-2 w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
       {isUnread ? 'bg-white dark:bg-gray-700/60' : ''}">

    <img src={avatarUrl ?? ImageAvatar} alt="avatar" loading="lazy" decoding="async"
         bind:this={avatarElement}
         class="w-10 h-10 shrink-0 rounded-full object-cover bg-gray-300 text-white hover:opacity-80">

    <div class="flex flex-col w-full h-full justify-center">

      <div class="flex gap-1 text-[0.925rem] items-center">

        <div class="flex-shrink-0 w-fit truncate {isUnread ? 'font-semibold' : 'font-normal'}">
          {peerName ?? peerHandle}
        </div>

        {#if latestMessage}
          <div class="flex-shrink-0 flex-grow flex justify-end">
            <div use:tippy={{
                  delay: 500,
                  placement: 'bottom',
                  content: DateTime.fromJSDate(latestMessage.sent).toLocaleString(DateTime.DATETIME_MED)
                 }}>
              <AutoRelativeTimeView timestamp={latestMessage.sent.getTime()} capitalize={true}
                                    className="text-xs {isUnread ? 'opacity-100 font-medium' : 'opacity-70'}" />
            </div>
          </div>
        {/if}
      </div>

      {#if latestMessage === false}
        <div class="placeholder animate-pulse"></div>
      {:else if latestMessage}
        <div class="line-clamp-2 {isUnread ? 'opacity-80 font-medium' : 'opacity-60'} text-sm">
          {truncate(latestMessage.content, 90)}
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