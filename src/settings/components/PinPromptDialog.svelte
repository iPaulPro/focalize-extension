<script lang="ts">
    import video from '../../assets/pin-extension.mp4';
    import {pinPromptShown} from '../../lib/store/preferences-store';
    import {interval, Subscription} from 'rxjs';
    import {takeWhile, switchMap} from 'rxjs/operators';
    import {onDestroy, onMount} from "svelte";
    import {isOnToolbar} from "../../lib/utils";

    let subscription: Subscription;
    let closeButton: HTMLButtonElement;

    const checkIsOnToolbar = interval(500)
        .pipe(
            switchMap(async () => await isOnToolbar()),
            takeWhile((onToolbar) => !onToolbar, true),
        );

    onMount(() => {
        subscription = checkIsOnToolbar.subscribe({
            complete: () => closeButton.click()
        });
    });

    onDestroy(() => {
        subscription?.unsubscribe();
    });
</script>

<div class="flex flex-col">

  <div class="flex justify-between items-center p-4 pr-2 border-b border-gray-200 dark:border-gray-600">
    <div class="flex items-center text-xl font-semibold dark:text-gray-100 gap-1.5">
      <svg viewBox="0 0 24 24" fill="none" class="w-7 bg-orange text-white inline rounded-full"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      Focalize is meant to be pinned!
    </div>
    <form method="dialog">
      <button bind:this={closeButton} class="p-2 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full transition-none
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

  <div class="w-full px-4 pt-4">
    <video src={video} class="w-full border" autoplay loop preload="auto"></video>
  </div>

  <div class="flex justify-between p-4">
    <div class="flex items-center gap-1.5">
      <input type="checkbox" id="hidePinPrompt" bind:checked={$pinPromptShown}
             class="form-checkbox text-orange focus:ring-orange-500 rounded">
      <label for="hidePinPrompt" class="opacity-80 dark:text-white">Don't show this again</label>
    </div>

    <button type="button" on:click={() => closeButton.click()}
            class="py-1.5 px-8 flex justify-center items-center
            bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400
            dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600
            rounded-full shadow-md
            focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            text-white text-center text-lg font-semibold dark:disabled:text-gray-400
            transition ease-in duration-200">
      Okay
    </button>
  </div>

</div>