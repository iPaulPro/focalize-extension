<script lang="ts">
    import createMetaMaskProvider from "metamask-extension-provider";
    import {Lens} from 'lens-protocol';
    import {ethers} from "ethers";

    import {getSigner} from "../lib/ethers-service";
    import {getDefaultProfile, getOrRefreshAccessToken} from "../lib/lens-auth";

    import InlineSVG from 'svelte-inline-svg';
    import lensLogoSmall from '../assets/lens-logo-small.svg';
    import focalizeLogo from '../assets/focalize-logo-large.svg';

    import {onMount} from "svelte";
    import Welcome from '../lib/Welcome.svelte'

    const inPageProvider = createMetaMaskProvider();
    const provider = new ethers.providers.Web3Provider(inPageProvider)

    let loading = true;
    let profile = null;

    const authenticate = async () => {
        const signer = getSigner();
        const address = await signer.getAddress();
        console.log('authenticate: Authenticating with address', address);
        if (!address) {
            // TODO
            return;
        }

        // Getting the challenge from the server
        const challenge = await Lens.getChallenge(address);
        console.log('authenticate: Lens challenge response', challenge);
        if (challenge.error) {
            // TODO
            console.error(challenge.error)
            return;
        }
        let message = challenge.data.challenge.text;

        // Signing the challenge with the wallet
        const signature = await signer.signMessage(message);
        console.log('authenticate: Signed Lens challenge', signature);

        const auth = await Lens.Authenticate(address, signature);
        console.log('authenticate: Lens auth response', auth);
        if (auth.error) {
            // TODO
            console.error(auth.error)
            return;
        }

        if (auth.data) {
            const accessToken = auth.data?.authenticate?.accessToken;
            const refreshToken = auth.data?.authenticate?.refreshToken;
            chrome.storage.local.set({accessToken, refreshToken}, function () {
                console.log('authenticate: Saved tokens to local storage');
            });
        }

        const profileRes = await Lens.defaultProfile(address);
        console.log('authenticate: Default profile', profileRes.data.defaultProfile);

        if (!profileRes.data.defaultProfile) {
            // TODO Check if any profile, prompt to choose a default profile
        }

        profile = profileRes.data.defaultProfile;
    };

    const checkForAccessToken = async () => {
        let accessToken;
        try {
            // If there is already an access token, try to get
            accessToken = await getOrRefreshAccessToken();
        } catch (e) {
            console.error(e);
        }

        if (accessToken) {
            console.log('Got valid access token, showing welcome screen...')
            profile = await getDefaultProfile();
            // TODO Show welcome
        }

        loading = false;
    }

    onMount(async () => {
        await checkForAccessToken();
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

          <InlineSVG src={focalizeLogo} alt="Focalize Logo" class="w-24 h-24"/>

          <h1 class="mt-24">Welcome to Focalize!</h1>

          <button type="button" on:click={authenticate}
                  class="py-0 pr-6 pl-3 flex justify-center items-center  bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white w-full transition ease-in duration-200 text-center text-base font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg  w-auto">
            <InlineSVG src={lensLogoSmall} alt="Lens Logo" class="text-white w-12 h-12"/>
            Sign in with Lens
          </button>

        </div>

      </div>
    </main>

  {/if}

{/if}

<style>

</style>