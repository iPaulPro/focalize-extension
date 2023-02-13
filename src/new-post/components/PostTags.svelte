<script lang="ts">

    import {afterUpdate} from "svelte";
    import {compactMode} from "../../lib/store/preferences-store";

    let tags: string[] = [];

    export const getTags = (): string[] => {return tags};

    export let disabled: boolean;

    const focusEmptyTagInput = () => {
        const tags = document.querySelectorAll('.tag');
        tags.forEach(tag => {
            if (tag.firstChild?.value === '') {
                tag.firstChild.focus();
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

    const onKeyPress = (e) => {
        if (e.code === 'Enter') {
            addTag();
        }
    };

    const removeTagIfEmpty = (tag) => {
        if (tag.length === 0) tags = tags.filter(value => value !== tag)
    };
</script>

<div class="flex flex-wrap gap-3 dark:text-gray-200">

  {#if tags.length < 5}
    <button type="button" on:click={addTag} disabled={disabled}
        class="px-4 {$compactMode ? 'py-0' : 'py-2'} text-sm rounded-full bg-white enabled:hover:bg-gray-100 dark:bg-gray-800
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
    <div class="tag px-2 py-1 flex items-center rounded-full text-gray-900 bg-white dark:bg-gray-800 shadow">

      <input type="text" size={Math.max(tag?.length + 1 || 0, 5)}
             bind:value={tag} on:keypress={onKeyPress} on:blur={() => removeTagIfEmpty(tag)}
             class="border-none leading-4 focus:ring-0 text-sm bg-transparent dark:text-gray-100" maxlength="50">

      <button type="button" class="bg-transparent enabled:hover:bg-gray-200 enabled:dark:hover:bg-gray-600 p-2 rounded-full
              dark:text-gray-200"
              on:click={() => removeTag(tag)} disabled={disabled}>

        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>

      </button>
    </div>
  {/each}

</div>