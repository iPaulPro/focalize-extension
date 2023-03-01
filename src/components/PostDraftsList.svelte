<script lang="ts">
    import VirtualList from '@sveltejs/svelte-virtual-list';
    import {postDrafts} from "../lib/store/draft-store";

    $: items = [...$postDrafts.values()];

</script>

<div class="h-full">
  <VirtualList {items} let:item itemHeight={56} height="360px">
    <div class="h-14 p-4 cursor-pointer
         border-b border-gray-200 dark:border-gray-600
         hover:bg-gray-100 dark:hover:bg-gray-500">
      <a class="w-full h-full block" on:click={() => console.log('clicked on', item)}>
        <div class="w-full h-full flex items-center">
          {item.id}
        </div>
      </a>
    </div>
  </VirtualList>
</div>

<style>
</style>