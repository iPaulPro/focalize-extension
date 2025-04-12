<script lang="ts">
    import { type Group, type Feed } from '@lens-protocol/client';
    import { truncateAddress } from '@/lib/utils/utils';
    import { type SelectOption } from '@/lib/lens/lens-modules';

    export let item: SelectOption<Group | Feed>;
</script>

<div class="cursor-pointer text-orange-700 hover:text-orange-900 dark:text-orange-200">
    <div class="text-sm font-semibold">
        {(item.value.__typename === 'Group' ? '#' : '') +
            (item.value.metadata?.name ?? truncateAddress(item.value.address))}
    </div>
</div>
