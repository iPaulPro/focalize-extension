<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import {
        author,
        description,
        collectSettings,
        title,
        threeDAsset,
        audio,
        video,
        image,
        album,
        date,
    } from '@/lib/stores/state-store';
    import { currentUser } from '@/lib/stores/user-store';
    import type { CollectSettings } from '@/lib/types/CollectSettings';
    import { DateTime } from 'luxon';
    import { COLLECT_DURATION_ITEMS } from '@/lib/lens/lens-modules';
    import { createEventDispatcher } from 'svelte';
    import { truncateAddress } from '@/lib/utils/utils';
    import { MediaAudioKind, MetadataLicenseType } from '@lens-protocol/metadata';

    const dispatch = createEventDispatcher<any>();

    export let disabled: boolean = false;

    const getSaleEndString = (settings: CollectSettings): string | undefined => {
        if (!settings.durationInHours && settings.endDate) {
            return DateTime.fromISO(settings.endDate).toLocaleString(DateTime.DATETIME_SHORT);
        } else if (settings.durationInHours) {
            return COLLECT_DURATION_ITEMS.find((item) => item.value === settings.durationInHours)
                ?.label;
        }
        return undefined;
    };

    const onSettingsClick = () => {
        dispatch('settingsClick');
    };

    $: attachedMedia = $audio || $image || $video;
    $: hasAttachments = attachedMedia || $threeDAsset;
    $: saleEndString = $collectSettings && getSaleEndString($collectSettings);
    $: postTitle = `Title (Post by @${
        ($currentUser?.username ?? $currentUser)
            ? truncateAddress($currentUser.address)
            : 'anonymous'
    })`;
    $: isCollectible = $collectSettings.isCollectible;

    let useContentAsDescription = !$description?.length;

    $: {
        useContentAsDescription = !$description || $description.length === 0;
    }

    const getAuthorLabel = (kind: MediaAudioKind): string => {
        switch (kind) {
            case MediaAudioKind.PODCAST:
                return 'Host';
            case MediaAudioKind.MUSIC:
                return 'Artist';
            case MediaAudioKind.SOUND:
                return 'Designer';
            default:
                return 'Author';
        }
    };

    $: authorLabel = $audio?.kind && getAuthorLabel($audio.kind);

    const toSentenceCase = (str: string): string => {
        if (!str) return str;
        const sentence = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        return sentence.replace('_', ' ');
    };
</script>

