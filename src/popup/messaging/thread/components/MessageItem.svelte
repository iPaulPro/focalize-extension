<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {fade} from 'svelte/transition';
    import type {DecodedMessage} from '@xmtp/xmtp-js';
    import {DateTime} from 'luxon';

    import {isPeerMessage, isToday} from '../../../../lib/utils/utils';
    import SocialText from '../../../../lib/components/SocialText.svelte';

    export let message: DecodedMessage;
    export let previousMessage: DecodedMessage;
    export let newMessagesTimestamp: number | undefined;

    $: isPeer = message && isPeerMessage(message);
    $: sentDate = message && DateTime.fromJSDate(message.sent);
    $: sameSenderAsPrevious = previousMessage && (isPeerMessage(previousMessage) === isPeer);
    $: showDate = message && (!previousMessage || (!isToday(sentDate, DateTime.fromJSDate(previousMessage.sent))));
    $: showNewMessagesLabel = message && isPeer && newMessagesTimestamp && message.sent.getTime() > newMessagesTimestamp &&
        (!previousMessage || previousMessage.sent.getTime() < newMessagesTimestamp);
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

  <div class="flex {isPeer ? 'justify-start' : 'justify-end dark'}
             {sameSenderAsPrevious && !showDate ? 'pt-0' : showDate ? 'pt-2' : 'pt-3' }">

    <div class="flex flex-col w-fit max-w-[80%] md:max-w-[60%] lg:max-w-[40%] px-3 pt-2 pb-1 text-[0.95rem]
               {isPeer ? 'peer-message' : 'self-message'}">

      <SocialText text={message.content}
                  anchorClass="!no-underline
                  {isPeer ? '!text-orange-800 dark:!text-orange-100 hover:!text-orange-400 dark:hover:!text-orange-300'
                  : 'self !text-orange-100 hover:!text-orange-300'}"
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
    @apply bg-gray-200 dark:bg-gray-700 rounded-tr-2xl rounded-b-2xl rounded-tl-sm;
  }

  .self-message {
    @apply bg-secondary-500 dark:bg-secondary-600 rounded-t-2xl rounded-bl-2xl rounded-br-sm text-white;
  }
</style>