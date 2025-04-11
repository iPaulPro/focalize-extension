<script lang="ts">
    import toast, {Toaster} from 'svelte-french-toast';

    import {UserError} from "../lib/user/user";
    import {currentUser} from "../lib/stores/user-store";
    import {darkMode, pinPromptShown} from '../lib/stores/preferences-store';
    import { showV3Prompt } from "../lib/stores/cache-store";

    import {onMount, tick} from "svelte";
    import AllSettings from "./components/AllSettings.svelte";
    import PinPromptDialog from "./components/PinPromptDialog.svelte";
    import DialogOuter from "../lib/components/DialogOuter.svelte";
    import {isOnToolbar} from '../lib/utils/utils';
    import {get} from '../lib/stores/chrome-storage-store';
    import Login from './components/Login.svelte';
    import { isAuthenticated, logOut } from '../lib/lens-service';

    let loading = true;
    let noProfileDialog: HTMLDialogElement;

    let pinPromptDialog: HTMLDialogElement;
    let showPinPromptDialog = false;

    const showPinPromptIfNecessary = async () => {
        if (!$currentUser) return;

        const onToolbar = await isOnToolbar();
        if (!onToolbar && !$pinPromptShown) {
            showPinPromptDialog = true;
            await tick();
            pinPromptDialog?.showModal();
        }
    };

    const onUserError = async (userError: UserError) => {
        switch (userError) {
            case UserError.WALLET_NOT_CONNECTED:
                toast.error('Unable to connect to wallet', {duration: 5000});
                break;
            case UserError.NO_PROFILE:
                noProfileDialog?.showModal();
                break;
            case UserError.UNKNOWN:
                toast.error('Error signing in', {duration: 5000});
                break;
        }

        await logOut()
    };

    const ensureUser = async () => {
        if (await get(currentUser)) return;

        const authenticated = await isAuthenticated();
        if (!authenticated) {
            console.warn('Error getting access token');
            $currentUser = null;
        }
    };

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    $: if ($currentUser) {
        showPinPromptIfNecessary();
    }

    const checkSystemColorScheme = async () => {
        try {
            const dm = await get(darkMode);
            if (dm === undefined) {
                $darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        } catch (e) {
            console.warn('Error checking system color scheme', e);
        }
    }

    onMount(async () => {
        await checkSystemColorScheme();

        try {
            await ensureUser();
        } catch (e) {
            // expected if not logged in
        } finally {
            loading = false;
        }
    });
</script>

{#if loading}

  <main class="w-full h-[100dvh]">
    <div class="w-full h-full flex justify-center items-center">
      <span class="echo-loader">Loading…</span>
    </div>
  </main>

{:else}

  {#if $currentUser}
    <AllSettings />
  {:else}
    <Login on:noProfile={() => onUserError(UserError.NO_PROFILE)}/>
  {/if}

{/if}

<dialog id="noProfileDialog" bind:this={noProfileDialog}
        class="w-1/4 rounded-2xl shadow-2xl p-0 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
  <DialogOuter title="⚠️ No profile found!">
    <div class="px-4 py-8 text-base">
      A Lens profile is required for using Focalize.
    </div>
  </DialogOuter>
</dialog>

{#if showPinPromptDialog}
  <dialog id="pinPromptDialog" bind:this={pinPromptDialog} on:close={() => showPinPromptDialog = false}
          class="w-2/3 lg:w-1/3 min-h-[20rem] rounded-2xl shadow-2xl p-0 border border-gray-200 dark:bg-gray-800
          dark:border-gray-700">
    <DialogOuter title="⚠️ Focalize is meant to be pinned!">
      <PinPromptDialog on:dismiss={() => pinPromptDialog.close()}/>
    </DialogOuter>
  </dialog>
{/if}

<Toaster />

{#if $showV3Prompt}
  <div class="absolute top-0 left-0 right-0 h-24 p-8 text-center text-white flex justify-center items-center
       bg-red-700 dark:bg-red-400 font-semibold text-2xl z-[100]">
    New version for Lens V3 coming soon!
    <div class="absolute inset-y-0 right-0">
      <button type="button" on:click={() => $showV3Prompt = false}
              class="text-white opacity-80 hover:opacity-100 p-2 rounded-full">
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style global>
  /* :not(:required) hides this rule from IE9 and below */
  .echo-loader:not(:required) {
    width: 40px;
    height: 40px;
    border: 6px solid #FF0000;
    border-radius: 50%;
    animation: echo-loader 1.4s ease-in;
    animation-iteration-count: infinite;
    display: inline-block;
    text-indent: 100%;
    overflow: hidden;
  }

  @keyframes echo-loader {
    0% {
      transform: scale(0);
      opacity: 0.0;
    }
    25% {
      transform: scale(0);
      opacity: .1;
    }
    50% {
      transform: scale(0.1);
      opacity: .3;
    }
    75% {
      transform: scale(0.5);
      opacity: .5;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
</style>