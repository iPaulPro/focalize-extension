<script lang="ts">
    import {darkMode} from '../stores/preferences-store';
</script>

<label class="switch">
  <input type="checkbox" bind:checked={$darkMode}>
  <span class="slider !bg-gray-200 dark:!bg-gray-800 round flex justify-between items-center px-2
                  shadow-none">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         class="w-4 h-4 text-orange-300"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <path
          d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         class="w-4 h-4 text-gray-600"
         stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </span>
</label>