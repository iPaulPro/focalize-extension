<script lang="ts">
    import {onMount, createEventDispatcher, onDestroy} from 'svelte';
    import {debounce} from 'throttle-debounce';
    import {buildLoadingItemTemplate, buildTributeUsernameMenuTemplate, searchHandles} from '../../../lib/lens-search';
    import Tribute from 'tributejs';

    export let text: string = '';
    export let className: string = '';
    export let placeholder: string = '';

    const dispatch = createEventDispatcher();
    let textarea: HTMLTextAreaElement | undefined;

    const resizeTextarea = () => {
        if (!textarea) return;

        textarea.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const padding = parseInt(getComputedStyle(textarea).paddingTop);
        const maxHeight = lineHeight * 10;
        const scrollHeight = textarea.scrollHeight;

        if (scrollHeight > maxHeight) {
            textarea.style.overflowY = 'scroll';
            textarea.style.height = `${maxHeight + padding * 2}px`;
        } else {
            textarea.style.overflowY = 'hidden';
            textarea.style.height = `${scrollHeight}px`;
        }
    };

    const focusTextArea = () => {
        textarea?.focus();
    };

    const dispatchTextChanged = debounce(250, () => {
        dispatch('textChanged', {text});
    });

    const handleInput = () => {
        resizeTextarea();
        dispatchTextChanged();
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            dispatch('enterPressed', {text});
        }
    };

    const focusHandler = () => {
        focusTextArea();
    };

    const tribute = async (node) => {
        const t = new Tribute({
            values: (text, cb) => searchHandles(text, 4, cb),
            menuItemTemplate: (item) => buildTributeUsernameMenuTemplate(item),
            loadingItemTemplate: buildLoadingItemTemplate(),
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

    $: {
        if (text === '') {
            resizeTextarea();
        }
    }

    onMount(() => {
        window.addEventListener('focus', focusHandler);

        resizeTextarea();
        focusTextArea();
    });

    onDestroy(() => {
        window.removeEventListener('focus', focusHandler);
    });
</script>

<textarea
    bind:this={textarea}
    class="w-full overflow-hidden resize-none bg-transparent text-[0.925rem] leading-tight py-3 px-4
    border-surface-200-700-token focus:border-primary-400-500-token focus:ring-0
    {className}"
    placeholder="{placeholder}"
    rows="1"
    bind:value="{text}"
    on:input="{handleInput}"
    on:keydown="{handleKeydown}"
    use:tribute
></textarea>

<style>
  *::-webkit-scrollbar-track {
    margin: 1rem 0;
  }
</style>
