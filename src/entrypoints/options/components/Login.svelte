<script lang="ts">
    import { toast } from 'svelte-sonner';
    import DialogOuter from '@/lib/components/DialogOuter.svelte';
    import { onMount, tick } from 'svelte';
    import ConnectWalletDialog from './ConnectWalletDialog.svelte';
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import type WalletConnection from '@/lib/types/WalletConnection';
    import { connectWalletAndGetAccounts, login, logOut, onboard } from '@/lib/lens-service';
    import type { AccountAvailable } from '@lens-protocol/client';
    import AccountChooser from '@/lib/components/AccountChooser.svelte';
    import { onLogin } from '@/lib/user/user';
    import { slide } from 'svelte/transition';
    import { getSigner } from '@/lib/evm/ethers-service';
    import { currentUser } from '@/lib/stores/user-store';
    import CreateAccountForm from '@/entrypoints/options/components/CreateAccountForm.svelte';

    const dispatch = createEventDispatcher<any>();

    let walletConnectDialog: HTMLDialogElement;
    let showWalletConnectDialog = false;
    let accountPickerDialog: HTMLDialogElement;
    let showAccountPickerDialog = false;
    let isSigningIn = false;
    let ignoreWalletDialogClose = false;
    let svgLogo: SVGSVGElement;

    const showConnectWalletDialog = async () => {
        showWalletConnectDialog = true;
        await tick();
        walletConnectDialog?.showModal();
    };

    const showAccountPicker = async () => {
        showAccountPickerDialog = true;
        await tick();
        accountPickerDialog?.showModal();
    };

    const onAccountPickerClose = () => {
        showAccountPickerDialog = false;
        isSigningIn = false;
    };

    const authenticate = async (wallet: WalletConnection) => {
        console.log('authenticate: wallet', wallet);
        ignoreWalletDialogClose = true;
        await tick();
        walletConnectDialog?.close();

        let accountsAvailable: readonly AccountAvailable[] = [];
        try {
            accountsAvailable = await connectWalletAndGetAccounts(wallet);
        } catch (e) {
            dispatch('error', e);
            isSigningIn = false;
            return;
        }

        if (!accountsAvailable.length) {
            try {
                const address = await onboard();
                if (!address) {
                    throw new Error('No address returned from onboarding');
                }
                await onLogin(address);
            } catch (e) {
                console.error('Error onboarding', e);
                toast.error('Unable to reach Lens servers', { duration: 5000 });
            } finally {
                isSigningIn = false;
            }
        } else if (accountsAvailable.length > 1) {
            await showAccountPicker();
        } else {
            try {
                const signer = await getSigner();
                const account = await login(signer.address, accountsAvailable[0]);
                await onLogin(signer.address, account);
            } catch (e) {
                console.error('Login cancelled', e);
            } finally {
                isSigningIn = false;
            }
        }
    };

    const onSignInClick = async () => {
        isSigningIn = true;
        try {
            await showConnectWalletDialog();
        } catch (e) {
            console.error('Error logging in', e);
            toast.error('Error logging in', { duration: 5000 });
        }
    };

    const onWalletConnectDialogClose = () => {
        showWalletConnectDialog = false;
        if (!ignoreWalletDialogClose) {
            isSigningIn = false;
        }
    };

    const disconnectWallet = async () => {
        await logOut();
    };

    onMount(() => {
        svgLogo.classList.add('active');
    });
</script>

