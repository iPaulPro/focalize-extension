<script lang="ts">
    import { DateTime } from 'luxon';
    import { htmlFromMarkdown } from '@/lib/utils/utils';
    import { PostState, postState } from '@/lib/stores/state-store';
    import { currentUser } from '@/lib/stores/user-store';
    import LoadingSpinner from '@/lib/components/LoadingSpinner.svelte';
    import { getNodeForPostMetadata, getUrlForPostMetadata } from '@/lib/lens/lens-nodes';
    import { type PostMetadata, PostMetadataSchemaId } from '@lens-protocol/metadata';
    import { getCoverFromMetadata, parseUri } from '@/lib/utils/lens-utils';
    import { onMount } from 'svelte';
    import { getCached, KEY_GROUPS_CACHE } from '@/lib/stores/cache-store';
    import { getPost } from '@/lib/lens-service';
    import { toast } from 'svelte-sonner';

    export let postMetaData: PostMetadata;
    export let postId: string;

    let avatarError = false;
    let now = DateTime.now();
    let contentHtml = '';

    $: cover = getCoverFromMetadata(postMetaData);
    $: artist =
        postMetaData.$schema === PostMetadataSchemaId.AUDIO_LATEST &&
        postMetaData.lens.audio.artist;

    const onViewPostClick = async () => {
        if (!postMetaData || !postId) return;
        const post = await getPost({ post: postId });
        if (!post) {
            toast.error('Post not found');
            return;
        }
        const url = await getUrlForPostMetadata(postMetaData, post);
        // eslint-disable-next-line no-undef
        browser.notifications.clear(url);
        window.open(url, '_blank');
        window.close();
    };

    const getNodeName = async () => {
        const node = await getNodeForPostMetadata(postMetaData);
        return node.name;
    };

    onMount(async () => {
        const cachedGroups = await getCached<Map<string, string>>(KEY_GROUPS_CACHE);
        contentHtml = htmlFromMarkdown(postMetaData.lens.content, cachedGroups) ?? '';
    });
</script>

{#if $currentUser}
    <div class="min-h-screen w-full">
        <div class="container mx-auto h-full max-w-screen-md pt-2">
            <div class="flex items-center justify-between">
                <div class="p-4 text-2xl font-semibold">
                    {#if postId}
                        Post published!
                    {:else}
                        Post preview
                    {/if}
                </div>

                <div>
                    {#if postId}
                        <button
                            type="button"
                            on:click={onViewPostClick}
                            class="mr-4 flex items-center justify-center rounded-lg bg-orange-600 px-6
                                py-1.5 text-center text-sm font-medium
                                text-white shadow-md
                                transition duration-200 ease-in hover:bg-orange-800 focus:outline-none
                                focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-orange-200 disabled:bg-neutral-400
                                dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
                        >
                            View on
                            {#await getNodeName() then name} {name} {/await}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                class="ml-1.5 inline w-4"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <g fill="none" fill-rule="evenodd">
                                    <path
                                        d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5M15 3h6v6M10 14L20.2 3.8"
                                    />
                                </g>
                            </svg>
                        </button>
                    {:else}
                        <div class="flex items-center gap-2 pr-4 text-xs opacity-60">
                            {#if $postState === PostState.SUCCESS}
                                Transaction success! Waiting for indexer...
                            {:else if $postState === PostState.PENDING}
                                Indexing...
                            {:else}
                                Transaction submitted...
                            {/if}

                            <LoadingSpinner size="w-5 h-5" />
                        </div>
                    {/if}
                </div>
            </div>

            <div
                class="mx-2 flex min-h-[12rem] rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
            >
                <div class="mx-3 mt-3 h-12 w-12 shrink-0">
                    {#if avatarError || !$currentUser.avatarUrl}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="w-full rounded-full bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300"
                        >
                            <path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3" />
                            <circle cx="12" cy="10" r="3" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                    {:else if $currentUser}
                        <img
                            src={$currentUser.avatarUrl}
                            alt="Account avatar"
                            class="aspect-square w-full rounded-full border-2 border-transparent object-contain"
                            on:error={() => {
                                avatarError = true;
                            }}
                        />
                    {/if}
                </div>

                <div class="flex w-full shrink flex-col pl-1.5 pr-2 pt-3">
                    {#if $currentUser.name}
                        <div class="text-base font-medium">
                            {$currentUser.name}
                        </div>
                    {/if}

                    <div class="font-medium text-orange-700 dark:text-orange-200">
                        &#64;{$currentUser.username}
                    </div>

                    {#if postMetaData.lens.content}
                        <div class="prose h-full pb-2 pr-4 pt-4 dark:prose-invert">
                            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                            {@html contentHtml}
                        </div>
                    {/if}

                    {#if postMetaData.$schema === PostMetadataSchemaId.IMAGE_LATEST}
                        {@const media = postMetaData.lens.image}

                        <div class="max-h-96 w-full pb-2 pt-4 lg:w-4/5">
                            <a href={parseUri(media.item)} target="_blank" rel="noreferrer">
                                <img
                                    src={parseUri(media.item)}
                                    alt={media.altTag ?? 'Image attachment'}
                                    class="max-h-full rounded-lg"
                                />
                            </a>
                        </div>
                    {:else if postMetaData.$schema === PostMetadataSchemaId.VIDEO_LATEST}
                        {@const media = postMetaData.lens.video}

                        <video
                            poster={media.cover ? parseUri(media.cover) : undefined}
                            class="mb-2 mt-4 aspect-video w-full rounded-lg bg-black lg:w-2/3"
                            preload="metadata"
                            controls
                            controlslist="nodownload"
                        >
                            <source src={parseUri(media.item)} type={media.type.toString()} />
                        </video>
                    {:else if postMetaData.$schema === PostMetadataSchemaId.AUDIO_LATEST}
                        {@const media = postMetaData.lens.audio}

                        <div class="mb-2 mt-4 flex w-full rounded-xl bg-gray-100 dark:bg-gray-700">
                            <div class="flex w-full items-center">
                                {#if cover}
                                    <img
                                        src={parseUri(cover)}
                                        alt="Cover image"
                                        class="h-36 w-36 rounded-l-xl object-cover"
                                    />
                                {/if}

                                <div class="flex w-full w-full flex-col truncate">
                                    <div class="truncate px-6 pt-4 text-xl font-semibold">
                                        {postMetaData.name}
                                    </div>

                                    <div class="truncate px-6 text-base opacity-80">
                                        {artist}
                                    </div>

                                    <audio
                                        class="w-full px-1"
                                        preload="metadata"
                                        controls
                                        controlslist="nodownload"
                                    >
                                        <source
                                            src={parseUri(media.item)}
                                            type={media.type.toString()}
                                        />
                                    </audio>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <div class="py-2 text-sm font-medium opacity-60">
                        {now.toLocaleString(DateTime.TIME_SIMPLE)} · {now.toLocaleString(
                            DateTime.DATE_MED,
                        )} · Posted via Focalize
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style global>
    audio::-webkit-media-controls-panel,
    audio::-webkit-media-controls-enclosure {
        background-color: transparent;
    }

    .dark audio::-webkit-media-controls-time-remaining-display,
    .dark audio::-webkit-media-controls-current-time-display {
        color: white;
        text-shadow: none;
    }

    .dark audio::-webkit-media-controls-timeline {
        border-color: white;
    }

    .dark audio::-webkit-media-controls-volume-slider {
        border-color: white;
    }

    .prose a {
        color: #db4700;
        text-decoration: none;
    }

    .prose a:hover {
        color: #a33500;
        text-decoration: underline;
    }
</style>
