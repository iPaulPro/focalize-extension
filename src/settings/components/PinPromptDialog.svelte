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