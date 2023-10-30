<script lang="ts">
    import {onMount, createEventDispatcher, onDestroy} from 'svelte';
    import {debounce} from 'throttle-debounce';
    import {searchHandles} from '../../../../lib/user/search-handles';
    import Tribute, {type TributeItem} from 'tributejs';
    import {resizeTextarea} from '../../../../lib/utils/utils';
    import {buildTributeUsernameMenuTemplate} from '../../../../lib/user/tribute-username-template';
    import type {Action} from 'svelte/action';
    import type { ProfileFragment } from '@lens-protocol/client';

    export let text: string = '';
    export let className: string = '';
    export let placeholder: string = '';

    let tributeActive = false;

    const dispatch = createEventDispatcher();

    let textarea: HTMLTextAreaElement | undefined;

    const focusTextArea = () => {
        textarea?.focus();
    };

    const dispatchTextChanged = debounce(250, () => {
        dispatch('textChanged', {text});
    });

    const handleInput = async () => {
        await resizeTextarea(textarea);
        dispatchTextChanged();
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (tributeActive) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            dispatch('enterPressed', {text});
        }
    };

    const focusHandler = () => {
        focusTextArea();
    };

    const tribute: Action = (node: HTMLElement) => {
        const t = new Tribute({
            values: (text, cb) => searchHandles(text, 4, cb),
            menuItemTemplate: (item: TributeItem<ProfileFragment>) => buildTributeUsernameMenuTemplate(item),
            fillAttr: 'handle',
            lookup: 'handle',
        })

        t.attach(node);

        return {
            destroy() {
                t.detach(node);
            }
        }
    };

    $: if (textarea && !text?.length) {
        resizeTextarea(textarea).catch(() => {});
    }

    onMount(async () => {
        window.addEventListener('focus', focusHandler);

        if (textarea) {
            textarea.addEventListener('tribute-active-true', () => tributeActive = true);
            textarea.addEventListener('tribute-active-false', () => tributeActive = false);
            await resizeTextarea(textarea);
            focusTextArea();
        }
    });

    onDestroy(() => {
        window.removeEventListener('focus', focusHandler);
    });
</script>

<textarea
    bind:this={textarea}
    class="w-full overflow-hidden resize-none bg-transparent text-[0.925rem] leading-tight py-3 px-4
    border-surface-200-700-token focus:border-primary-400-500-token focus:ring-0 !rounded-2xl
    {className}"
    placeholder={placeholder}
    rows="1"
    bind:value={text}
    on:input={handleInput}
    on:keydown={handleKeydown}
    use:tribute
></textarea>

<style>
  *::-webkit-scrollbar-track {
    margin: 1rem 0;
  }
</style>
