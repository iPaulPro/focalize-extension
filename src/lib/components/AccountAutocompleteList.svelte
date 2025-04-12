<script lang="ts">
    import { type Account } from '@lens-protocol/client';
    import { formatUsernameV2toLocalName, getAccountAvatar } from '@/lib/utils/lens-utils';
    import { truncateAddress } from '@/lib/utils/utils';

    export let items: Account[];
    export let command: any;

    let selectedIndex = 0;

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) {
            command({ id: item.username?.value, label: item.username?.localName });
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

<div class="no-scrollbar h-full max-h-72 overflow-y-auto">
    <ul class="mentions flex flex-col">
        {#each items as account, i (account.address)}
            <li
                class="flex cursor-pointer flex-row overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-800 {i ===
                selectedIndex
                    ? 'bg-gray-200 dark:bg-gray-900'
                    : ''}"
                on:click={() => selectItem(i)}
            >
                <div class="flex flex-1 items-center overflow-hidden px-1">
                    <div class="mr-3 flex h-10 w-10 flex-col items-center justify-center">
                        <img
                            class="mx-auto h-10 w-10 rounded-full object-cover"
                            alt={`${account.username}'s avatar`}
                            src={getAccountAvatar(account)}
                        />
                    </div>
                    <div class="mr-8 flex-1 overflow-hidden pl-1">
                        <div class="truncate text-base font-medium text-black dark:text-white">
                            {account.metadata?.name ??
                                (account.username?.localName &&
                                    `@${account.username?.localName}`) ??
                                truncateAddress(account.address)}
                        </div>
                        <div class="truncate text-sm text-gray-600 dark:text-gray-200">
                            {account.metadata?.name && account.username
                                ? formatUsernameV2toLocalName(account.username.value)
                                : ''}
                        </div>
                    </div>
                </div>
            </li>
        {/each}
    </ul>
</div>
