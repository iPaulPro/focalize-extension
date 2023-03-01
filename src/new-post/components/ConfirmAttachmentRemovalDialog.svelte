<script lang="ts">
    import {fileAttachment, urlAttachment} from "../../lib/store/state-store";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    const onCancelClick = async () => {
        $urlAttachment = null;
        dispatch('close');
    };

    const onRemoveClick = async () => {
        $fileAttachment = null;
        dispatch('close');
    };
</script>

<div class="flex flex-col p-3">

  <div class="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-600">

    <h1 class="text-xl font-medium dark:text-gray-100">Remove Attachment?</h1>

  </div>

  <div class="text-black dark:text-white py-4 text-base">
    Are you sure you want to remove the current attachment?
  </div>

  <div class="flex justify-end gap-4">

    <button type="button" on:click={onCancelClick}
            class="w-auto mt-4 py-1.5 px-8 flex justify-center items-center
            hover:bg-orange-600 disabled:bg-neutral-400 dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400
            border border-gray-400 rounded-lg shadow-md
            focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            text-center dark:text-white hover:text-white text-lg font-semibold
            transition ease-in duration-200 ">
      Cancel
    </button>

    <button type="button" on:click={onRemoveClick}
            class="w-auto mt-4 py-1.5 px-8 flex justify-center items-center
            bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400 dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400
            rounded-lg shadow-md
            focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            text-white text-center text-lg font-semibold
            transition ease-in duration-200 ">
      Remove
    </button>

  </div>

</div>