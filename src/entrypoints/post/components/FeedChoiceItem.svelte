<script lang="ts">
    import { type Group, type Feed } from '@lens-protocol/client';
    import { truncateAddress } from '@/lib/utils/utils';
    import { getGroupIcon } from '@/lib/utils/lens-utils';
    import { GLOBAL_FEED_ADDRESS } from '@/lib/config';
    import { type SelectOption } from '@/lib/lens/lens-modules';

    export let item: SelectOption<Group | Feed>;

    const group = item.value.__typename === 'Group' ? item.value : null;
    const feed = item.value.__typename === 'Feed' ? item.value : null;
</script>

<div
    class="cursor-pointer py-2 pl-2 pr-4 text-sm hover:bg-orange-300 active:bg-orange dark:text-gray-100 dark:hover:bg-gray-800"
>
    {#if group}
        <div class="flex w-max items-center gap-2">
            {#if group.metadata?.icon}
                <img
                    src={getGroupIcon(group)}
                    alt="Group Icon"
                    class="h-7 w-7 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            {/if}
            <div class="flex flex-col">
                <div>
                    {group.metadata?.name
                        ? `#${group.metadata?.name}`
                        : truncateAddress(group.address)}
                </div>
                {#if group.metadata?.description}
                    <div class="text-xs opacity-65">{group.metadata.description}</div>
                {/if}
            </div>
        </div>
    {:else if feed}
        <div class="flex items-center gap-2">
            {#if feed.address === GLOBAL_FEED_ADDRESS}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="h-7 w-7"
                >
                    <path
                        d="M12 22.2q-2.1 0-3.962-.8-1.863-.8-3.25-2.175Q3.4 17.85 2.6 15.988 1.8 14.125 1.8 12t.8-3.988q.8-1.862 2.188-3.237Q6.175 3.4 8.038 2.6 9.9 1.8 12 1.8q2.125 0 3.988.8 1.862.8 3.237 2.175Q20.6 6.15 21.4 8.012q.8 1.863.8 3.988t-.8 3.988q-.8 1.862-2.175 3.237Q17.85 20.6 15.988 21.4q-1.863.8-3.988.8Zm-1-2.325v-1.95q-.8 0-1.387-.575-.588-.575-.588-1.4v-.975L4.275 10.2q-.075.45-.137.9-.063.45-.063.9 0 3 1.975 5.25T11 19.875Zm6.85-2.525q.5-.55.888-1.175.387-.625.65-1.313.262-.687.4-1.412.137-.725.137-1.45 0-2.425-1.338-4.438-1.337-2.012-3.612-2.887v.375q0 .825-.587 1.4-.588.575-1.388.575h-2v2q0 .4-.287.687-.288.288-.688.288h-2v2h5.95q.425 0 .713.287.287.288.287.688v2.975h1q.65 0 1.163.387.512.388.712 1.013Z"
                    />
                </svg>
            {/if}
            <div class="flex flex-col">
                <div>{feed.metadata?.name ?? truncateAddress(feed.address)}</div>
                {#if feed.metadata?.description}
                    <div class="text-xs opacity-65">{feed.metadata.description}</div>
                {/if}
            </div>
        </div>
    {/if}
</div>
