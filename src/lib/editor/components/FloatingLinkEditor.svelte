<script lang="ts">
    import { onDestroy, onMount, tick } from 'svelte';
    import { z, ZodError } from 'zod';
    import type { Editor } from 'svelte-tiptap';
    import { parseUri } from '@/lib/utils/lens-utils';

    export let editor: Editor;

    let linkInput: HTMLInputElement;
    let linkUrl: string | undefined;
    let isEditing = false;
    let linkError: string | undefined = 'Invalid URL';
    let autoUpdateDisposer: () => void = () => {};

    $: linkHref = linkUrl && parseUri(linkUrl);

    const UrlSchema = z.string().url('Invalid URL');

    const validateURL = (url: string): boolean | ZodError => {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        try {
            UrlSchema.parse(url);
            return true;
        } catch (error) {
            if (error instanceof ZodError) {
                return error;
            } else {
                throw error;
            }
        }
    };

    const onSubmit = () => {
        if (!linkUrl) return;

        if (!linkUrl.startsWith('http')) {
            linkUrl = 'https://' + linkUrl;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();

        isEditing = false;
    };

    const onEditClick = async () => {
        isEditing = true;
        await tick();
        linkInput.focus();
    };

    const onRemoveClick = () => {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && linkError === undefined) {
            e.preventDefault();
            onSubmit();
        }
    };

    $: if (linkUrl !== undefined) {
        const validation = validateURL(linkUrl);
        if (validation instanceof ZodError) {
            linkError = validation.issues[0].message;
        } else {
            linkError = undefined;
        }
    }

    $: if (isEditing && linkInput) {
        linkInput.focus();
    }

    onMount(() => {
        linkUrl = editor.getAttributes('link').href;
        isEditing = !linkUrl || !linkUrl.length;
    });

    onDestroy(() => {
        autoUpdateDisposer?.();
    });
</script>

<div class="relative z-50 flex w-fit items-center gap-2 rounded-2xl p-2 backdrop-blur">
    {#if isEditing}
        <input
            type="text"
            placeholder="https://"
            bind:this={linkInput}
            bind:value={linkUrl}
            on:keydown={handleKeydown}
            class="link-bg input !pr-12"
        />

        <button
            type="button"
            disabled={linkError !== undefined}
            on:click={onSubmit}
            class="overlay overlay-btn"
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                class="h-4 w-4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </button>
    {:else}
        <div class="link-bg flex items-center justify-between">
            <a
                href={linkHref}
                target="_blank"
                rel="noopener noreferrer"
                class="flex-grow truncate text-orange-700 dark:text-orange-300"
            >
                {linkUrl}
            </a>
            <div class="flex flex-none gap-1">
                <button type="button" on:click={onRemoveClick} class="overlay-btn">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        class="h-4 w-4"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path
                            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        ></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
                <button type="button" on:click={onEditClick} class="overlay-btn">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        class="h-4 w-4"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .link-bg {
        @apply min-h-[3rem] min-w-[20rem] max-w-xs truncate rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-2 text-base shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-orange-300 dark:focus:ring-orange-300;
    }

    .overlay {
        @apply absolute right-4;
    }

    .overlay-btn {
        @apply rounded-full p-2 hover:bg-black hover:bg-opacity-10 disabled:cursor-not-allowed disabled:bg-neutral-200 dark:hover:bg-white dark:hover:bg-opacity-30 dark:disabled:bg-gray-600 dark:disabled:text-gray-400;
    }
</style>
