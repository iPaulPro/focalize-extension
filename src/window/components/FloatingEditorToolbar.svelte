<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {createEventDispatcher, onDestroy} from 'svelte';
    import {fade, scale} from 'svelte/transition';
    import {autoUpdate, computePosition, flip, offset, shift, type ComputePositionConfig} from '@floating-ui/dom';
    import {RangeSelection} from 'lexical';
    import {DateTime} from 'luxon';

    export let isVisible = false;

    export let anchor: DOMRect;
    export let selection: RangeSelection;
    export let blockType: string;
    export let config: ComputePositionConfig = {
        strategy: 'absolute',
        middleware: [offset(6), flip(), shift({padding: 5})],
    };

    const dispatch = createEventDispatcher();

    let container: HTMLElement;
    let autoUpdateDisposer: void;

    $: virtualElement = {
        getBoundingClientRect() {
            return anchor;
        },
    };

    const updatePosition = async () => {
        if (!virtualElement || !container) return;

        const {strategy, x, y} = await computePosition(virtualElement, container, config);
        Object.assign(container.style, {
            position: strategy,
            left: `${x}px`,
            top: `${y}px`,
        });
    };

    $: if (virtualElement && container) {
        if (autoUpdateDisposer) autoUpdateDisposer();

        autoUpdateDisposer = autoUpdate(virtualElement, container, updatePosition);
        if (!autoUpdateDisposer) updatePosition();
    }

    $: isBold = selection && selection.hasFormat('bold');
    $: isItalic = selection && selection.hasFormat('italic');
    $: isStrikethrough = selection && selection.hasFormat('strikethrough');
    $: isCode = selection && selection.hasFormat('code');
    $: isQuote = selection && blockType && blockType === 'quote';
    $: isLink = selection && blockType && blockType === 'link';

    const onCommand = (command: string) => dispatch('command', command);

    onDestroy(() => {
        if (autoUpdateDisposer) autoUpdateDisposer();
    });
</script>

{#if isVisible}
  <div bind:this={container} in:scale={{duration: 100}} out:fade={{duration: 50}}
       class="flex bg-gray-50 dark:bg-gray-700 z-50
             rounded-xl shadow-lg border border-gray-200 dark:border-gray-700
             divide-x divide-gray-200 dark:divide-gray-600">

    <!-- Bold -->
    <button type="button" class="command" class:active={isBold}
            on:click={() => onCommand('bold')}
            use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: 'Bold'
           })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="command-icon">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
      </svg>
    </button>

    <!-- Italic -->
    <button type="button" class="command" class:active={isItalic}
            on:click={() => onCommand('italic')}
            use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: 'Italic'
           })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="command-icon">
        <path d="M19 4h-9M14 20H5M14.7 4.7L9.2 19.4"/>
      </svg>
    </button>

    <!-- Strikethrough -->
    <button type="button" class="command" class:active={isStrikethrough}
            on:click={() => onCommand('strikethrough')}
            use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: 'Strikethrough'
           })}>
      <svg viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="command-icon">
        <path
            d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 3.7c.3.4.4.8.4 1.3 0 2.9-2.7 3.6-6.2 3.6-2.3 0-4.4-.3-6.2-.9M4 11.5h16"/>
      </svg>
    </button>

    <!-- Code -->
    <button type="button" class="command" class:active={isCode}
            on:click={() => onCommand('code')}
            use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: 'Code'
           })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="command-icon">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    </button>

    <!-- Link -->
    <button type="button" class="command" class:active={isLink}
            on:click={() => onCommand('link')}
            use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: 'Link'
           })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="command-icon">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </button>

    <!-- Quote -->
    <button type="button" class="command" class:active={isQuote}
            on:click={() => onCommand('quote')}
            use:tippy={({
             delay: 500,
             placement: 'bottom',
             content: 'Quote'
           })}>
      <svg viewBox="0 -960 960 960" class="command-icon" fill="currentColor">
        <path
            d="M697.385-290.001q-17.692 0-26.73-14.538-9.039-14.538-1.116-30.383l54.155-115.079h-148.31q-18.845 0-32.114-13.269-13.269-13.269-13.269-32.114v-169.232q0-18.845 13.269-32.114 13.269-13.269 32.114-13.269h169.232q18.845 0 32.114 13.269 13.269 13.269 13.269 32.114v207.461q0 6.231-1.5 12.654t-3.73 12.038L725.23-307.077q-3.461 7.923-10.884 12.499-7.423 4.577-16.961 4.577Zm-360 0q-17.692 0-26.73-14.538-9.039-14.538-1.116-30.383l54.155-115.079h-148.31q-18.845 0-32.114-13.269-13.269-13.269-13.269-32.114v-169.232q0-18.845 13.269-32.114 13.269-13.269 32.114-13.269h169.232q18.845 0 32.114 13.269 13.269 13.269 13.269 32.114v207.461q0 6.231-1.5 12.654t-3.73 12.038L365.23-307.077q-3.461 7.923-10.884 12.499-7.423 4.577-16.961 4.577Z"/>
      </svg>
    </button>

  </div>
{/if}

<style>
  .command {
    @apply w-full h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-900 py-4 px-5;
  }

  .command:first-of-type {
    @apply rounded-l-xl;
  }

  .command:last-of-type {
    @apply rounded-r-xl;
  }

  .active {
    @apply bg-gray-100 dark:bg-gray-800 text-orange-700 dark:text-orange-300;
  }

  .command-icon {
    @apply w-5 h-5;
  }
</style>