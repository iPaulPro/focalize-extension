<script lang="ts">
    import type { LensNode } from '@/lib/types/LensNode';

    export let item: LensNode | undefined = undefined;
</script>

{#if item}
    <div class="flex cursor-pointer items-center py-3 active:bg-orange dark:text-gray-100">
        <img
            src="/images/ic_{item.name.toLowerCase()}.{item.icon}"
            alt="{item.name} icon"
            class="block h-5 w-5 flex-none"
        />

        <div class="flex w-max flex-col pl-4 pr-8">
            <div class="text-sm font-semibold">{item.name}</div>
            <div class="whitespace-pre-line pt-1 text-xs">{item.baseUrl}</div>
        </div>
    </div>
{/if}
