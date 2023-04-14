<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import toast from 'svelte-french-toast';

    import {currentUser} from "../../lib/stores/user-store";
    import {setDispatcher} from "../../lib/lens-profile";
    import {useDispatcher} from "../../lib/stores/preferences-store";

    const dispatch = createEventDispatcher();

    let loading = false;
    let success;

    const onEnableClick = async () => {
        if (!$currentUser) throw new Error('No user found');

        loading = true;

        try {
            const txHash = await setDispatcher({
                profileId: $currentUser.profileId,
            });

            if (txHash) {
                $currentUser.canUseRelay = true;
                $useDispatcher = true;
                success = true;
                toast.success('Dispatcher set!');
                dispatch('success');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error setting dispatcher');
        } finally {
            loading = false;
        }
    };
</script>

<div class="flex flex-col p-4">

  <div class="text-black dark:text-white py-2 text-base">
    Create posts without needing to sign transactions or pay gas fees.
  </div>

  <div class="flex justify-end">

    <button type="button" on:click={onEnableClick} disabled={loading || success}
            class="w-auto mt-4 py-1.5 px-8 flex justify-center items-center
            {success ? 'bg-green-700 dark:bg-green-500' : 'bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400 dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400'}
            rounded-lg shadow-md
            focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            text-white text-center text-lg font-semibold
            transition ease-in duration-200 ">

      {#if loading}
        <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101"
             fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="#E5E7EB"/>
          <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentColor"/>
        </svg>

      {:else if success}

        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
             class="inline mr-3 w-4 h-4 text-white" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>

      {/if}

      <span>Enable</span>

    </button>

  </div>

</div>