<main class="relative h-[100dvh] w-full">
    <div class="absolute bottom-0 left-0 right-0 top-0 -z-20 overflow-hidden opacity-50">
        <div class="glowing">
            <span style="--i:1;"></span><span style="--i:2;"></span><span style="--i:3;"></span>
        </div>

        <div class="glowing">
            <span style="--i:1;"></span><span style="--i:2;"></span><span style="--i:3;"></span>
        </div>
    </div>

    <div class="relative flex h-full w-full items-center justify-center">
        {#if $currentUser?.address}
            <div class="absolute right-4 top-4">
                <button type="button" class="btn text-sm" on:click={disconnectWallet}>
                    Disconnect wallet
                </button>
            </div>
        {/if}
        <div class="flex w-full flex-col items-center gap-4 pb-36" in:fade>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                class="h-32"
                bind:this={svgLogo}
            >
                <g fill="#FF6014" fill-rule="nonzero" stroke="#FF6014" stroke-width="4">
                    <path
                        d="M384.52 38.642c-23.34 3.486-49.102 14.016-72.23 29.313-18.716 12.38-33.233 24.546-49.459 41.124-13.734 14.087-20.922 22.483-31.525 36.784-17.08 22.98-29.248 44.468-41.417 72.714-4.982 11.668-12.525 31.803-15.656 41.977-2.349 7.47-8.233 27.446-7.544 28.246.311.2 1.566-.782 3.274-1.992 13.948-9.392 40.42-22.483 69.527-34.365 27.753-11.312 56.361-19.352 83.546-23.55 8.61-1.352 11.884-2.134 12.596-2.988 2.063-2.775-.214-15.653-3.345-18.997-5.195-5.478-45.047-4.553-71.59 1.708-3.132.711-5.836 1.21-5.978 1.067-.427-.498 5.337-6.973 10.888-12.309 25.832-24.546 62.054-42.475 104.61-51.796 10.96-2.348 12.738-3.486 12.667-8.04-.071-3.7-3.63-11.597-5.978-13.162-.925-.57-3.7-1.637-6.262-2.348-6.334-1.708-30.671-1.708-38.072 0-2.705.57-5.124.996-5.267.854-.569-.57 11.814-15.653 18.005-21.914 13.663-13.874 28.536-25.187 54.938-41.978 2.348-1.494 4.697-3.344 5.195-4.197 1.21-1.993.427-5.906-2.135-10.46-3.416-5.976-7.828-7.328-18.787-5.691ZM266.745 285.243c-29.533 4.838-76.927 22.554-99.7 37.353-5.124 3.344-6.191 4.34-6.618 6.26-.214 1.282-.427 34.437-.427 73.71v69.803a1 1 0 0 0 1.46.887c5.763-2.99 9.072-5.422 9.926-7.296C172.772 462.92 188.505 364.266 209 341c13.379-15.226 51.412-25.732 70.768-33.132 8.113-3.13 9.038-4.198 7.686-9.605-1.352-5.336-4.84-11.74-6.832-12.664-1.708-.783-9.963-.997-13.877-.356Z"
                        class="svg-elem-1"
                    ></path>
                </g>
            </svg>

            {#if $currentUser?.address}
                <CreateAccountForm />
            {:else}
                <button
                    type="button"
                    on:click={onSignInClick}
                    disabled={isSigningIn}
                    class="group mt-24 flex items-center justify-center gap-2.5 rounded-full border
                    border-white border-opacity-10 bg-orange-600 px-6 py-3 text-center text-lg font-medium
                    text-white shadow-none transition-all duration-200 ease-in hover:bg-orange-500 focus:outline-0
                    focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 active:shadow-md active:shadow-orange-700
                    active:ring-0 active:ring-offset-0 enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg
                    enabled:hover:shadow-orange-700 disabled:cursor-wait disabled:bg-gray-900"
                >
                    <svg
                        viewBox="0 0 290 186"
                        fill="currentColor"
                        class="w-10 -scale-x-100 drop-shadow-sm group-hover:scale-x-100 group-hover:drop-shadow-dark"
                    >
                        <path
                            d="M145.24.08c13.96 0 27.11 4.67 36.99 13.16 10.36 8.89 16.4 21.24 17.62 35.88 11.21-9.5 24.22-13.96 37.83-12.92 12.99.99 25.59 6.97 35.46 16.85 9.88 9.88 15.86 22.47 16.85 35.47 1.12 14.73-4.19 28.75-15.35 40.55a211.07 211.07 0 0 1-3.31 3.41c-52.846 52.836-121.756 53.963-125.992 53.98h-.108c-2.94 0-72.72-.61-126.08-53.98a151.15 151.15 0 0 1-3.31-3.41C4.67 117.27-.64 103.25.49 88.52c.99-12.99 6.97-25.59 16.85-35.47 9.88-9.88 22.47-15.86 35.47-16.85 13.61-1.04 26.62 3.42 37.83 12.92 1.21-14.64 7.26-26.99 17.61-35.88C118.14 4.75 131.28.08 145.24.08Zm15.1 141.36c-2.7 4.96-8.68 8.17-15.23 8.17-6.55 0-12.52-3.21-15.23-8.17l-7.03 3.83c4.08 7.49 12.82 12.34 22.25 12.34s18.17-4.85 22.27-12.34Zm-56.1-42.85c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.223 0 2.426.071 3.603.21a11.507 11.507 0 0 0-5.913 10.06c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.58-.043-1.15-.126-1.708 3.297 3.63 5.256 8.152 5.256 13.048h8c0-16.33-15.18-29.61-33.84-29.61Zm82.06 0c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.225 0 2.431.072 3.611.211A11.507 11.507 0 0 0 184 116.86c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.576-.042-1.142-.124-1.695 3.29 3.627 5.244 8.145 5.244 13.035h8c0-16.33-15.18-29.61-33.84-29.61Z"
                        />
                    </svg>
                    <span class="drop-shadow-sm group-hover:drop-shadow-dark"
                        >Sign in with Lens</span
                    >
                </button>
            {/if}

            {#if isSigningIn}
                <div class="text-xs text-gray-500 dark:text-gray-400" transition:slide>
                    Awaiting wallet connection...
                </div>
            {/if}
        </div>
    </div>
</main>

{#if showWalletConnectDialog}
    <dialog
        id="walletConnectDialog"
        bind:this={walletConnectDialog}
        on:close={onWalletConnectDialogClose}
        class="w-2/3 max-w-md rounded-2xl border border-gray-200 p-0 shadow-2xl dark:border-gray-700
          dark:bg-gray-800"
    >
        <DialogOuter>
            <ConnectWalletDialog
                on:select={(e) => authenticate(e.detail)}
                on:dismiss={onWalletConnectDialogClose}
            />
        </DialogOuter>
    </dialog>
{/if}

{#if showAccountPickerDialog}
    <dialog
        id="accountPickerDialog"
        bind:this={accountPickerDialog}
        on:close={onAccountPickerClose}
        class="w-1/3 max-w-sm rounded-2xl border border-gray-200 p-0 shadow-2xl dark:border-gray-700
          dark:bg-gray-800"
    >
        <DialogOuter>
            <AccountChooser standalone={true} on:login={() => (isSigningIn = false)} />
        </DialogOuter>
    </dialog>
{/if}

<style>
    svg .svg-elem-1 {
        stroke-dashoffset: 1512.15771484375px;
        stroke-dasharray: 1512.15771484375px;
        fill: transparent;
        animation:
            dash 1s cubic-bezier(0.47, 0, 0.745, 0.715) 0.5s forwards,
            fill 0.7s cubic-bezier(0.47, 0, 0.745, 0.715) 1.3s forwards;
    }

    @keyframes dash {
        to {
            stroke-dashoffset: 0;
        }
    }

    @keyframes fill {
        to {
            fill: rgb(255, 96, 20);
        }
    }

    .glowing {
        position: relative;
        min-width: 700px;
        height: 550px;
        margin: -150px;
        transform-origin: right;
        animation: colorChange 15s linear infinite;
    }

    .glowing:nth-child(even) {
        transform-origin: left;
    }

    @keyframes colorChange {
        0% {
            filter: hue-rotate(0deg);
            transform: rotate(0deg);
        }
        100% {
            filter: hue-rotate(360deg);
            transform: rotate(360deg);
        }
    }

    .glowing span {
        position: absolute;
        top: calc(80px * var(--i));
        left: calc(80px * var(--i));
        bottom: calc(80px * var(--i));
        right: calc(80px * var(--i));
    }

    .glowing span::before {
        content: '';
        position: absolute;
        top: 50%;
        left: -8px;
        width: 15px;
        height: 15px;
        background: #f00;
        border-radius: 50%;
    }

    .glowing span:nth-child(3n + 1)::before {
        background: rgba(134, 255, 0, 1);
        box-shadow:
            0 0 20px rgba(134, 255, 0, 1),
            0 0 40px rgba(134, 255, 0, 1),
            0 0 60px rgba(134, 255, 0, 1),
            0 0 80px rgba(134, 255, 0, 1),
            0 0 0 8px rgba(134, 255, 0, 0.1);
    }

    .glowing span:nth-child(3n + 2)::before {
        background: rgba(255, 214, 0, 1);
        box-shadow:
            0 0 20px rgba(255, 214, 0, 1),
            0 0 40px rgba(255, 214, 0, 1),
            0 0 60px rgba(255, 214, 0, 1),
            0 0 80px rgba(255, 214, 0, 1),
            0 0 0 8px rgba(255, 214, 0, 0.1);
    }

    .glowing span:nth-child(3n + 3)::before {
        background: rgba(0, 226, 255, 1);
        box-shadow:
            0 0 20px rgba(0, 226, 255, 1),
            0 0 40px rgba(0, 226, 255, 1),
            0 0 60px rgba(0, 226, 255, 1),
            0 0 80px rgba(0, 226, 255, 1),
            0 0 0 8px rgba(0, 226, 255, 0.1);
    }

    .glowing span:nth-child(3n + 1) {
        animation: animate 30s alternate infinite;
    }

    .glowing span:nth-child(3n + 2) {
        animation: animate-reverse 9s alternate infinite;
    }

    .glowing span:nth-child(3n + 3) {
        animation: animate 24s alternate infinite;
    }

    @keyframes animate {
        0% {
            transform: rotate(180deg);
        }
        50% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes animate-reverse {
        0% {
            transform: rotate(360deg);
        }

        50% {
            transform: rotate(180deg);
        }
    }
</style>
