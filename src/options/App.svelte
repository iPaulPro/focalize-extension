<script lang="ts">
    import createMetaMaskProvider from "metamask-extension-provider";
    import { Lens } from 'lens-protocol';
    import {ethers} from "ethers";
    import {onMount} from "svelte";

    const inPageProvider = createMetaMaskProvider();
    const provider = new ethers.providers.Web3Provider(inPageProvider)

    const authenticate = async (address) => {
        // Getting the challenge from the server
        const data = await Lens.getChallenge(address);
        let message = data.data.challenge.text;
        // Signing the challenge with the wallet
        const signer = provider.getSigner();
        const signature = await signer.signMessage(message);
        console.log(signature);

        const response = await Lens.Authenticate(address, signature);
        console.log(response);
    };

    const login = async () => {
        provider.send('eth_requestAccounts', [])
            .then(accounts => {
                const address = accounts[0]
                authenticate(address)
            })
            .catch(console.error)
    }

    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts: string[]) => {
        console.log("accountsChanged", accounts);
        const address = accounts[0]
        authenticate(address)
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

</main>

<style>

</style>