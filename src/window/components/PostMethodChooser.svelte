<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {useDispatcher, useRelay} from '../../lib/stores/preferences-store';

    export let anchorNode;

    const dispatch = createEventDispatcher();

    const onUseDispatcherSelected = () => {
        $useDispatcher = true;
        const event = new CustomEvent('useDispatcher');
        anchorNode.dispatchEvent(event);
    };

    const onUseRelaySelected = () => {
        $useDispatcher = false;
        $useRelay = true;
    };

    const onUseNoneSelected = () => {
        $useDispatcher = false;
        $useRelay = false;
    };
</script>

<div class="p-1 flex flex-col text-start bg-white dark:bg-gray-700 rounded-xl flex flex-col shadow-lg
     text-black dark:text-white border border-gray-200 dark:border-gray-600">

  <button type="button" on:click={onUseDispatcherSelected}
       class="group w-full flex items-center p-2 rounded-xl gap-3 justify-between cursor-pointer text-start
       hover:bg-orange-300 dark:hover:bg-gray-800">

    <span class="inline-block w-max flex flex-col pl-2 pr-4">
      <span class="text-sm"><span class="font-semibold">Seamless</span> <span class="opacity-60">(no popups)</span></span>
      <span class="pt-1 text-xs whitespace-pre-line">Post without signing or paying gas</span>
    </span>

    {#if $useDispatcher}
      <span class="mr-1 p-1.5 rounded-full bg-orange"></span>
    {/if}
  </button>

  <button type="button" on:click={onUseRelaySelected}
       class="group w-full flex items-center p-2 rounded-xl gap-3 justify-between cursor-pointer text-start
       hover:bg-orange-300 dark:hover:bg-gray-800">

    <span class="inline-blockw-max flex flex-col pl-2 pr-4">
      <span class="font-semibold text-sm">Self-sign</span>
      <span class="pt-1 text-xs whitespace-pre-line">Post for free but sign your transactions</span>
    </span>

    {#if $useRelay && !$useDispatcher}
      <span class="mr-1 p-1.5 rounded-full bg-orange"></span>
    {/if}
  </button>

  <button type="button" on:click={onUseNoneSelected}
       class="group w-full flex items-center p-2 rounded-xl gap-3 justify-between cursor-pointer text-start
       hover:bg-orange-300 dark:hover:bg-gray-800">

    <span class="inline-blockw-max flex flex-col pl-2 pr-4">
      <span class="font-semibold text-sm">Paid</span>
      <span class="pt-1 text-xs whitespace-pre-line">Pay for your own gas</span>
    </span>

    {#if !$useDispatcher && !$useRelay}
      <span class="mr-1 p-1.5 rounded-full bg-orange"></span>
    {/if}

  </button>

</div>