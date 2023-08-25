<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {author, description, collectSettings, title, attachments} from '../../lib/stores/state-store';
    import {currentUser} from '../../lib/stores/user-store';
    import type {CollectSettings} from '../../lib/publications/CollectSettings';
    import {DateTime} from 'luxon';
    import {COLLECT_DURATION_ITEMS} from '../../lib/publications/lens-modules';
    import {createEventDispatcher} from 'svelte';

    const dispatch = createEventDispatcher();

    export let disabled: boolean = false;

    const getSaleEndString = (settings: CollectSettings): string | undefined => {
        if (!settings.durationInHours && settings.endDate) {
            return DateTime.fromISO(settings.endDate).toLocaleString(DateTime.DATETIME_SHORT);
        } else if (settings.durationInHours) {
            return COLLECT_DURATION_ITEMS.find(item => item.value === settings.durationInHours)?.label;
        }
        return undefined;
    };

    const onSettingsClick = () => {
        dispatch('settingsClick');
    };

    $: hasAttachments = $attachments?.length !== undefined;
    $: attachmentType = $attachments?.[0]?.type;

    $: isAttachmentAudio = attachmentType?.startsWith('audio/');

    $: saleEndString = $collectSettings && getSaleEndString($collectSettings);

    $: useContentAsDescription = !$description?.length;
</script>

<div class="flex flex-col gap-3" class:px-2={!hasAttachments}>

  <div class="flex justify-between items-center text-gray-800 dark:text-gray-200">

    <div class="flex flex-col gap-0.5">

      <div class="text-orange-700 dark:text-orange-300 text-sm font-medium">
        Digital collectible
      </div>

      <div class="flex w-fit items-center gap-1 text-2xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
           on:click={onSettingsClick}
           use:tippy={{
              content: 'Collection price',
           }}>
        {#if $collectSettings.price && $collectSettings.token}
          <span>{$collectSettings.price}</span>
          <span class="opacity-60 text-lg pt-0.5">${$collectSettings.token.symbol}</span>
        {:else}
          <span>Free</span>
        {/if}
      </div>

      <div class="flex gap-3 flex-wrap gap-y-1">

        {#if saleEndString}
          <div class="flex items-center gap-2 text-sm cursor-pointer"
               on:click={onSettingsClick}
               use:tippy={{
                   content: 'Limited time',
               }}>
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="font-semibold">{saleEndString}</span>
          </div>
        {/if}

        {#if $collectSettings.limit}
          <div class="flex items-center gap-1 text-sm cursor-pointer"
               on:click={onSettingsClick}
               use:tippy={{
                     content: 'Limited edition',
                 }}>
            <svg class="w-5 h-5" viewBox="0 -960 960 960" fill="currentColor">
              <path
                  d="M450-80v-195L301-126l-43-42 192-192v-90h-90L172-262l-44-41 147-147H80v-60h195L125-660l43-43 192 193h90v-91L262-789l42-44 146 147v-194h60v194l150-150 42 43-192 192v91h91l189-189 43 42-147 147h194v60H686l148 149-41 43-192-192h-91v90l192 193-41 43-151-151v195h-60Z"/>
            </svg>
            <span class="font-semibold">{new Intl.NumberFormat().format($collectSettings.limit)}</span>
          </div>
        {/if}

        {#if $collectSettings.price && $collectSettings.referralFee}
          <div class="flex items-center gap-2 text-sm cursor-pointer"
               on:click={onSettingsClick}
               use:tippy={{
                     content: 'Mirror referral fee',
                 }}>
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 2.1l4 4-4 4"/>
              <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
              <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
            </svg>
            <span class="font-semibold">{$collectSettings.referralFee}%</span>
          </div>
        {/if}

        {#if $collectSettings.price && $collectSettings.recipients?.length && $collectSettings.recipients?.length > 1}
          <div class="flex items-center gap-2 text-sm cursor-pointer"
               on:click={onSettingsClick}
               use:tippy={{
                     content: 'Revenue share recipients',
                 }}>
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
            </svg>
            <span class="font-semibold">{$collectSettings.recipients.length}</span>
          </div>
        {/if}

        {#if $collectSettings.followerOnly}
          <div class="flex items-center gap-1.5 text-sm cursor-pointer"
               on:click={onSettingsClick}
               use:tippy={{
                     content: 'Followers only',
                 }}>
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
            <span class="font-semibold text-xs">ON</span>
          </div>
        {/if}
      </div>

    </div>

  </div>

  <input type="text" placeholder="Title (Post by @{$currentUser?.handle})"
         class="w-full input mt-1"
         bind:value={$title} disabled={disabled}>

  {#if isAttachmentAudio}
    <input type="text" placeholder="Author"
           class="w-full mt-2 input"
           bind:value={$author} disabled={disabled}>
  {/if}

  <textarea placeholder="Description (optional)" rows={useContentAsDescription ? 3 : 5}
            class="mt-1 input {useContentAsDescription ? 'opacity-50 focus:opacity-100' : 'opacity-100'}"
            bind:value={$description} disabled={disabled}></textarea>

  <div class="flex items-center">
    <input id="desc-toggle" name="desc-toggle" type="checkbox"
           class="w-4 h-4 text-orange-600 dark:text-orange-500 border-gray-200 rounded focus:ring-orange-500"
           bind:checked={useContentAsDescription} disabled={disabled}>
    <label for="desc-toggle" class="block ml-2 text-sm text-gray-600 dark:text-gray-300"> Use comment as
      description </label>
  </div>

  <div class="text-xs text-gray-400">
    Title{isAttachmentAudio ? ', artist, ' : ' '}and description are used on NFT marketplaces but
    may not be shown on all Lens apps.
  </div>

</div>

<style>
  .input {
    @apply text-base dark:text-gray-100 placeholder-gray-400
    bg-white dark:bg-gray-600
    rounded-lg border border-gray-300 dark:border-gray-600 focus:border-orange-600 dark:focus:border-orange-300
    focus:outline-none
    disabled:opacity-40;
  }
</style>