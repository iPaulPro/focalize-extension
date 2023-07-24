<script lang="ts">
    import {collectSettings} from '../../lib/stores/state-store';
    import {onMount} from 'svelte';
    import type {Writable} from 'svelte/store';
    import type {CollectSettings} from '../../lib/publications/CollectSettings';

    export let id: string;
    export let className: string = undefined;
    export let setting: Writable<boolean> = undefined;
    export let settingsKey: keyof CollectSettings = undefined;

    const onClick = () => {
        if (settingsKey) {
            $collectSettings[settingsKey] = !$collectSettings[settingsKey];
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
      <input type="checkbox" bind:checked={$collectSettings[settingsKey]}>
      <span class="slider round flex justify-between items-center px-2 shadow-none"></span>
    </label>
  {:else if setting}
    <label class="switch shrink-0">
      <input type="checkbox" bind:checked={$setting}>
      <span class="slider round flex justify-between items-center px-2 shadow-none"></span>
    </label>
  {/if}

  <div class="opacity-90 text-base px-2 inline-flex items-center cursor-pointer"
       on:click={onClick}>
    <div class="w-4 mr-1.5 inline opacity-80 flex-none">
      <slot name="icon"></slot>
    </div>
    <div class="font-medium">
      <slot name="label"></slot>
    </div>
  </div>

</div>