<script lang="ts">
    import type { Writable } from 'svelte/store';
    import Tiptap from '@/lib/components/Tiptap.svelte';
    import { draftId } from '@/lib/stores/state-store';

    export let content: Writable<string | undefined | null>;
    export let disabled: boolean = false;
    export let isCompact: boolean | undefined;

    let tipTapComponent: Tiptap;

    export const insertAtSelection = (text: string) => {
        tipTapComponent?.insertAtSelection(text);
    };

    $: contentLength = $content?.length ?? 0;

    const updateContent = () => {
        if ($content) {
            tipTapComponent?.setContent($content);
        }
    };

    $: if ($draftId) {
        updateContent();
    }
</script>

<div class="relative w-full {contentLength > 560 ? 'text-lg' : 'text-xl'}">
    <Tiptap bind:this={tipTapComponent} {isCompact} />
</div>
