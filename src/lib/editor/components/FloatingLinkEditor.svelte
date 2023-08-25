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
    import {onDestroy, tick} from 'svelte';
    import {fade, scale} from 'svelte/transition';
    import { z, ZodError } from 'zod';

    import {getSelectedNode} from '../../utils/get-selected-node';

    export let isVisible = false;
    export let editor: LexicalEditor;
    export let anchor: DOMRect | undefined;
    export let config: ComputePositionConfig = {
        strategy: 'absolute',
        middleware: [offset(6), flip(), shift({padding: 5})],
    };

    let container: HTMLElement;
    let linkInput: HTMLInputElement;
    let linkUrl: string | undefined;
    let isEditing = false;
    let virtualElement: VirtualElement | undefined;
    let linkError: string | undefined = 'Invalid URL';
    let autoUpdateDisposer: () => void;

    $: if (anchor) {
        virtualElement = {
            getBoundingClientRect() {
                return anchor as ClientRectObject;
            },
        };
    }

    const UrlSchema = z.string().url("Invalid URL");

    const validateURL = (url: string): boolean | ZodError => {
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

    const checkForLinkSelection = () => {
        editor.update(async () => {
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
            if (isEditing) {
                await tick();
                linkInput.focus();
            }
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

    const onEditClick = async () => {
        isEditing = true;
        await tick();
        linkInput.focus();
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
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

    $: if (linkUrl !== undefined) {
        const validation = validateURL(linkUrl);
        if (validation instanceof ZodError) {
          linkError = validation.issues[0].message;
        } else {
          linkError = undefined;
        }
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

      <input type="text"
             placeholder="https://"
             bind:this={linkInput}
             bind:value={linkUrl}
             on:keydown={handleKeydown}
             class="input link-bg">

      <button type="button"
              disabled={linkError !== undefined}
              on:click={onSubmit}
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

      <button type="button"
              disabled={linkError !== undefined}
              on:click={onEditClick}
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
    @apply min-w-[18rem] max-w-xs py-2 pl-4 pr-12 text-base dark:text-gray-100 dark:placeholder-gray-400
      shadow-sm rounded-full border border-gray-300 dark:border-gray-600
      focus:ring-orange-500 focus:border-orange-500 dark:focus:ring-orange-300 dark:focus:border-orange-300
      dark:bg-gray-600 truncate
  }

  .overlay-btn {
    @apply rounded-full absolute right-2.5 p-3
      hover:bg-opacity-20 dark:hover:bg-opacity-30 hover:bg-black dark:hover:bg-white
      disabled:bg-neutral-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 disabled:cursor-not-allowed
  }
</style>