<script lang="ts">
    import GiphyGrid from './GiphyGrid.svelte'
    import {createEventDispatcher} from "svelte";

    export let visible: boolean;

    let input: HTMLInputElement;
    let searchQuery: string;

    const dispatch = createEventDispatcher();

    const onGifSelected = () => {
        dispatch('gifSelected');
    }

    $: {
        // Clear the query when the dialog is opened
        if (visible) {
            searchQuery = '';
            input.focus();
        }
    }
</script>

<div class="flex flex-col">

  <div class="w-full flex justify-between">
    <div class="text-xl font-semibold pt-2 pl-2 dark:text-gray-100">
      Attach a GIF
    </div>

    <form method="dialog">
      <button type="button" class="p-2 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full transition-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="w-6 h-6 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-none">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
      </button>
    </form>
  </div>

  <div class="relative p-2 flex-shrink-0">
    <input type="text" name="search" id="gifSearch" placeholder="Search gifs..." autocomplete="off"
           class="w-full text-lg rounded-xl py-2 px-4 placeholder-gray-400
           dark:bg-gray-600 dark:text-gray-200 dark:border-transparent
           focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent
           appearance-none border border-gray-300"
           bind:value={searchQuery} bind:this={input}>

    {#if searchQuery?.length > 0}
      <div class="absolute right-0 top-0">
        <button type="button" class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-orange mr-3 mt-3"
                on:click={() => searchQuery = ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               class="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    {/if}
  </div>

  <div class="p-2 h-[24rem] overflow-y-scroll">
    <GiphyGrid {searchQuery} on:gifSelected={onGifSelected} />
  </div>

</div>