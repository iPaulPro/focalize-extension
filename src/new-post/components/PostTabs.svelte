<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    import {PublicationMainFocus} from "../../graph/lens-service";

    const dispatch = createEventDispatcher();

    export let postType: PublicationMainFocus;

    export let disabled: boolean;
</script>

<div class="flex px-2">

  <div class="sm:hidden">

    <label for="tabs" class="sr-only">Publication type</label>

    <select id="tabs" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-orange-500
         focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
         dark:text-gray-100 dark:focus:ring-orange-500 dark:focus:border-orange-500">
      <option>Post</option>
      <option>Images & Video</option>
      <option>Link</option>
      <option>Article</option>
    </select>

  </div>

  <ul class="hidden w-full text-sm font-medium text-center text-gray-500 rounded-lg divide-x divide-gray-200 shadow
      sm:flex dark:divide-gray-700 dark:text-gray-400 {disabled ? 'opacity-60' : ''}">

    <li class="w-full">
      <button type="button" on:click={() => dispatch('typeChange', PublicationMainFocus.TextOnly)} {disabled}
              class="{postType === PublicationMainFocus.TextOnly || postType === PublicationMainFocus.Link ? 'active' : ''}
              tab rounded-l-xl inline-block py-3 w-full cursor-pointer flex justify-center gap-1" aria-current="page">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="inline">
          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
        </svg>
        <span class="px-1">Post</span>
      </button>
    </li>

    <li class="w-full">
      <button type="button" on:click={() => dispatch('typeChange', PublicationMainFocus.Image)} {disabled}
              class="{postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video || postType === PublicationMainFocus.Audio ? 'active' : ''}
              tab inline-block py-3 w-full cursor-pointer flex justify-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="inline">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M20.4 14.5L16 10 4 20"/>
        </svg>
        <span class="px-1">Media</span>
      </button>
    </li>

    <li class="w-full">
      <button type="button" on:click={() => dispatch('typeChange', PublicationMainFocus.Article)} {disabled}
              class="{postType === PublicationMainFocus.Article ? 'active' : ''}
              tab rounded-r-xl inline-block py-3 w-full cursor-pointer flex justify-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="inline">
          <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <span class="px-1">Article</span>
      </button>
    </li>

  </ul>

</div>