<script lang="ts">
    import toast, {Toaster} from 'svelte-french-toast';

    import {logOut} from "../lib/lens-auth";
    import {getAuthenticatedUser, UserError} from "../lib/user";
    import {currentUser} from "../lib/stores/user-store";
    import {darkMode, pinPromptShown} from '../lib/stores/preferences-store';

    import {onMount, tick} from "svelte";
    import AllSettings from "./components/AllSettings.svelte";
    import PinPromptDialog from "./components/PinPromptDialog.svelte";
    import DialogOuter from "../lib/components/DialogOuter.svelte";
    import {isOnToolbar} from '../lib/utils';
    import {get} from '../lib/stores/chrome-storage-store';
    import Login from './components/Login.svelte';

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

        const {user, error} = await getAuthenticatedUser()
        console.log('ensureUser: user', user, 'error', error);

        if (error !== undefined) {
            await onUserError(error);
            return;
        }

        $currentUser = user;
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
            console.error('Error ensuring user', e);
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
    <Login/>
  {/if}

{/if}

<dialog id="noProfileDialog" bind:this={noProfileDialog}
        class="w-1/4 rounded-2xl shadow-2xl p-0 border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
  <DialogOuter title="⚠️ No profile found!">
    <div class="px-4 py-8 text-base">
      A Lens profile is required for using Focalize.
    </div>
  </DialogOuter>
</dialog>

{#if showPinPromptDialog}
  <dialog id="pinPromptDialog" bind:this={pinPromptDialog} on:close={() => showPinPromptDialog = false}
          class="w-2/3 lg:w-1/3 min-h-[20rem] rounded-2xl shadow-2xl p-0 border border-gray-200 dark:bg-gray-700
          dark:border-gray-600">
    <DialogOuter title="⚠️ Focalize is meant to be pinned!">
      <PinPromptDialog on:dismiss={() => pinPromptDialog.close()}/>
    </DialogOuter>
  </dialog>
{/if}

<Toaster />

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