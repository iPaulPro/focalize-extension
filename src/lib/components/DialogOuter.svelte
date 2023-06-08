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
    <div class="text-lg font-semibold">
      {title}
    </div>
    <form method="dialog">
      <button class="p-2 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full transition-none
              focus:outline-orange-400 focus:ring-orange-400 focus:ring-offset-orange-200">
        <svg class="w-5 h-5 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </form>
  </div>

  <slot></slot>

</div>