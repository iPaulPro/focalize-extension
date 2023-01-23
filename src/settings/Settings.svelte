<script lang="ts">
    import focalizeLogo from '../assets/focalize-logo-large.svg';
    import lensLogo from '../assets/lens-logo-small.svg';

    import createMetaMaskProvider from "metamask-extension-provider";
    import {ethers} from "ethers";

    import toast, { Toaster } from 'svelte-french-toast';

    import {authenticate, getDefaultProfile} from "../lib/lens-auth";
    import {profile} from "../lib/store/user";
    import {ensureCorrectChain, initEthers} from "../lib/ethers-service";

    import InlineSVG from 'svelte-inline-svg';

    import {onMount} from "svelte";
    import Welcome from './components/Welcome.svelte'

    const inPageProvider = createMetaMaskProvider();
    const provider = new ethers.providers.Web3Provider(inPageProvider)

    let loading = true;

    const onSignInClick = async () => {
        try {
            await ensureCorrectChain();

            const authenticatedProfile = await authenticate();
            profile.set(authenticatedProfile);

            console.log('Authenticated profile', $profile.id);
        } catch (e) {
            console.error(e);
            toast.error('Error logging in');
        }
    };

    const checkForProfile = async () => {
        try {
            if (!$profile) {
                const defaultProfile = await getDefaultProfile();
                profile.set(defaultProfile);
            }
            console.log('Got profile', $profile);
        } catch (e) {
            // Expected if the user has not authenticated
            console.log('Login required');
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        const accounts = await initEthers();
        if(chrome.runtime.lastError) console.error('runtime error', chrome.runtime.lastError)
        if (accounts.length > 0) {
            await checkForProfile();
        } else {
            toast.error('Cannot find wallet to connect to');
        }
    });
</script>

{#if loading}

  <main class="w-full h-full">

    <div class="w-full h-full flex justify-center items-center">
      <span class="echo-loader">Loading…</span>
    </div>

  </main>

{:else}

  {#if $profile}

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