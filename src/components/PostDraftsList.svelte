<script lang="ts">
    import tooltip from "svelte-ktippy"

    import {postDrafts} from "../lib/store/draft-store";
    import AutoRelativeTimeView from "./AutoRelativeTimeView.svelte";

    import type {PostDraft} from "../lib/store/draft-store";
    import {draftId} from '../lib/store/state-store';
    import PostDraftMenu from "./PostDraftMenu.svelte";

    let closeButton: HTMLButtonElement;

    $: items = [...$postDrafts.values()].sort((a, b) => b.timestamp - a.timestamp);

    const onDraftClick = (draft: PostDraft) => {
        $draftId = draft.id;
        closeButton.click();
    };
</script>

<div class="h-full bg-white dark:bg-gray-800">

  <div class="grow flex flex-col divider overflow-y-auto max-h-96">

    {#each items as item}
      <div class="flex shrink-0 h-24 pl-4 pr-1 items-center border-b border-gray-200 dark:border-gray-700
         hover:bg-gray-50 dark:hover:bg-gray-900">

        <a class="min-w-0 grow h-full block cursor-pointer" on:click={() => onDraftClick(item)}>

          <div class="w-full h-full flex items-center">

            <div class="flex flex-col truncate gap-0.5">

              {#if item.title}
                <div class="text-base font-medium dark:text-white">{item.title}</div>
                <AutoRelativeTimeView className="dark:text-white opacity-60"
                                      timestamp={item.timestamp} capitalize={true} />
              {:else}
                <AutoRelativeTimeView className="text-base font-medium dark:text-white"
                                      timestamp={item.timestamp} capitalize={true} />
              {/if}

              <div class="w-full truncate dark:text-white opacity-70">
                {#if item.attachments?.length > 0}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-4 inline"
                       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path
                        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                {/if}
                {#if item.content}
                  {item.content}
                {/if}
              </div>

            </div>
          </div>
        </a>

        {#if $draftId === item.id}
          <div class="mr-1 p-1.5 rounded-full bg-orange"></div>
        {/if}

        <button type="button"
                class="draft-menu flex-none p-3 rounded-full dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                use:tooltip={{
                  component: PostDraftMenu,
                  props: {draftId: item.id},
                  trigger: 'click',
                  interactive: true,
                  placement: 'left-start',
                }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-5"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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