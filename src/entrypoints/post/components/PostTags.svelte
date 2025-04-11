<script lang="ts">
    import { afterUpdate } from 'svelte';
    import { tags } from '@/lib/stores/state-store';

    export let isCompact: boolean;
    export let disabled: boolean;

    const focusEmptyTagInput = () => {
        const tags = document.querySelectorAll('.tag');
        tags.forEach((tag) => {
            const input = tag.querySelector('.tag-edit');
            if (input instanceof HTMLInputElement && input?.value === '') {
                input.focus();
            }
        });
    };

    const addTag = () => {
        if ($tags && $tags.length >= 5) return;

        if (!$tags) $tags = [];

        const emptyTags = $tags?.filter((tag: string) => tag.length === 0);
        if (emptyTags?.length) {
            focusEmptyTagInput();
        } else {
            $tags = [...$tags, ''];
        }
    };

    const removeTag = (tag: string) => {
        $tags = $tags?.filter((t: string) => t != tag);
    };

    afterUpdate(() => {
        focusEmptyTagInput();
    });

    const onKeyPress = (e: KeyboardEvent) => {
        if (e.code === 'Enter') {
            addTag();
        }
    };

    const removeTagIfEmpty = (tag: string) => {
        if (!tag.length) $tags = $tags?.filter((value: string) => value !== tag);
    };
</script>

<div class="flex flex-wrap gap-3 dark:text-gray-200">
    {#if !$tags || $tags.length < 5}
        <button
            type="button"
            on:click={addTag}
            {disabled}
            class="px-4 {isCompact
                ? 'h-10 text-xs'
                : 'h-12 text-sm'} flex items-center justify-center gap-2
        rounded-full bg-white shadow enabled:hover:bg-gray-100 dark:bg-gray-900 enabled:dark:hover:bg-gray-600"
        >
            <span class="px-1">Add tag</span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                class="h-5 w-5 text-gray-600 dark:text-gray-200"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
        </button>
    {/if}

    {#if $tags}
        {#each $tags as tag (tag)}
            <div
                class="tag flex items-center rounded-full bg-white px-2 py-1 text-gray-900 shadow dark:bg-gray-900 dark:text-gray-200"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="ml-1 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                    ></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>

                <input
                    type="text"
                    size={Math.max(tag?.length || 0, 3)}
                    bind:value={tag}
                    on:keypress={onKeyPress}
                    on:blur={() => removeTagIfEmpty(tag)}
                    class="tag-edit border-none bg-transparent pl-2 pr-0 text-sm leading-4 focus:ring-0 dark:text-gray-100"
                    maxlength="50"
                />

                <button
                    type="button"
                    class="rounded-full bg-transparent p-2 enabled:hover:bg-gray-200 enabled:dark:hover:bg-gray-600"
                    on:click={() => removeTag(tag)}
                    {disabled}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        {/each}
    {/if}
</div>
