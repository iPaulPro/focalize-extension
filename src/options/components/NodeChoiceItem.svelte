<script lang="ts">
    import type {LensNode} from '../../lib/publications/lens-nodes';

    export let item: LensNode | undefined = undefined;
</script>

{#if item}

    <div class="flex items-center py-3 cursor-pointer dark:text-gray-100 active:bg-orange">

        <img src="/images/ic_{item.name.toLowerCase()}.{item.icon}" alt="{item.name} icon"
             class="w-5 h-5 block flex-none">

        <div class="w-max flex flex-col pl-4 pr-8">
            <div class="font-semibold text-sm">{item.name}</div>
            <div class="pt-1 text-xs whitespace-pre-line">{item.baseUrl}</div>
        </div>
    </div>

{/if}