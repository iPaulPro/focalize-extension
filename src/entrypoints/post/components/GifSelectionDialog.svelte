<script lang="ts">
    import GiphyGrid from './GiphyGrid.svelte';
    import { createEventDispatcher } from 'svelte';

    export let isCompact: boolean = false;

    let input: HTMLInputElement;
    let searchQuery: string;

    export const onGifDialogShown = () => {
        searchQuery = '';
        input?.focus();
    };

    const dispatch = createEventDispatcher<any>();

    const onGifSelected = () => {
        dispatch('gifSelected');
    };
</script>

<div class="flex flex-col">
    <div class="relative flex-none p-2 pt-3 dark:bg-gray-800">
        <input
            type="text"
            name="search"
            id="gifSearch"
            placeholder="Search gifs..."
            autocomplete="off"
            class="w-full rounded-xl {isCompact
                ? 'py-1 text-base'
                : 'py-2 text-lg'} appearance-none border
           border-gray-300 px-4 placeholder-gray-400
           focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-200
           dark:border-transparent dark:bg-gray-600 dark:text-gray-200"
            bind:value={searchQuery}
            bind:this={input}
        />

        {#if searchQuery?.length > 0}
            <div class="absolute right-0 top-0">
                <button
                    type="button"
                    class="mr-3 mt-3 rounded-full p-2 text-gray-500 hover:text-orange dark:text-gray-400"
                    on:click={() => (searchQuery = '')}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="h-5 w-5"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        {/if}
    </div>

    <div class="grow p-2 dark:bg-gray-800">
        <GiphyGrid {searchQuery} on:gifSelected={onGifSelected} />
    </div>
</div>
