<script lang="ts">
    import {onMount} from 'svelte';
    import {isPopup} from '../utils';

    export let title: string;
    let isCompact: boolean = false;

    onMount(async () => {
        isCompact = await isPopup();
    });
</script>

<div class="flex flex-col text-black dark:text-white">

  <div class="flex justify-between items-center {isCompact ? 'py-2 px-4' : 'p-4'} pr-2 border-b border-gray-200 dark:border-gray-600">
    <div class="text-xl font-semibold dark:text-gray-100">
      {title}
    </div>
    <form method="dialog">
      <button class="p-2 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full transition-none
              focus:outline-orange-400 focus:ring-orange-400 focus:ring-offset-orange-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </button>
    </form>
  </div>

  <slot></slot>

</div>