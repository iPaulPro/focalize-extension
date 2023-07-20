<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {z} from 'zod';
    import {debounce} from 'throttle-debounce';
    import {createEventDispatcher} from 'svelte';
    import {collectSettings, type Recipient} from '../../lib/stores/state-store';
    import {derived, type Readable} from 'svelte/store';
    import type {CollectSettings} from '../../lib/publications/collect-settings';

    const dispatch = createEventDispatcher();

    const splitSchema = z
        .number({
            required_error: 'Share is not set',
            invalid_type_error: 'Share must be a number',
        })
        .refine(value => value >= 0.01 && value <= 98, {
            message: 'Shares must be between 0.01% and 98%',
        }).refine(value => Number(value.toFixed(2)) === value, {
            message: 'Shares can have up to two decimal points',
        });

    const ERROR_TOTAL_NOT_100 = 'Total shares must add up to 100%';

    export let recipient: Recipient;
    export let autoUpdate: boolean = false;
    export let splitEvenly: boolean = false;

    const total: Readable<number> = derived(collectSettings, ($cs: CollectSettings) => {
        if (!$cs.recipients) return 0;
        return $cs.recipients
            .filter((recipient: Recipient) => recipient.split)
            .reduce((acc: number, recipient: Recipient) => acc + recipient.split, 0);
    }, 0);

    let inputElement: HTMLInputElement;
    let error: string | undefined;

    const onSuccessfulValueChange = () => {
        $collectSettings = {...$collectSettings};
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

    $: if (inputElement && recipient && autoUpdate && $total > 98 && inputElement !== document.activeElement) {
        const diff = $total - 98;
        recipient.split = Math.max(0, recipient.split - diff);
        onSuccessfulValueChange();
    }

    $: if ($total !== 98) {
        console.log('total is not 98', $total);
        error = ERROR_TOTAL_NOT_100;
    } else {
        error = undefined;
    }
</script>

{#if recipient}

  <div class="flex items-center gap-2">
    {#if error}
      <svg class="w-5 h-5 text-red-600 cursor-help flex-none" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           use:tippy={{content: error, appendTo: 'parent'}}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    {/if}

    <div class="relative">
      <input type="number" placeholder="25" min="0" max="98" disabled={splitEvenly}
             bind:value={recipient.split} bind:this={inputElement}
             on:input={() => onValueChange(inputElement.valueAsNumber)}
             class="w-20 text-center rounded-xl text-base font-medium focus:ring-orange-500 focus:border-orange-500
             {splitEvenly ? 'bg-gray-100 dark:bg-gray-600 border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'}
             {error ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}">

      <div class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
        %
      </div>
    </div>
  </div>
{/if}
