<script lang="ts">
    import type { Writable } from 'svelte/store';
    import Tiptap from '../../lib/components/Tiptap.svelte';
    import { draftId } from '../../lib/stores/state-store';
    export let content: Writable<string | undefined>;
    export let disabled: boolean = false;
    export let isCompact: boolean | undefined;

    export let insertAtSelection: (text: string) => {};

    let setContent: (text: string) => {}

    $: contentLength = $content?.length ?? 0;

    const updateContent = () => {
        if ($content) {
            setContent($content);
        }
    }

    $: if ($draftId) {
        updateContent();
    }
</script>

<div class="w-full relative {(isCompact || contentLength > 560) ? 'text-lg' : 'text-xl'}">
    <Tiptap bind:insertAtSelection bind:setContent isCompact={isCompact} />
</div>