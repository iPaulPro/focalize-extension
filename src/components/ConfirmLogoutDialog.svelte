<script lang="ts">

    import {clearUser} from "../lib/store/user";
    import {clearPostState} from "../lib/store/state";
    import {logOut} from "../lib/lens-auth";

    const onConfirm = async () => {
        clearPostState();
        clearUser();
        await logOut();
    };

</script>

<div class="flex flex-col gap-4 p-3">

  <div class="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-600">

    <div class="flex gap-4 dark:text-gray-100">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-6"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <h1 class="text-2xl font-medium">Log out</h1>
    </div>

    <form method="dialog">
      <button type="button">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
      </button>
    </form>
  </div>

  <div class="pt-2 text-lg text-black dark:text-white">Are you sure you want to log out?</div>

  <div class="text-red dark:text-orange-400">Warning: Any unpublished post drafts will be discarded.</div>

  <div class="flex justify-end">
    <button type="button" on:click={onConfirm}
            class="mt-4 py-2 px-12 flex justify-center items-center rounded-xl w-fit
          bg-orange-500 hover:bg-orange-600 dark:bg-orange-700 dark:hover:bg-orange-800
          disabled:bg-neutral-400 dark:disabled:bg-gray-600
          focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          text-white text-center text-lg dark:disabled:text-gray-400
          transition ease-in duration-200 font-semibold shadow-md">
      Log out
    </button>
  </div>
</div>

<style>
</style>