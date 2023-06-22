<script lang="ts">
    import {clearPostState} from '../stores/state-store';
    import {logOut} from '../lens-auth';

    const onConfirm = async () => {
        clearPostState();
        await logOut();
        window.close();
    };
</script>

<div class="flex flex-col gap-4 p-5">

  <div class="pt-2 text-lg text-black dark:text-white">
    Are you sure you want to log out?
  </div>

  <div class="text-red-700 dark:text-orange-400">
    Warning: Any unpublished post drafts will be discarded.
  </div>

  <div class="flex justify-end">
    <button type="button" on:click={onConfirm}
            class="mt-4 py-2 px-12 flex justify-center items-center rounded-xl w-fit
            bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700
            disabled:bg-neutral-400 dark:disabled:bg-gray-600
            focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            text-white text-center text-lg dark:disabled:text-gray-400
            transition ease-in duration-200 font-semibold shadow-md">
      Log out
    </button>
  </div>
</div>