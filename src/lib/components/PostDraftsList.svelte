<script lang="ts">
    import tooltip from 'svelte-ktippy';

    import { postDrafts } from '../stores/draft-store';
    import AutoRelativeTimeView from './AutoRelativeTimeView.svelte';

    import { draftId } from '../stores/state-store';
    import PostDraftMenu from './PostDraftMenu.svelte';
    import { createEventDispatcher } from 'svelte';
    import type { PostDraft } from '../types/PostDraft';
    import { GROUP_MENTION_REGEX } from '@/lib/utils/regex';
    import { groupMap } from '@/lib/stores/cache-store';

    const dispatch = createEventDispatcher<any>();

    $: items = [...$postDrafts.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const onDraftClick = (draft: PostDraft) => {
        $draftId = draft.id;
        dispatch('dismiss');
    };
</script>

<div class="h-full bg-white dark:bg-gray-800">
    <div class="divider flex max-h-96 grow flex-col overflow-y-auto">
        {#each items as item (item.id)}
            {@const hasTopLine = item.title || item.content}

            <div
                class="flex h-24 shrink-0 items-center border-b border-gray-200 pl-4 pr-1 hover:bg-gray-50
              dark:border-gray-700 dark:hover:bg-gray-900"
            >
                <div
                    class="block h-full min-w-0 grow cursor-pointer"
                    on:click={() => onDraftClick(item)}
                >
                    <div class="flex h-full w-full items-center">
                        <div class="flex flex-col gap-0.5 truncate">
                            <div
                                class="truncate text-base dark:text-white"
                                class:font-medium={hasTopLine}
                                class:opacity-80={!hasTopLine}
                            >
                                {item.title ??
                                    (item.content && item.content.length > 0
                                        ? item.content
                                              .replace(GROUP_MENTION_REGEX, (match, address) => {
                                                  const groupName = $groupMap?.[address];
                                                  return `#${groupName ?? address}`;
                                              })
                                              .replace('@lens/', '@')
                                        : undefined) ??
                                    '(no content)'}
                            </div>

                            {#if item.timestamp}
                                <AutoRelativeTimeView
                                    className="dark:text-white opacity-60"
                                    timestamp={item.timestamp}
                                    capitalize={true}
                                />
                            {/if}

                            <div class="w-full truncate opacity-70 dark:text-white">
                                {#if item.audio || item.video || item.image}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        class="inline w-4"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path
                                            d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                                        ></path>
                                    </svg>
                                {/if}
                                {#if item.title && item.content}
                                    {item.content}
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>

                {#if $draftId === item.id}
                    <div class="mr-1 rounded-full bg-orange p-1.5"></div>
                {/if}

                <button
                    type="button"
                    class="draft-menu flex-none rounded-full p-3 hover:bg-gray-200 dark:text-white dark:hover:bg-gray-600"
                    use:tooltip={{
                        // @ts-expect-error ignore
                        component: PostDraftMenu,
                        props: { draftId: item.id },
                        trigger: 'click',
                        interactive: true,
                        placement: 'left-start',
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        class="w-5"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>
        {/each}
    </div>
</div>

<style global>
    .draft-menu .tippy-content {
        padding: 0 !important;
    }
</style>
