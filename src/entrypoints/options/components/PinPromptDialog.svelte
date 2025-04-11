<script lang="ts">
    import video from '~/assets/pin-extension.mp4';
    import { pinPromptShown } from '@/lib/stores/preferences-store';
    import { interval, Subscription } from 'rxjs';
    import { takeWhile, switchMap } from 'rxjs/operators';
    import { createEventDispatcher, onDestroy, onMount } from 'svelte';
    import { isOnToolbar } from '@/lib/utils/utils';

    const dispatch = createEventDispatcher<any>();

    let subscription: Subscription;

    const checkIsOnToolbar = interval(500).pipe(
        switchMap(async () => await isOnToolbar()),
        takeWhile((onToolbar) => !onToolbar, true),
    );

    onMount(() => {
        subscription = checkIsOnToolbar.subscribe({
            complete: () => dispatch('dismiss'),
        });
    });

    onDestroy(() => {
        subscription?.unsubscribe();
    });
</script>

<div class="flex flex-col">
    <div class="w-full px-5 pt-5">
        <!-- svelte-ignore a11y-media-has-caption -->
        <video src={video} class="w-full border" autoplay loop preload="auto"></video>
    </div>

    <div class="flex justify-between p-4">
        <div class="flex items-center gap-1.5">
            <input
                type="checkbox"
                id="hidePinPrompt"
                bind:checked={$pinPromptShown}
                class="form-checkbox rounded text-orange focus:ring-orange-500"
            />
            <label for="hidePinPrompt" class="opacity-80 dark:text-white"
                >Don't show this again</label
            >
        </div>

        <button
            type="button"
            on:click={() => dispatch('dismiss')}
            class="flex items-center justify-center rounded-full bg-orange-600
            px-8 py-1.5 text-center
            text-lg font-semibold text-white
            shadow-md transition
            duration-200 ease-in hover:bg-orange-700 focus:outline-none focus:ring-2
            focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-orange-200 disabled:bg-neutral-400 dark:bg-orange-600
            dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
        >
            Okay
        </button>
    </div>
</div>
