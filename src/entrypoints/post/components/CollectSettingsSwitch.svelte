<script lang="ts">
    import { collectSettings } from '@/lib/stores/state-store';
    import { onMount } from 'svelte';
    import type { Writable } from 'svelte/store';
    import type { CollectSettings } from '@/lib/types/CollectSettings';

    export let id: string;
    export let className: string | undefined = undefined;
    export let setting: Writable<boolean> | undefined = undefined;
    export let settingsKey: keyof CollectSettings | undefined = undefined;

    let checked = (settingsKey && $collectSettings[settingsKey]) as boolean;

    const onChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (settingsKey) {
            collectSettings.update((cs) => ({ ...cs, [settingsKey]: target.checked }));
        }
    };

    const onClick = () => {
        if (settingsKey) {
            collectSettings.update((cs) => ({
                ...cs,
                [settingsKey]: !$collectSettings[settingsKey],
            }));
            checked = $collectSettings[settingsKey] as boolean;
        } else if (setting) {
            $setting = !$setting;
        }
    };

    onMount(() => {
        if (!settingsKey && !setting) {
            throw new Error('Either settingsKey or setting must be provided');
        }
    });
</script>

<div class="flex grow items-center py-3 {className}">
    {#if settingsKey}
        <label class="switch shrink-0">
            <input type="checkbox" bind:checked on:change={onChange} />
            <span class="slider round flex items-center justify-between px-2 shadow-none"></span>
        </label>
    {:else if setting}
        <label class="switch shrink-0">
            <input type="checkbox" bind:checked={$setting} />
            <span class="slider round flex items-center justify-between px-2 shadow-none"></span>
        </label>
    {/if}

    <div
        class="inline-flex cursor-pointer items-center px-2 text-base opacity-90"
        on:click={onClick}
    >
        <div class="mr-1.5 inline w-4 flex-none opacity-80">
            <slot name="icon"></slot>
        </div>
        <div class="font-medium">
            <slot name="label"></slot>
        </div>
    </div>
</div>
