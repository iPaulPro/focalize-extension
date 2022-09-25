<script lang="ts">

    import {afterUpdate} from "svelte";

    let tags: string[] = [];

    export const getTags = (): string[] => {return tags};

    export let disabled: boolean;

    const addTag = () => {
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

    function focusEmptyTagInput() {
        const tags = document.querySelectorAll('.tag')
        tags.forEach(tag => {
            if (tag.firstChild.value === '') {
                tag.firstChild.focus();
            }
        })
    }

    afterUpdate(() => {
        focusEmptyTagInput();
    });

    const onKeyPress = (e) => {
        if (e.code === 'Enter') {
            addTag();
        }
    }
</script>

<div class="flex flex-wrap gap-3 p-4">

  {#if tags.length < 5}
    <button on:click={addTag} disabled={disabled}
        class="px-4 py-2  text-sm rounded-full bg-white hover:bg-gray-50 shadow-sm  flex justify-center items-center gap-2">
      Add tag
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-6 h-6 text-neutral-600"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    </button>
  {/if}

  {#each tags as tag}
    <span class="tag pl-2 pr-4 py-1 flex items-center text-sm rounded-full text-neutral-700  bg-white shadow-sm">

      <input type="text" size={Math.max(tag?.length + 1 || 0, 5)} bind:value={tag} on:keypress={onKeyPress}
             class="border-none leading-4 focus:ring-0" maxlength="50">

      <button class="bg-transparent hover" on:click={() => removeTag(tag)} disabled={disabled}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class=""
             viewBox="0 0 1792 1792">
            <path
                d="M1490 1322q0 40-28 68l-136 136q-28 28-68 28t-68-28l-294-294-294 294q-28 28-68 28t-68-28l-136-136q-28-28-28-68t28-68l294-294-294-294q-28-28-28-68t28-68l136-136q28-28 68-28t68 28l294 294 294-294q28-28 68-28t68 28l136 136q28 28 28 68t-28 68l-294 294 294 294q28 28 28 68z">
            </path>
        </svg>
      </button>
    </span>
  {/each}

</div>