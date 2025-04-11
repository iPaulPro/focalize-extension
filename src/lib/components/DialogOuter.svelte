<script lang="ts">
    import { onMount } from 'svelte';
    import { isPopup } from '../utils/utils';

    export let title: string | undefined = undefined;
    let isCompact: boolean = false;

    onMount(async () => {
        isCompact = await isPopup();
    });
</script>

<div class="flex max-h-screen flex-col text-black dark:text-white">
    {#if title}
        <div
            class="flex flex-none items-center justify-between {isCompact
                ? 'px-4 py-2'
                : 'px-5 py-3'} border-b border-gray-200
       pr-3 dark:border-gray-700"
        >
            <div class="text-base font-semibold">
                {title}
            </div>
            <form method="dialog">
                <button
                    class="rounded-full p-2 transition-none hover:bg-gray-300 focus:outline-orange-400
              focus:ring-orange-400 focus:ring-offset-orange-200 dark:hover:bg-gray-500"
                >
                    <svg
                        class="h-5 w-5 text-gray-500 dark:text-gray-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </form>
        </div>
    {/if}

    <slot></slot>
</div>
