<script lang="ts">
    import { clearPostState } from '../stores/state-store';
    import { logOut } from '../lens-service';

    const onConfirm = async () => {
        clearPostState();
        await logOut();
        window.close();
    };
</script>

<div class="flex max-w-sm flex-col gap-4 p-5">
    <div class="pt-2 text-lg text-black dark:text-white">Are you sure you want to log out?</div>

    <div class="text-red-700 dark:text-orange-400">
        Warning: Any unpublished post drafts will be discarded and synced preferences will be
        deleted. This cannot be undone.
    </div>

    <div class="flex justify-end">
        <button
            type="button"
            on:click={onConfirm}
            class="mt-4 flex w-fit items-center justify-center rounded-xl bg-orange-600 px-12
            py-2 text-center text-lg font-semibold
            text-white shadow-md
            transition duration-200 ease-in hover:bg-orange-700 focus:outline-none
            focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-orange-200
            disabled:bg-neutral-400 dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
        >
            Log out
        </button>
    </div>
</div>
