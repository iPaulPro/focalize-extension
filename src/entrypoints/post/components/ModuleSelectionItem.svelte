<script lang="ts">
    import { compactMode } from '@/lib/stores/preferences-store';
    import type { SelectOption } from '@/lib/lens/lens-modules';

    export let selection: SelectOption<any>;
</script>

<div
    class="flex items-center {$compactMode
        ? 'py-0'
        : 'py-2'} text-orange-700 hover:text-orange-900 dark:text-orange-200"
>
    {#if selection.icon === 'earth'}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="h-5 w-5"
        >
            <path
                d="M12 22.2q-2.1 0-3.962-.8-1.863-.8-3.25-2.175Q3.4 17.85 2.6 15.988 1.8 14.125 1.8 12t.8-3.988q.8-1.862 2.188-3.237Q6.175 3.4 8.038 2.6 9.9 1.8 12 1.8q2.125 0 3.988.8 1.862.8 3.237 2.175Q20.6 6.15 21.4 8.012q.8 1.863.8 3.988t-.8 3.988q-.8 1.862-2.175 3.237Q17.85 20.6 15.988 21.4q-1.863.8-3.988.8Zm-1-2.325v-1.95q-.8 0-1.387-.575-.588-.575-.588-1.4v-.975L4.275 10.2q-.075.45-.137.9-.063.45-.063.9 0 3 1.975 5.25T11 19.875Zm6.85-2.525q.5-.55.888-1.175.387-.625.65-1.313.262-.687.4-1.412.137-.725.137-1.45 0-2.425-1.338-4.438-1.337-2.012-3.612-2.887v.375q0 .825-.587 1.4-.588.575-1.388.575h-2v2q0 .4-.287.687-.288.288-.688.288h-2v2h5.95q.425 0 .713.287.287.288.287.688v2.975h1q.65 0 1.163.387.512.388.712 1.013Z"
            />
        </svg>
    {:else if selection.icon === 'followers'}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            class="h-5 w-5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
        </svg>
    {/if}

    <div class="pl-3 text-sm font-semibold">
        {selection.label}
    </div>
</div>