<div class="flex flex-col gap-3" class:px-2={!hasAttachments}>
    {#if isCollectible}
        <div class="flex items-center justify-between text-gray-800 dark:text-gray-200">
            <div class="flex flex-col gap-0.5">
                <div class="text-sm font-medium text-orange-700 dark:text-orange-200">
                    Collectible post
                </div>

                <div
                    class="flex w-fit cursor-pointer items-center gap-1 text-2xl font-semibold text-gray-900 dark:text-gray-100"
                    on:click={onSettingsClick}
                    use:tippy={{
                        content: 'Collection price',
                    }}
                >
                    {#if $collectSettings.price && $collectSettings.token}
                        <span>{Intl.NumberFormat().format($collectSettings.price)}</span>
                        <span class="pt-0.5 text-lg opacity-60"
                            >${$collectSettings.token.symbol}</span
                        >
                    {:else}
                        <span>Free</span>
                    {/if}
                </div>

                <div class="flex flex-wrap gap-3 gap-y-1">
                    {#if saleEndString}
                        <div
                            class="flex cursor-pointer items-center gap-2 text-sm"
                            on:click={onSettingsClick}
                            use:tippy={{
                                content: 'Limited time',
                            }}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                class="h-4 w-4"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span class="font-semibold">{saleEndString}</span>
                        </div>
                    {/if}

                    {#if $collectSettings.limit}
                        <div
                            class="flex cursor-pointer items-center gap-1 text-sm"
                            on:click={onSettingsClick}
                            use:tippy={{
                                content: 'Limited edition',
                            }}
                        >
                            <svg class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor">
                                <path
                                    d="M450-80v-195L301-126l-43-42 192-192v-90h-90L172-262l-44-41 147-147H80v-60h195L125-660l43-43 192 193h90v-91L262-789l42-44 146 147v-194h60v194l150-150 42 43-192 192v91h91l189-189 43 42-147 147h194v60H686l148 149-41 43-192-192h-91v90l192 193-41 43-151-151v195h-60Z"
                                />
                            </svg>
                            <span class="font-semibold"
                                >{new Intl.NumberFormat().format($collectSettings.limit)}</span
                            >
                        </div>
                    {/if}

                    {#if $collectSettings.price && $collectSettings.referralFee}
                        <div
                            class="flex cursor-pointer items-center gap-2 text-sm"
                            on:click={onSettingsClick}
                            use:tippy={{
                                content: 'Repost referral fee',
                            }}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                class="h-4 w-4"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M17 2.1l4 4-4 4" />
                                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
                            </svg>
                            <span class="font-semibold">{$collectSettings.referralFee}%</span>
                        </div>
                    {/if}

                    {#if $collectSettings.price && $collectSettings.recipients?.length && $collectSettings.recipients?.length > 1}
                        <div
                            class="flex cursor-pointer items-center gap-2 text-sm"
                            on:click={onSettingsClick}
                            use:tippy={{
                                content: 'Revenue share recipients',
                            }}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                class="h-4 w-4"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                                <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                            </svg>
                            <span class="font-semibold">{$collectSettings.recipients.length}</span>
                        </div>
                    {/if}

                    {#if $collectSettings.followerOnly}
                        <div
                            class="flex cursor-pointer items-center gap-1.5 text-sm"
                            on:click={onSettingsClick}
                            use:tippy={{
                                content: 'Followers only',
                            }}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                class="h-4 w-4"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <polyline points="17 11 19 13 23 9" />
                            </svg>
                            <span class="text-xs font-semibold">ON</span>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
    <input
        type="text"
        placeholder={postTitle}
        class="input mt-1 w-full"
        bind:value={$title}
        {disabled}
    />

    {#if $audio}
        <select class="form-select input w-full" bind:value={$audio.kind}>
            {#each Object.entries(MediaAudioKind) as kind (kind)}
                <option value={kind[0]}>{toSentenceCase(kind[1])}</option>
            {/each}
        </select>

        <input
            type="text"
            placeholder={authorLabel}
            class="input w-full"
            bind:value={$author}
            {disabled}
        />

        {#if $audio.kind === MediaAudioKind.MUSIC}
            <input
                type="text"
                placeholder="Album"
                class="input w-full"
                bind:value={$album}
                {disabled}
            />
        {/if}

        <input
            type="text"
            placeholder="Genre"
            class="input w-full"
            bind:value={$audio.genre}
            {disabled}
        />

        <input
            type="date"
            placeholder="Release date"
            class="input w-full"
            bind:value={$date}
            {disabled}
        />

        {#if $audio.kind === MediaAudioKind.MUSIC}
            <input
                type="text"
                placeholder="Label"
                class="input w-full"
                bind:value={$audio.recordLabel}
                {disabled}
            />
        {/if}

        <select class="form-select input w-full" bind:value={$audio.license}>
            <option value={undefined}>Select a license</option>
            {#each Object.entries(MetadataLicenseType) as license (license)}
                <option value={license[0]}>{license[1]}</option>
            {/each}
        </select>
    {/if}

    <textarea
        placeholder="Description (optional)"
        rows={useContentAsDescription ? 3 : 5}
        class="input mt-1 {useContentAsDescription
            ? `opacity-50 focus:opacity-100 ${$description?.length ? 'editor-text-strikethrough' : ''}`
            : 'opacity-100'}"
        bind:value={$description}
        {disabled}
    ></textarea>

    <div class="flex items-center">
        <input
            id="desc-toggle"
            name="desc-toggle"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-200 text-orange-600 focus:ring-orange-500 dark:text-orange-500"
            bind:checked={useContentAsDescription}
            {disabled}
        />
        <label for="desc-toggle" class="ml-2 block text-sm text-gray-600 dark:text-gray-300">
            Use comment as description
        </label>
    </div>

    <div class="text-xs text-gray-400">
        Title and description are used on NFT marketplaces but may not be shown on all Lens apps.
    </div>
</div>

<style>
    .input {
        @apply rounded-lg border border-gray-300 bg-white text-base placeholder-gray-400 focus:border-orange-600 focus:outline-none disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-orange-300;
    }
</style>
