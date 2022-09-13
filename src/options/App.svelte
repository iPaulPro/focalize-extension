<script lang="ts">
    import createMetaMaskProvider from "metamask-extension-provider";

    import {ethers} from "ethers";
    import {onMount} from "svelte";

    const provider = createMetaMaskProvider();

    const login = async () => {
        provider.request({method: 'eth_requestAccounts'})
            .then(console.log)
            .catch(console.error)

        // const signer = provider.getSigner()
    }

    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts: string[]) => {
        console.log(accounts);
    });

    // Subscribe to chainId change
    provider.on("chainChanged", (chainId: number) => {
        console.log(chainId);
    });

    // Subscribe to provider connection
    provider.on("connect", (info: { chainId: number }) => {
        console.log(info);
    });

    // Subscribe to provider disconnection
    provider.on("disconnect", (error: { code: number; message: string }) => {
        console.log(error);
    });

    provider.on('error', (error) => {
        // Failed to connect to MetaMask, fallback logic.
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