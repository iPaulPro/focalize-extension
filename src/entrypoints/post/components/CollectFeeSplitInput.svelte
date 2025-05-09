<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import { z } from 'zod';
    import { debounce } from 'throttle-debounce';
    import { collectSettings, type Recipient } from '@/lib/stores/state-store';
    import { derived, type Readable } from 'svelte/store';
    import type { CollectSettings } from '@/lib/types/CollectSettings';

    const splitSchema = z
        .number({
            required_error: 'Share is not set',
            invalid_type_error: 'Share must be a number',
        })
        .refine((value) => value >= 0.01 && value <= 100, {
            message: 'Shares must be between 0.01% and 100%',
        })
        .refine((value) => Number(value.toFixed(2)) === value, {
            message: 'Shares can have up to two decimal points',
        });

    const ERROR_TOTAL_NOT_100 = 'Total shares must add up to 100%';

    export let recipient: Recipient;
    export let autoUpdate: boolean = false;
    export let splitEvenly: boolean = false;

    const total: Readable<number> = derived(
        collectSettings,
        ($cs: CollectSettings) => {
            if (!$cs.recipients) return 0;
            return $cs.recipients
                .filter((recipient: Recipient) => recipient.split)
                .reduce((acc: number, recipient: Recipient) => acc + recipient.split, 0);
        },
        0,
    );

    let inputElement: HTMLInputElement;
    let error: string | undefined;

    const onSuccessfulValueChange = () => {
        $collectSettings = { ...$collectSettings };
    };

    const onValueChange = debounce(250, (value: number) => {
        const validation = splitSchema.safeParse(value);
        if (validation.success) {
            onSuccessfulValueChange();
        } else {
            console.log('onValueChange: invalid', validation.error);
            error = validation.error.message;
        }
    });

    $: if (
        inputElement &&
        recipient &&
        autoUpdate &&
        $total > 100 &&
        inputElement !== document.activeElement
    ) {
        const diff = $total - 100;
        recipient.split = Math.max(0, recipient.split - diff);
        onSuccessfulValueChange();
    }

    $: if ($total !== 100) {
        console.log('total is not 100', $total);
        error = ERROR_TOTAL_NOT_100;
    } else {
        error = undefined;
    }
</script>

{#if recipient}
    <div class="flex items-center gap-2">
        {#if error}
            <div class="h-5 w-5" use:tippy={{ content: error, appendTo: 'parent' }}>
                <svg
                    class="h-5 w-5 flex-none cursor-help text-red-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
        {/if}

        <div class="relative">
            <input
                type="number"
                placeholder="25"
                min="0"
                max="100"
                disabled={splitEvenly}
                bind:value={recipient.split}
                bind:this={inputElement}
                on:input={() => onValueChange(inputElement.valueAsNumber)}
                class="w-20 rounded-xl text-center text-base font-medium focus:border-orange-500 focus:ring-orange-500
             {splitEvenly
                    ? 'border-transparent bg-gray-100 dark:bg-gray-600'
                    : 'bg-gray-50 text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'}
             {error ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}"
            />

            <div class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">%</div>
        </div>
    </div>
{/if}
