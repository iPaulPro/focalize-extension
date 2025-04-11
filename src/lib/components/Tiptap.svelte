<script lang="ts">
    import { tippy as svelteTippy } from 'svelte-tippy';
    import { onMount } from 'svelte';
    import { type Readable } from 'svelte/store';
    import { content } from '../stores/state-store';

    import { createEditor, Editor, EditorContent, BubbleMenu } from 'svelte-tiptap';
    import FloatingLinkEditor from '../editor/components/FloatingLinkEditor.svelte';
    import { extensions } from '../editor/tiptap-config';
    import { AccountMention } from '@/lib/editor/extensions/AccountSuggestion';
    import { GroupMention } from '@/lib/editor/extensions/GroupSuggestion';
    import { getCached, KEY_GROUPS_CACHE } from '@/lib/stores/cache-store';

    let editor: Readable<Editor>;
    let isEditingLink = false;

    export let isCompact = false;

    export const setContent = (text: string) => {
        $editor.commands.setContent(text);
    };

    export const insertAtSelection = (text: string) => {
        $editor.commands.insertContent(text);
    };

    onMount(async () => {
        const groupCache = await getCached<Map<string, string>>(KEY_GROUPS_CACHE);
        editor = createEditor({
            content: $content,
            editorProps: {
                attributes: () => ({
                    class: `text-editor ${isCompact ? 'min-h-[8em]' : 'min-h-[10em]'}`,
                }),
            },
            autofocus: true,
            extensions: [
                AccountMention,
                GroupMention.configure({ groups: groupCache }),
                ...extensions,
            ],
            onUpdate: ({ editor }) => {
                $content = editor.storage.markdown.getMarkdown();
            },
        });
    });

    $: linkActive = $editor?.isActive('link');

    $: suggestionActive = $editor?.isActive('lensSuggestion');

    $: if (!linkActive) {
        isEditingLink = false;
    }
</script>

{#if $editor}
    <EditorContent editor={$editor} />
    <BubbleMenu
        editor={$editor}
        tippyOptions={{
            arrow: false,
            placement: 'auto-start',
        }}
    >
        <div class="flex text-black dark:text-white">
            {#if linkActive || isEditingLink}
                <FloatingLinkEditor editor={$editor} />
            {:else if !suggestionActive}
                <!-- Bold -->
                <button
                    type="button"
                    class="command"
                    class:is-active={$editor.isActive('bold')}
                    on:click={() => $editor.chain().focus().toggleBold().run()}
                    use:svelteTippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: 'Bold',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="command-icon"
                    >
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    </svg>
                </button>

                <!-- Italic -->
                <button
                    type="button"
                    class="command"
                    class:is-active={$editor.isActive('italic')}
                    on:click={() => $editor.chain().focus().toggleItalic().run()}
                    use:svelteTippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: 'Italic',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="command-icon"
                    >
                        <path d="M19 4h-9M14 20H5M14.7 4.7L9.2 19.4" />
                    </svg>
                </button>

                <!-- Strikethrough -->
                <button
                    type="button"
                    class="command"
                    class:is-active={$editor.isActive('strike')}
                    on:click={() => $editor.chain().focus().toggleStrike().run()}
                    use:svelteTippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: 'Strikethrough',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="command-icon"
                    >
                        <path
                            d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 3.7c.3.4.4.8.4 1.3 0 2.9-2.7 3.6-6.2 3.6-2.3 0-4.4-.3-6.2-.9M4 11.5h16"
                        />
                    </svg>
                </button>

                <!-- Code -->
                <button
                    type="button"
                    class="command"
                    class:is-active={$editor.isActive('code')}
                    on:click={() => $editor.chain().focus().toggleCode().run()}
                    use:svelteTippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: 'Code',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="command-icon"
                    >
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                </button>

                <!-- Link -->
                <button
                    type="button"
                    class="command"
                    class:is-active={$editor.isActive('link')}
                    on:click={() => (isEditingLink = true)}
                    use:svelteTippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: 'Link',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="command-icon"
                    >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                        ></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                        ></path>
                    </svg>
                </button>

                <!-- Quote -->
                <button
                    type="button"
                    class="command"
                    class:isactive={$editor.isActive('blockquote')}
                    on:click={() => $editor.chain().focus().toggleBlockquote().run()}
                    use:svelteTippy={{
                        delay: 500,
                        placement: 'bottom',
                        content: 'Quote',
                    }}
                >
                    <svg viewBox="0 -960 960 960" class="command-icon" fill="currentColor">
                        <path
                            d="M697.385-290.001q-17.692 0-26.73-14.538-9.039-14.538-1.116-30.383l54.155-115.079h-148.31q-18.845 0-32.114-13.269-13.269-13.269-13.269-32.114v-169.232q0-18.845 13.269-32.114 13.269-13.269 32.114-13.269h169.232q18.845 0 32.114 13.269 13.269 13.269 13.269 32.114v207.461q0 6.231-1.5 12.654t-3.73 12.038L725.23-307.077q-3.461 7.923-10.884 12.499-7.423 4.577-16.961 4.577Zm-360 0q-17.692 0-26.73-14.538-9.039-14.538-1.116-30.383l54.155-115.079h-148.31q-18.845 0-32.114-13.269-13.269-13.269-13.269-32.114v-169.232q0-18.845 13.269-32.114 13.269-13.269 32.114-13.269h169.232q18.845 0 32.114 13.269 13.269 13.269 13.269 32.114v207.461q0 6.231-1.5 12.654t-3.73 12.038L365.23-307.077q-3.461 7.923-10.884 12.499-7.423 4.577-16.961 4.577Z"
                        />
                    </svg>
                </button>
            {/if}
        </div>
    </BubbleMenu>
{/if}

<style>
    .command {
        @apply flex h-full w-full items-center justify-center px-4 py-3 hover:bg-gray-200 dark:hover:bg-gray-700;
    }

    .command:first-of-type {
        @apply rounded-l-xl ps-5;
    }

    .command:last-of-type {
        @apply rounded-r-xl pe-5;
    }

    .is-active {
        @apply bg-gray-100 text-orange-700 dark:bg-gray-800 dark:text-orange-300;
    }

    .command-icon {
        @apply h-5 w-5;
    }
</style>
