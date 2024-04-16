<script lang="ts">
    import type {LensNode} from '../../lib/publications/lens-nodes';

    export let selection: LensNode | undefined = undefined;
</script>

{#if selection}

    <div class="flex items-center">

        <img src="/images/ic_{selection.name.toLowerCase()}.{selection.icon}" alt="{selection.name} icon"
             class="w-5 h-5 flex-none">

        <div class="pl-3 font-semibold sm:text-sm">
            {selection.name}
        </div>

    </div>

{/if}