<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {signAsSelf} from '../../lib/store/preferences-store';

    export let anchorNode;

    const dispatch = createEventDispatcher();

    const onUseDispatcherSelected = () => {
        $signAsSelf = false;
        const event = new CustomEvent('useDispatcher');
        anchorNode.dispatchEvent(event);
    }
</script>

<div class="p-1 flex flex-col text-start bg-white dark:bg-gray-700 rounded-xl flex flex-col shadow-lg
     text-black dark:text-white border border-gray-200 dark:border-gray-600">

  <button on:click={onUseDispatcherSelected}
       class="group w-full flex items-center p-2 rounded-xl gap-3 justify-between cursor-pointer text-start
       hover:bg-orange-300 dark:hover:bg-gray-800">

    <div class="w-max flex flex-col pl-2 pr-4">
      <div class="font-semibold text-sm transition-none">Free</div>
      <div class="pt-1 text-xs whitespace-pre-line transition-none">Post without signing or paying gas</div>
    </div>

    {#if !$signAsSelf}
      <div class="mr-1 p-1.5 rounded-full bg-orange"></div>
    {/if}
  </button>

  <button on:click={() => $signAsSelf = true}
       class="group w-full flex items-center p-2 rounded-xl gap-3 justify-between cursor-pointer text-start
       hover:bg-orange-300 dark:hover:bg-gray-800">

    <div class="w-max flex flex-col pl-2 pr-4">
      <div class="font-semibold text-sm transition-none">Paid</div>
      <div class="pt-1 text-xs whitespace-pre-line transition-none">Pay for your own gas</div>
    </div>

    {#if $signAsSelf}
      <div class="mr-1 p-1.5 rounded-full bg-orange"></div>
    {/if}

  </button>

</div>