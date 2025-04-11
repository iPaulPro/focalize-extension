<script lang="ts">
    import Select from 'svelte-select';
    import { LENS_NODES } from '@/lib/lens/lens-nodes';
    import { darkMode, nodeGroup } from '@/lib/stores/preferences-store';
    import NodeSelectionItem from './NodeSelectionItem.svelte';
    import NodeChoiceItem from './NodeChoiceItem.svelte';
    import type { Writable } from 'svelte/store';
    import { MainContentFocus } from '@lens-protocol/client';
    import type { LensNode } from '@/lib/types/LensNode';

    export let preference: Writable<LensNode>;
    export let disabled = false;
    export let notifications = false;
    export let focus: MainContentFocus | undefined = undefined;

    const getNodes = () => {
        return focus !== undefined
            ? LENS_NODES.filter((node) => node.focus.includes(focus.valueOf()))
            : // eslint-disable-next-line svelte/require-store-reactive-access
              preference === nodeGroup
              ? LENS_NODES.filter((node) => node.groups !== undefined)
              : LENS_NODES;
    };

    let selectedNode: LensNode;

    $: {
        if (!selectedNode && $preference) {
            selectedNode = $preference;
        }
    }

    const onNodeChange = (event: CustomEvent) => {
        $preference = event.detail;
    };
</script>

<Select
    items={getNodes()}
    itemId="name"
    label="name"
    clearable={false}
    searchable={false}
    listAutoWidth={false}
    showChevron={true}
    {disabled}
    bind:value={selectedNode}
    on:change={onNodeChange}
    --item-height="auto"
    --item-is-active-bg={$darkMode ? '#6B2300' : '#DB4700'}
    --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
    --font-size="0.875rem"
    --list-background={$darkMode ? '#374354' : 'white'}
    --selected-item-padding="0rem"
    --list-border-radius="0.75rem"
    --list-max-height="fit-content"
    class="dark:!hover:text-gray-100 !h-fit !w-fit !shrink-0 !rounded-xl !border-none !bg-white !text-gray-800
        !shadow !ring-0 hover:!bg-gray-100
        focus:!border-none focus:!outline-none focus:!ring-0 dark:!bg-gray-800 dark:!text-gray-300 dark:hover:!bg-gray-600"
>
    <div slot="selection" let:selection>
        <NodeSelectionItem {selection} />
    </div>

    <div slot="item" let:item>
        <NodeChoiceItem {item} />
    </div>
</Select>

<style>
</style>
