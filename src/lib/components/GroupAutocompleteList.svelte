<script lang="ts">
    import { Editor } from '@tiptap/core';
    import { type Group } from '@lens-protocol/client';
    import { getGroupIcon } from '@/lib/utils/lens-utils';
    import { truncateAddress } from '@/lib/utils/utils';

    export let editor: Editor;
    export let items: Group[];
    export let command: any;

    let selectedIndex = 0;

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) {
            command({ id: item.address, label: item.metadata?.name });
        }
    };

    export function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowUp') {
            event.stopPropagation();
            selectedIndex = Math.max(0, selectedIndex - 1);
            return true;
        } else if (event.key === 'ArrowDown') {
            event.stopPropagation();
            selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
            return true;
        } else if (event.key === 'Enter') {
            event.stopPropagation();
            selectItem(selectedIndex);
            return true;
        }
        return false;
    }
</script>

<ul class="mentions flex flex-col">
    {#each items as group, i (group.address)}
        <li
            class="flex cursor-pointer flex-row overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-600 {i ===
            selectedIndex
                ? 'highlight'
                : ''}"
            on:click={() => selectItem(i)}
        >
            <div class="flex flex-1 items-center overflow-hidden px-1">
                <div class="mr-3 flex h-10 w-10 flex-col items-center justify-center">
                    <img
                        class="mx-auto h-10 w-10 rounded-full object-cover"
                        alt={`${group.metadata?.name}'s icon`}
                        src={getGroupIcon(group)}
                    />
                </div>
                <div class="mr-8 flex-1 overflow-hidden pl-1">
                    <div class="truncate text-base font-medium text-black dark:text-white">
                        {group.metadata?.name ?? truncateAddress(group.address)}
                    </div>
                    <div class="truncate text-sm text-gray-600 dark:text-gray-200">
                        {#if group.operations?.isMember}
                            <svg
                                class="mr-2 inline h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        {/if}
                        {group.metadata?.description ?? ''}
                    </div>
                </div>
            </div>
        </li>
    {/each}
</ul>
