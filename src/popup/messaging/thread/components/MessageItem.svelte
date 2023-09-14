<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {fade} from 'svelte/transition';
    import type {DecodedMessage} from '@xmtp/xmtp-js';
    import {DateTime} from 'luxon';

    import {isPeerMessage, isToday} from '../../../../lib/utils/utils';
    import SocialText from '../../../../lib/components/SocialText.svelte';
    import {
      ContentTypeAttachment,
      ContentTypeRemoteAttachment,
      RemoteAttachmentCodec,
      type Attachment as RemoteAttachment,
    } from "@xmtp/content-type-remote-attachment";
    import {getXmtpClient} from "../../../../lib/xmtp-service";
    import {createEventDispatcher} from 'svelte';

    const dispatch = createEventDispatcher();

    export let message: DecodedMessage;
    export let previousMessage: DecodedMessage | undefined;
    export let newMessagesTimestamp: number | undefined;

    let gettingAttachment = false;
    let attachmentLoadingError = false;
    let attachmentLoaded = false;

    $: isPeer = message && isPeerMessage(message);
    $: sentDate = message && DateTime.fromJSDate(message.sent);
    $: sameSenderAsPrevious = previousMessage && (isPeerMessage(previousMessage) === isPeer);
    $: showDate = message && (!previousMessage || (!isToday(sentDate, DateTime.fromJSDate(previousMessage.sent))));
    $: showNewMessagesLabel = message && isPeer && newMessagesTimestamp && message.sent.getTime() > newMessagesTimestamp &&
        (!previousMessage || previousMessage.sent.getTime() < newMessagesTimestamp);
    $: isAttachment = message && message.contentType.sameAs(ContentTypeAttachment);
    $: isRemoteAttachment = message && message.contentType.sameAs(ContentTypeRemoteAttachment);

    interface Attachment {
      mimeType: string;
      url: string;
    }

    const isImageMimeType = (mimeType: string) => mimeType?.startsWith('image/');

    const getAttachment = (message: DecodedMessage): Attachment | null => {
      console.log('Getting attachment', message);
      gettingAttachment = true;

      if (!isImageMimeType(message.content.mimeType)) {
        return null;
      }

      try {
        const blob = new Blob([message.content.data], {
          type: message.content.mimeType,
        });
        return {
          mimeType: message.content.mimeType,
          url: URL.createObjectURL(blob),
        };
      } catch (e) {
        console.error('Failed to get attachment', e);
        attachmentLoadingError = true;
        return null;
      } finally {
        gettingAttachment = false;
      }
    };

    const getRemoteAttachment = async (message: DecodedMessage): Promise<Attachment> => {
      console.log('Getting remote attachment', message);
      gettingAttachment = true;

      const client = await getXmtpClient();
      try {
        const attachment = await RemoteAttachmentCodec.load<RemoteAttachment>(message.content, client);
        console.log('Got remote attachment', attachment);

        const blob = new Blob([attachment.data], {type: attachment.mimeType});
        return {
          mimeType: attachment.mimeType,
          url: URL.createObjectURL(blob),
        };
      } catch (e) {
        console.error('Failed to get remote attachment', e);
        attachmentLoadingError = true;
        throw e;
      } finally {
        gettingAttachment = false;
      }
    };

    const onAttachmentLoaded = (e: Event) => {
      attachmentLoaded = true;
      dispatch('imageLoaded', {element: e.target});
    };
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

      {#if isAttachment}
        {@const attachment = getAttachment(message)}
        {#if attachment}
          <div class="flex justify-center">
            {#if attachment.mimeType.startsWith('image/')}
              <img src={attachment.url} alt="Image attachment"
                   class="max-w-[100%] max-h-[20rem] rounded-2xl"
                   on:error={() => {attachmentLoadingError = true}}/>
            {:else}
              <div>Unsupported attachment</div>
            {/if}
          </div>
        {/if}
      {:else if isRemoteAttachment}
        {#await getRemoteAttachment(message)}
          <div class="h-[14rem] aspect-square placeholder animate-pulse rounded-2xl"></div>
        {:then attachment}
          <div class="flex justify-center">
            {#if attachmentLoadingError}
              <div>Failed to load attachment</div>
            {:else if gettingAttachment}
              <div class="h-[14rem] aspect-square placeholder animate-pulse rounded-2xl"></div>
            {:else if attachment?.mimeType?.startsWith('image/')}
              {#if !attachmentLoaded}
                <div class="h-[14rem] aspect-square placeholder animate-pulse rounded-2xl"></div>
              {/if}
              <a href={attachment.url} target="_blank" referrerpolicy='no-referrer'>
                <img alt="Image attachment"
                     src={attachment.url}
                     class="max-w-[100%] max-h-[20rem] rounded-xl pt-1 pb-0.5"
                     on:load={onAttachmentLoaded}
                     on:error={() => {attachmentLoadingError = true}}/>
              </a>
            {:else}
              <div>Unsupported attachment</div>
            {/if}
          </div>
        {:catch error}
          <div>Failed to load attachment</div>
        {/await}

      {:else}
        <SocialText text={message.content}
                    anchorClass="!no-underline
                    {isPeer ? '!text-orange-800 dark:!text-orange-100 hover:!text-orange-400 dark:hover:!text-orange-300'
                    : 'self !text-orange-100 hover:!text-orange-300'}"
        />
      {/if}

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