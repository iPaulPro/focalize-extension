<script lang="ts">

    import {afterUpdate} from "svelte";

    let tags: string[] = [];

    export const getTags = (): string[] => {return tags};

    export let isCompact: boolean;
    export let disabled: boolean;

    const focusEmptyTagInput = () => {
        const tags = document.querySelectorAll('.tag');
        tags.forEach(tag => {
            const input = tag.querySelector('.tag-edit');
            if (input instanceof HTMLInputElement && input?.value === '') {
                input.focus();
            }
        })
    };

    const addTag = () => {
        if (tags.length >= 5) return;

        const emptyTags = tags.filter(tag => tag.length === 0);
        if (emptyTags.length > 0) {
            focusEmptyTagInput();
        } else {
            tags.push('');
            tags = tags;
        }
    }

    const removeTag = (tag: string) => {
        tags = tags.filter(t => t != tag);
    }

    afterUpdate(() => {
        focusEmptyTagInput();
    });

    const onKeyPress = (e: KeyboardEvent) => {
        if (e.code === 'Enter') {
            addTag();
        }
    };

    const removeTagIfEmpty = (tag: string) => {
        if (tag.length === 0) tags = tags.filter(value => value !== tag)
    };
</script>

<div class="flex flex-wrap gap-3 dark:text-gray-200 ">

  {#if tags.length < 5}
    <button type="button" on:click={addTag} disabled={disabled}
        class="px-4 {isCompact ? 'h-10 text-xs' : 'h-12 text-sm'} rounded-full bg-white enabled:hover:bg-gray-100 dark:bg-gray-900
        enabled:dark:hover:bg-gray-600 shadow flex justify-center items-center gap-2">
      <span class="px-1">Add tag</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-gray-600 dark:text-gray-200"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    </button>
  {/if}

  {#each tags as tag}
    <div class="tag px-2 py-1 flex items-center rounded-full text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 shadow">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 ml-1" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"></line>
        <line x1="4" y1="15" x2="20" y2="15"></line>
        <line x1="10" y1="3" x2="8" y2="21"></line>
        <line x1="16" y1="3" x2="14" y2="21"></line>
      </svg>

      <input type="text" size={Math.max(tag?.length || 0, 3)}
             bind:value={tag} on:keypress={onKeyPress} on:blur={() => removeTagIfEmpty(tag)}
             class="tag-edit border-none leading-4 focus:ring-0 text-sm bg-transparent dark:text-gray-100 pl-2 pr-0" maxlength="50">

      <button type="button" class="bg-transparent enabled:hover:bg-gray-200 enabled:dark:hover:bg-gray-600 p-2 rounded-full"
              on:click={() => removeTag(tag)} disabled={disabled}>

        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>

      </button>
    </div>
  {/each}

</div>