<script lang="ts">
    import {
        autoUpdate,
        computePosition,
        flip,
        offset,
        shift,
        type ComputePositionConfig,
        type VirtualElement,
        type ClientRectObject
    } from '@floating-ui/dom';
    import {
        type LexicalEditor, type RangeSelection, type GridSelection, type NodeSelection,
        $getSelection as getSelection, $isRangeSelection as isRangeSelection,
    } from 'lexical';
    import {$isLinkNode as isLinkNode, toggleLink} from '@lexical/link';
    import {onDestroy} from 'svelte';
    import {fade, scale} from 'svelte/transition';

    import {getSelectedNode} from '../../lib/utils/get-selected-node';

    export let isVisible = false;
    export let editor: LexicalEditor;
    export let anchor: DOMRect | undefined;
    export let config: ComputePositionConfig = {
        strategy: 'absolute',
        middleware: [offset(6), flip(), shift({padding: 5})],
    };

    let container: HTMLElement;
    let linkUrl: string | undefined;
    let isEditing = false;
    let virtualElement: VirtualElement | undefined;
    let autoUpdateDisposer: () => void;

    $: if (anchor) {
        virtualElement = {
            getBoundingClientRect() {
                return anchor as ClientRectObject;
            },
        };
    }

    const checkForLinkSelection = () => {
        editor.update(() => {
            const selection: RangeSelection | NodeSelection | GridSelection | null = getSelection();
            if (!selection || !isRangeSelection(selection)) return;

            const node = getSelectedNode(selection);
            const parent = node.getParent();
            if (isLinkNode(parent)) {
                linkUrl = parent.getURL();
            } else if (isLinkNode(node)) {
                linkUrl = node.getURL();
            }
            isEditing = linkUrl === undefined;
            console.log('checkForLinkSelection: linkUrl', linkUrl);
        });
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

    const onSubmit = () => {
        editor.update(() => {
            toggleLink(linkUrl ?? null);
            isEditing = false;
            isVisible = false;
        });
    };

    $: if (virtualElement && container) {
        if (autoUpdateDisposer) autoUpdateDisposer();

        autoUpdateDisposer = autoUpdate(virtualElement, container, updatePosition);
        if (!autoUpdateDisposer) updatePosition();
    }

    $: if (isVisible) {
        checkForLinkSelection();
    } else {
        linkUrl = undefined;
        isEditing = false;
    }

    onDestroy(() => {
        if (autoUpdateDisposer) autoUpdateDisposer();
    });
</script>

{#if isVisible}
  <div bind:this={container} in:scale={{duration: 100}} out:fade={{duration: 50}}
       class="w-fit p-2 flex gap-2 items-center relative bg-gray-50 dark:bg-gray-700 z-50
             rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">

    {#if isEditing}

      <input type="text" placeholder="https://" bind:value={linkUrl}
             class="input link-bg">

      <button type="button" on:click={onSubmit}
              class="overlay-btn">
        <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

    {:else}

      <div class="link-bg">
        <a href={linkUrl} target="_blank" rel="noopener noreferrer"
           class="text-orange-700 dark:text-orange-300">{linkUrl}</a>
      </div>

      <button type="button" on:click={() => isEditing = true}
              class="overlay-btn">
        <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon>
        </svg>
      </button>

    {/if}

  </div>
{/if}

<style>
  .link-bg {
    @apply min-w-[18rem] py-2 px-4 text-base dark:text-gray-100 dark:placeholder-gray-400
    shadow-sm rounded-full border border-gray-300 dark:border-gray-600
    focus:ring-orange-500 focus:border-orange-500
    dark:bg-gray-600
  }

  .overlay-btn {
    @apply rounded-full absolute right-2 p-3 hover:bg-opacity-20 dark:hover:bg-opacity-30 hover:bg-black dark:hover:bg-white
  }
</style>