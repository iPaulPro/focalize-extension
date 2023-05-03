<script lang="ts">
  import type {Thread} from '../../lib/xmtp-service';
  import type {DecodedMessage} from '@xmtp/xmtp-js';
  import {onMount} from 'svelte';
  import {getMessages, getMessagesStream} from '../../lib/xmtp-service';
  import type {Subscription} from 'rxjs';
  import MessageItem from './MessageItem.svelte';

  export let conversation: Thread;

  let listElement: HTMLUListElement;
  let scrollElement: HTMLElement;

  let messages: DecodedMessage[];
  let messagesSubscription: Subscription;

  $: messagesReversed = messages.slice().reverse();

  const init = async () => {
      messages = await getMessages(conversation);

      messagesSubscription = getMessagesStream(conversation).subscribe((newMessages) => {
          messages = [newMessages, ...messages];
      });
  };

  onMount(async () => {
      await init();
  });
</script>

<div bind:this={scrollElement}
     class="w-full h-full overflow-y-auto">

  <ul bind:this={listElement}
      class="w-full h-fit bg-gray-100 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

    {#each messagesReversed as message}
      <MessageItem {message} />
    {/each}
  </ul>

</div>

<style>
</style>