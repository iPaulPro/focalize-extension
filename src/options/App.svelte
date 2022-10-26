<script lang="ts">
    import createMetaMaskProvider from "metamask-extension-provider";
    import {ethers} from "ethers";

    import toast, { Toaster } from 'svelte-french-toast';

    import {authenticate, getDefaultProfile} from "../lib/lens-auth";
    import {profile} from "../lib/state";
    import {ensureCorrectChain} from "../lib/ethers-service";
    import {sleep} from "../lib/utils";

    import InlineSVG from 'svelte-inline-svg';

    import {onMount} from "svelte";
    import Welcome from './Welcome.svelte'

    const inPageProvider = createMetaMaskProvider();
    const provider = new ethers.providers.Web3Provider(inPageProvider)

    let loading = true;

    const onSignInClick = async () => {
        try {
            await ensureCorrectChain();

            const authenticatedProfile = await authenticate();
            profile.set(authenticatedProfile);

            console.log('Authenticated profile', $profile);
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
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        await checkForProfile();
    });
</script>

{#if loading}

  <main class="w-full h-full">

    <div class="w-full h-full flex justify-center items-center">
      <span class="echo-loader">Loading…</span>
    </div>

  </main>

{:else}

  {#if profile}

    <Welcome {profile} />

  {:else}

    <main class="w-full h-full">

      <div class="w-full h-full flex justify-center items-center">

        <div class="flex flex-col items-center gap-4 mb-36">

          <InlineSVG src="../assets/focalize-logo-large.svg" alt="Focalize Logo" class="w-24 h-24"/>

          <h1 class="mt-24">Welcome to Focalize!</h1>

          <button type="button" on:click={onSignInClick}
                  class="py-0 pr-6 pl-3 flex justify-center items-center  bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white w-full transition ease-in duration-200 text-center text-base font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg  w-auto">
            <InlineSVG src="../assets/lens-logo-small.svg" alt="Lens Logo" class="text-white w-12 h-12"/>
            Sign in with Lens
          </button>

        </div>

      </div>
    </main>

  {/if}

{/if}

<Toaster />