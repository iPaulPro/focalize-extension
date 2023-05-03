<script lang="ts">
    import {createEventDispatcher, onMount} from 'svelte';
    import type {DecodedMessage} from '@xmtp/xmtp-js';

    const dispatch = createEventDispatcher();

    export let message: DecodedMessage;
</script>

{#if message}
  <div on:click={() => dispatch('select', {message})}
       class="p-2 leading-tight">
    {message.content}
  </div>
{/if}