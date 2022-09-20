<script lang="ts">
    import createMetaMaskProvider from "metamask-extension-provider";
    import {Lens} from 'lens-protocol';
    import {ethers} from "ethers";
    import {onMount} from "svelte";
    import Button from '@smui/button'
    import {getSigner} from "../lib/ethers-service";
    import {getDefaultProfile} from "../lib/lens-auth";

    const inPageProvider = createMetaMaskProvider();
    const provider = new ethers.providers.Web3Provider(inPageProvider)

    chrome.storage.local.get(['accessToken', 'refreshToken'], function (result) {
        console.log('Saved tokens', result);
    });

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

        const profile = await Lens.defaultProfile(address);
        console.log('authenticate: Default profile', profile.data.defaultProfile);

        if (!profile.data.defaultProfile) {
            // TODO Check if any profile, prompt to choose a default profile
        }
    };

    const login = async () => {
        const defaultProfile = await getDefaultProfile();
        console.log('Got default profile', defaultProfile);
    }

    onMount(async () => {
        await login();
    });
</script>

<main class="w-full h-full">

  <h1>Hi</h1>

  <Button on:click={authenticate}>Login</Button>

</main>

<style>

</style>