<script lang="ts">
    import createMetaMaskProvider from "metamask-extension-provider";
    import { Lens } from 'lens-protocol';
    import {ethers} from "ethers";
    import {onMount} from "svelte";
    import Button from '@smui/button'

    const inPageProvider = createMetaMaskProvider();
    const provider = new ethers.providers.Web3Provider(inPageProvider)

    const authenticate = async () => {
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        console.log('Authenticating with address', address);
        if (!address) {
            // TODO
            return;
        }

        // Getting the challenge from the server
        const challenge = await Lens.getChallenge(address);
        if (challenge.error) {
            // TODO
            return;
        }
        let message = challenge.data.challenge.text;
        console.log('Got Lens challenge text', message);

        // Signing the challenge with the wallet
        const signature = await signer.signMessage(message);
        console.log('Signed Lens challenge', signature);

        const auth = await Lens.Authenticate(address, signature);
        console.log('Lens auth response', auth);
        if (auth.error) {
            // TODO
            return;
        }

        const profile = await Lens.defaultProfile(address);
        console.log('Got profile', profile.data.defaultProfile);
    };

    const login = async () => {
        provider.send('eth_requestAccounts', [])
            .then(accounts => {
                console.log('Got accounts from provider', accounts);
            })
            .catch(console.error);
    }

    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts: string[]) => {
        console.log("accountsChanged", accounts);
        const address = accounts[0];
        authenticate(address);
    });

    // Subscribe to chainId change
    provider.on("chainChanged", (chainId: number) => {
        console.log("chainChanged", chainId);
    });

    // Subscribe to provider connection
    provider.on("connect", (info: { chainId: number }) => {
        console.log("connect", info);
    });

    // Subscribe to provider disconnection
    provider.on("disconnect", (error: { code: number; message: string }) => {
        console.log("disconnect", error);
    });

    provider.on('error', (error) => {
        // Failed to connect to MetaMask, fallback logic.
        console.error(error);
    });

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