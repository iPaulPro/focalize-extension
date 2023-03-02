<script lang="ts">
    import focalizeLogo from '../assets/focalize-logo-large.svg';
    import lensLogo from '../assets/lens-logo-small.svg';

    import toast, {Toaster} from 'svelte-french-toast';

    import {authenticateUser} from "../lib/lens-auth";
    import {getCurrentUser, UserError, userFromProfile} from "../lib/user";
    import {currentUser} from "../lib/store/user-store";
    import {ensureCorrectChain} from "../lib/ethers-service";
    import {welcomeShown} from "../lib/store/preferences-store";

    import InlineSVG from 'svelte-inline-svg';

    import {onMount} from "svelte";
    import Welcome from './components/Welcome.svelte'
    import Preferences from "./components/Preferences.svelte";

    let loading = true;
    let noProfileDialog: HTMLDialogElement;

    const onUserError = (userError: UserError) => {
        switch (userError) {
            case UserError.WALLET_NOT_CONNECTED:
                // TODO show connect wallet button
                toast.error('Unable to connect to wallet');
                break;
            case UserError.NO_PROFILE:
                noProfileDialog?.showModal();
                break;
            case UserError.UNKNOWN:
                // TODO show unrecoverable error
                break;
        }
    };

    const ensureUser = async () => {
        if ($currentUser) return;

        const {user, error} = await getCurrentUser()

        if (error !== undefined) {
            onUserError(error);
            return;
        }

        $currentUser = user;
    };

    const onSignInClick = async () => {
        if (!$currentUser) {
            await ensureUser();
        }

        try {
            await ensureCorrectChain();

            const authenticatedProfile = await authenticateUser();
            $currentUser = userFromProfile(authenticatedProfile);

            console.log('Authenticated user', $currentUser);
        } catch (e) {
            console.error('Error logging in',e);
            toast.error('Error logging in');
        }

        if ($currentUser) {
            try {
                await chrome.runtime.sendMessage({setAlarm: true});
            } catch (e) {
                console.error('Error setting alarm', e)
            }
        }
    };

    onMount(async () => {
        try {
            await ensureUser();
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

    {#if $welcomeShown}
      <Preferences />
    {:else}
      <Welcome/>
    {/if}

  {:else}

    <main class="w-full h-[100dvh]">

      <div class="w-full h-full flex justify-center items-center">

        <div class="flex flex-col items-center gap-4 mb-36">

          <InlineSVG src={focalizeLogo} alt="Focalize Logo" class="w-24 h-24" />

          <button type="button" on:click={onSignInClick}
                  class="mt-24 py-0 pr-6 pl-3 flex justify-center items-center bg-orange-500 hover:bg-orange-600
                  focus:ring-orange-400 focus:ring-offset-orange-200 text-white transition ease-in duration-200
                  text-center text-base font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2
                  focus:ring-offset-2 rounded-full hover:-translate-y-0.5">
            <InlineSVG src={lensLogo} alt="Lens Logo" class="w-12 h-12" />
            Sign in with Lens
          </button>

        </div>

      </div>
    </main>

  {/if}

{/if}

<Toaster />

<dialog bind:this={noProfileDialog}
        class="rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
  <div>
    A Lens profile is required for using Focalize.
  </div>
</dialog>

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