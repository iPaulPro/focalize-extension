<script lang="ts">
    import metaMaskLogo from '~/assets/metamask.svg';
    import frameIcon from '~/assets/ic_frame_app.png';
    import browserWalletIcon from '~/assets/ic_browser_wallet.svg';
    import { createEventDispatcher, onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import LoadingSpinner from '@/lib/components/LoadingSpinner.svelte';
    import axios, { AxiosError } from 'axios';

    import WalletConnection from '@/lib/types/WalletConnection';

    const dispatch = createEventDispatcher<any>();

    let loading = true;
    let showMetaMask = true;
    let showFrame = false;
    let showInjected = false;

    const detectMetaMask = () => {
        // eslint-disable-next-line no-undef
        const metamaskPort = browser.runtime.connect('nkbihfbeogaeaoehlefnkodbefgpgknn');
        metamaskPort.onDisconnect.addListener(() => {
            showMetaMask = false;
        });
    };

    const detectFrame = async () => {
        try {
            await axios.get('http://127.0.0.1:1248');
        } catch (e) {
            if (e instanceof AxiosError && e.code === 'ERR_BAD_REQUEST') {
                showFrame = true;
            }
        }
    };

    const detectInjected = () => {
        showInjected = window.ethereum !== undefined;
    };

    onMount(async () => {
        detectInjected();
        detectMetaMask();
        await detectFrame();

        loading = false;

        // eslint-disable-next-line no-undef
        if (browser.runtime.lastError) {
            // eslint-disable-next-line no-undef
            console.warn(browser.runtime.lastError);
        }
    });
</script>

<div class="flex flex-col gap-5 p-5">
    <div class="flex flex-col gap-1">
        <div class="text-xl font-semibold">Connect your wallet</div>
        <div class="text-sm opacity-60">
            Connect your wallet to sign in. A Lens account is required.
        </div>
    </div>

    <div class="absolute right-3 top-3">
        <form method="dialog">
            <button
                class="rounded-full p-2 transition-none hover:bg-gray-200 focus:outline-orange-400
              focus:ring-orange-400 focus:ring-offset-orange-200 dark:hover:bg-gray-500"
            >
                <svg
                    class="h-5 w-5 text-gray-500 dark:text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </form>
    </div>

    {#if loading}
        <div class="flex h-16 w-full items-center justify-center p-8">
            <LoadingSpinner />
        </div>
    {:else}
        <div class="flex min-h-[4rem] flex-col gap-4" in:slide>
            {#if showInjected}
                <button
                    class="wallet-option"
                    on:click={() => dispatch('select', WalletConnection.INJECTED)}
                >
                    <span>Browser wallet</span>
                    <img src={browserWalletIcon} alt="Browser wallets" class="h-6 w-6" />
                </button>
            {/if}

            {#if showMetaMask}
                <button
                    class="wallet-option"
                    on:click={() => dispatch('select', WalletConnection.METAMASK)}
                >
                    <span>MetaMask</span>
                    <img src={metaMaskLogo} alt="MetaMask Logo" class="h-6 w-6" />
                </button>
            {/if}

            <button
                class="wallet-option"
                on:click={() => dispatch('select', WalletConnection.COINBASE_WALLET)}
            >
                <span>Coinbase Wallet</span>
                <svg fill="none" class="h-6 w-6 rounded-full object-cover" viewBox="0 0 1024 1024">
                    <path fill="#0052FF" d="M0 0h1024v1024H0z" />
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M152 512c0 198.823 161.177 360 360 360s360-161.177 360-360-161.177-360-360-360-360 161.177-360 360Zm268-116c-13.255 0-24 10.745-24 24v184c0 13.255 10.745 24 24 24h184c13.255 0 24-10.745 24-24V420c0-13.255-10.745-24-24-24H420Z"
                        fill="#fff"
                    />
                </svg>
            </button>

            {#if showFrame}
                <button
                    class="wallet-option"
                    on:click={() => dispatch('select', WalletConnection.FRAME)}
                >
                    <span>Frame</span>
                    <img src={frameIcon} alt="Frame Wallet" class="h-6 w-6" />
                </button>
            {/if}

            <button
                class="wallet-option"
                on:click={() => dispatch('select', WalletConnection.WALLET_CONNECT)}
            >
                <span>WalletConnect</span>
                <svg class="h-6 w-6" viewBox="0 0 300 185">
                    <path
                        fill="#66b0ff"
                        fill-rule="nonzero"
                        d="M61.439 36.256c48.91-47.888 128.212-47.888 177.123 0l5.886 5.764a6.041 6.041 0 0 1 0 8.67l-20.136 19.716a3.179 3.179 0 0 1-4.428 0l-8.101-7.931c-34.122-33.408-89.444-33.408-123.566 0l-8.675 8.494a3.179 3.179 0 0 1-4.428 0L54.978 51.253a6.041 6.041 0 0 1 0-8.67l6.46-6.327ZM280.206 77.03l17.922 17.547a6.041 6.041 0 0 1 0 8.67l-80.81 79.122c-2.446 2.394-6.41 2.394-8.856 0l-57.354-56.155a1.59 1.59 0 0 0-2.214 0L91.54 182.37c-2.446 2.394-6.411 2.394-8.857 0L1.872 103.247a6.041 6.041 0 0 1 0-8.671l17.922-17.547c2.445-2.394 6.41-2.394 8.856 0l57.355 56.155a1.59 1.59 0 0 0 2.214 0L145.57 77.03c2.446-2.394 6.41-2.395 8.856 0l57.355 56.155a1.59 1.59 0 0 0 2.214 0L271.35 77.03c2.446-2.394 6.41-2.394 8.856 0Z"
                    />
                </svg>
            </button>
        </div>
    {/if}
</div>

<style>
    .wallet-option {
        @apply flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-3.5 text-base font-medium shadow-none transition-all duration-300 ease-in-out hover:bg-white hover:shadow-lg active:shadow-none dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800;
    }

    .wallet-option div {
        @apply text-black text-opacity-90 dark:text-white;
    }
</style>
