<script lang="ts">
    import Select from "svelte-select";
    import {LENS_NODES, type LensNode} from "../../lib/publications/lens-nodes";
    import { darkMode } from '../../lib/stores/preferences-store';
    import NodeSelectionItem from "./NodeSelectionItem.svelte";
    import NodeChoiceItem from "./NodeChoiceItem.svelte";
    import type {Writable} from "svelte/store";
    import { PublicationMetadataMainFocusType } from '@lens-protocol/client';

    export let preference: Writable<LensNode>;
    export let disabled = false;
    export let notifications = false;
    export let focus: PublicationMetadataMainFocusType;

    const getNodes = () => {
        return LENS_NODES.filter(node => node.focus.includes(focus));
    }

    let selectedNode: LensNode;

    $: {
        if (!selectedNode && $preference) {
            selectedNode = $preference;
        }
    }

    const onNodeChange = (event: CustomEvent) => {
        $preference = event.detail;
    }
</script>

<Select items={getNodes()}
        itemId={'name'}
        label={'name'}
        clearable={false}
        searchable={false}
        listAutoWidth={false}
        showChevron={true}
        disabled={disabled}
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
        class="!w-fit !h-fit !shrink-0 !bg-white dark:!bg-gray-800 hover:!bg-gray-100 dark:hover:!bg-gray-600 !shadow
        !text-gray-800 dark:!text-gray-300 dark:!hover:text-gray-100
        !rounded-xl !border-none !ring-0 focus:!outline-none focus:!ring-0 focus:!border-none">

  <div slot="selection" let:selection>
    <NodeSelectionItem {selection}/>
  </div>

  <div slot="item" let:item>
    <NodeChoiceItem {item}/>
  </div>

</Select>

<style>
</style>