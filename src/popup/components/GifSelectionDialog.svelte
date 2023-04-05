<script lang="ts">
    import GiphyGrid from './GiphyGrid.svelte'
    import {createEventDispatcher} from "svelte";

    export let isCompact: boolean = false;

    let input: HTMLInputElement;
    let searchQuery: string;

    export const onGifDialogShown = () => {
        searchQuery = '';
        input?.focus();
    };

    const dispatch = createEventDispatcher();

    const onGifSelected = () => {
        dispatch('gifSelected');
    };
</script>

<div class="flex flex-col">

  <div class="relative p-2 pt-3 flex-shrink-0 dark:bg-gray-800">
    <input type="text" name="search" id="gifSearch" placeholder="Search gifs..." autocomplete="off"
           class="w-full rounded-xl {isCompact ? 'text-base py-1' : 'text-lg py-2'} px-4 placeholder-gray-400
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

  <div class="p-2 flex-grow max-h-52 xl:max-h-96 overflow-y-scroll dark:bg-gray-800">
    <GiphyGrid {searchQuery} on:gifSelected={onGifSelected} />
  </div>

</div>