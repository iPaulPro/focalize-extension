<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {fade} from 'svelte/transition';
    import type {DecodedMessage} from '@xmtp/xmtp-js';
    import {DateTime} from 'luxon';

    import {isPeerMessage, isToday} from '../../../../lib/utils';
    import SocialText from '../../../../lib/components/SocialText.svelte';

    export let message: DecodedMessage;
    export let previousMessage: DecodedMessage;
    export let newMessagesTimestamp: number;

    $: isPeer = message && isPeerMessage(message);
    $: sentDate = message && DateTime.fromJSDate(message.sent);
    $: sameSenderAsPrevious = previousMessage && (isPeerMessage(previousMessage) === isPeer);
    $: showDate = message && (!previousMessage || (!isToday(sentDate, DateTime.fromJSDate(previousMessage.sent))));
    $: showNewMessagesLabel = message && isPeer && newMessagesTimestamp && message.sent > newMessagesTimestamp &&
        (!previousMessage || previousMessage.sent < newMessagesTimestamp);
</script>

{#if message}

  {#if showDate}
    <div class="flex justify-center text-xs opacity-50 pt-2">
      <span>{sentDate.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}</span>
    </div>
  {/if}

  {#if showNewMessagesLabel}
    <div class="flex justify-center text-xs py-2" out:fade>
      <span class="px-2 py-1 variant-soft-primary rounded-full">
        New messages
      </span>
    </div>
  {/if}

  <div class="flex {isPeer ? 'justify-start' : 'justify-end'}
             {sameSenderAsPrevious && !showDate ? 'pt-0' : showDate ? 'pt-2' : 'pt-3' }">

    <div class="flex flex-col w-4/5 sm:w-3/5 md:w-3/5 lg:w-2/5 xl:w-1/3 px-2.5 pt-2 pb-1 text-[0.925rem]
               {isPeer ? 'peer-message' : 'self-message'}">

      <SocialText text={message.content}
                  anchorClass="!no-underline
                  {isPeer ? '!text-orange-800 dark:!text-orange-100 hover:!text-orange-400 dark:hover:!text-orange-300'
                  : '!text-orange-100 hover:!text-orange-300'}"
      />

      <div class="flex {isPeer ? 'justify-start' : 'justify-end'} text-xs pt-0.5">
        <span class="opacity-50 cursor-help"
              use:tippy={({
                delay: 500,
                placement: 'bottom',
                content: sentDate.toLocaleString(DateTime.DATETIME_MED)
              })}>
          {sentDate.toLocaleString(DateTime.TIME_SIMPLE)}
        </span>
      </div>

    </div>

  </div>

{/if}

<style>
  .peer-message {
    @apply bg-gray-200 dark:bg-gray-700 rounded-tr-2xl rounded-b-2xl;
  }

  .self-message {
    @apply bg-secondary-500 dark:bg-secondary-600 rounded-t-2xl rounded-bl-2xl text-white;
  }
</style>