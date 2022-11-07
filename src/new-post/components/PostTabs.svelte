<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    import {PublicationMainFocus} from "../../graph/lens-service";

    const dispatch = createEventDispatcher();

    export let postType: PublicationMainFocus;

    export let disabled: boolean;
</script>

<div class="flex">

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
      sm:flex dark:divide-gray-700 dark:text-gray-400 dark:divide-gray-700 {disabled ? 'opacity-60' : ''}">
    <li class="w-full">
      <button on:click={() => dispatch('typeChange', PublicationMainFocus.TextOnly)} {disabled}
              class="{postType === PublicationMainFocus.TextOnly ? 'active' : ''}
              tab rounded-l-xl inline-block pt-3 pb-2 w-full cursor-pointer" aria-current="page">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-2">
          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
        </svg>
        Post
      </button>
    </li>
    <li class="w-full">
      <button on:click={() => dispatch('typeChange', PublicationMainFocus.Image)} {disabled}
              class="{postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video || postType === PublicationMainFocus.Audio ? 'active' : ''}
              tab inline-block pt-3 pb-2 w-full cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M20.4 14.5L16 10 4 20"/>
        </svg>
        Media
      </button>
    </li>
    <li class="w-full">
      <button on:click={() => dispatch('typeChange', PublicationMainFocus.Link)} {disabled}
              class="{postType === PublicationMainFocus.Link ? 'active' : ''}
              tab inline-block pt-3 pb-2 w-full cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        Link
      </button>
    </li>
    <li class="w-full">
      <button on:click={() => dispatch('typeChange', PublicationMainFocus.Article)} {disabled}
              class="{postType === PublicationMainFocus.Article ? 'active' : ''}
              tab rounded-r-xl inline-block pt-3 pb-2 w-full cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
        </svg>
        Article
      </button>
    </li>
  </ul>

</div>