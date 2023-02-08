<script lang="ts">
    import focalizeLogo from '../assets/focalize-logo-large.svg';
    import lensLogo from '../assets/lens-logo-small.svg';

    import toast, { Toaster } from 'svelte-french-toast';

    import {authenticate} from "../lib/lens-auth";
    import {getCurrentUser, UserError, userFromProfile} from "../lib/user";
    import {currentUser} from "../lib/store/user-store";
    import {ensureCorrectChain, initEthers} from "../lib/ethers-service";

    import InlineSVG from 'svelte-inline-svg';

    import {onMount} from "svelte";
    import Welcome from './components/Welcome.svelte'

    let loading = true;
    let userError: UserError;

    const onSignInClick = async () => {
        try {
            await ensureCorrectChain();

            const authenticatedProfile = await authenticate();
            $currentUser = userFromProfile(authenticatedProfile);

            console.log('Authenticated user', $currentUser);
        } catch (e) {
            console.error(e);
            toast.error('Error logging in');
        }
    };

    $: {
        if (userError) {
            switch (userError) {
                case UserError.WALLET_NOT_CONNECTED:
                    // TODO show wallet connect button
                    toast.error('Unable to connect to wallet');
                    break;
                case UserError.NOT_AUTHENTICATED:
                    // Show login
                    break;
                case UserError.NO_PROFILE:
                    // TODO Show message that a Lens profile is required for usage
                    break;
                case UserError.UNKNOWN:
                    // TODO show unrecoverable error
                    break;
            }
        }
    }

    onMount(async () => {
        if ($currentUser) return;

        const {user, error} = await getCurrentUser()

        if (error) {
            userError = error;
            loading = false;
            return;
        }

        $currentUser = user;
        loading = false;
    });
</script>

{#if loading}

  <main class="w-full h-full">

    <div class="w-full h-full flex justify-center items-center">
      <span class="echo-loader">Loading…</span>
    </div>

  </main>

{:else}

  {#if $currentUser}

    <Welcome />

  {:else}

    <main class="w-full h-full">

      <div class="w-full h-full flex justify-center items-center">

        <div class="flex flex-col items-center gap-4 mb-36">

          <InlineSVG src={focalizeLogo} alt="Focalize Logo" class="w-24 h-24" />

          <h1 class="mt-24">Welcome to Focalize!</h1>

          <button type="button" on:click={onSignInClick}
                  class="py-0 pr-6 pl-3 flex justify-center items-center bg-orange-500 hover:bg-orange-600
                  focus:ring-orange-400 focus:ring-offset-orange-200 text-white transition ease-in duration-200
                  text-center text-base font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
                  rounded-lg">
            <InlineSVG src={lensLogo} alt="Lens Logo" class="w-12 h-12" />
            Sign in with Lens
          </button>

        </div>

      </div>
    </main>

  {/if}

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