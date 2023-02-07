<script lang="ts">
    import Select from "svelte-select";
    import {LENS_NODES} from "../../lib/lens-nodes";
    import {darkMode} from "../../lib/store/preferences";
    import NodeSelectionItem from "./NodeSelectionItem.svelte";
    import NodeChoiceItem from "./NodeChoiceItem.svelte";
    import type {LensNode} from "../../lib/lens-nodes";
    import type {Writable} from "svelte/store";

    export let preference: Writable<LensNode>;
    export let disabled = false;
    export let notifications = false;

    let nodes = notifications ? LENS_NODES.filter(node => node.notifications != null) : LENS_NODES;
    let selectedNode;

    $: {
        if (!selectedNode && $preference) {
            selectedNode = $preference;
        }
    }

    const onNodeChange = (event) => {
        $preference = event.detail;
    }
</script>

<Select items={nodes} itemId={'name'} label={'name'} clearable={false} searchable={false} listAutoWidth={false}
        showChevron={true} bind:value={selectedNode} on:change={onNodeChange} {disabled}
        --item-height="auto" --item-is-active-bg="#DB4700" --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
        --font-size="0.875rem" --list-background={$darkMode ? '#374354' : 'white'}
        --selected-item-padding="0rem" --list-border-radius="0.75rem" --list-max-height="fit-content"
        class="w-fit h-fit bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 shadow
                  text-gray-800 dark:text-gray-300 dark:hover:text-gray-100
                  rounded-xl border-none ring-0 focus:outline-none focus:ring-0 focus:border-none">

  <div slot="selection" let:selection>
    <NodeSelectionItem {selection}/>
  </div>

  <div slot="item" let:item>
    <NodeChoiceItem {item}/>
  </div>

</Select>

<style>
</style>