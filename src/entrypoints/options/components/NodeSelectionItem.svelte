<script lang="ts">
    import type { LensNode } from '@/lib/types/LensNode';

    export let selection: LensNode | undefined = undefined;
</script>

{#if selection}
    <div class="flex items-center">
        <img
            src="/images/ic_{selection.name.toLowerCase()}.{selection.icon}"
            alt="{selection.name} icon"
            class="h-5 w-5 flex-none"
        />

        <div class="pl-3 font-semibold sm:text-sm">
            {selection.name}
        </div>
    </div>
{/if}
