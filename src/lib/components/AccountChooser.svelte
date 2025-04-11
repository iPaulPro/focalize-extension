<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import { currentUser } from '../stores/user-store';
    import LoadingSpinner from './LoadingSpinner.svelte';
    import { onLogin } from '../user/user';
    import { truncateAddress } from '../utils/utils';
    import DarkModeSwitch from './DarkModeSwitch.svelte';
    import { darkMode } from '../stores/preferences-store';
    import { getManagedAccounts, isAuthenticated, login, switchAccounts } from '../lens-service';
    import type { AccountAvailable } from '@lens-protocol/client';
    import { getSigner } from '../evm/ethers-service';
    import { slide } from 'svelte/transition';
    import { getAccountAvatar } from '../utils/lens-utils.js';
    import { createEventDispatcher } from 'svelte';
    import { onError } from '@/lib/utils/error-utils';

    const dispatch = createEventDispatcher<any>();

    export let anchorNode: Node | undefined = undefined;
    export let showSettings = true;
    export let standalone = false;

    let avatarError: number[] = [];

    const launchOptions = async () => {
        // eslint-disable-next-line no-undef
        await browser.runtime.openOptionsPage();
    };

    const showLogoutDialog = () => {
        const event = new CustomEvent('logout');
        anchorNode?.dispatchEvent(event);
    };

    const onAccountSelected = async (accountAvailable: AccountAvailable) => {
        console.log('onAccountSelected: accountAvailable', accountAvailable);

        if (accountAvailable.account.address === $currentUser?.account) {
            window.open('/options.html?tab=account', '_blank');
            window.close();
            return;
        }

        const signer = await getSigner();

        const authenticated = await isAuthenticated();
        if (authenticated) {
            try {
                await switchAccounts(accountAvailable.account.address);
                await onLogin(signer.address, accountAvailable.account);
                dispatch('login');
                return;
            } catch (e) {
                console.error('Error switching accounts', e);
                if (e instanceof Error) {
                    onError(e);
                }
            }
        }

        const authenticatedAccount = await login(signer.address, accountAvailable);
        await onLogin(signer.address, authenticatedAccount);
        dispatch('login');
    };

    const getSortedAccounts = async (walletAddress: string): Promise<AccountAvailable[]> => {
        const accountsAvailable = await getManagedAccounts(walletAddress);
        // show the current account first, then sort first by username presence, then alphabetically
        return [...accountsAvailable].sort((a, b) => {
            if ($currentUser?.account === a.account.address) {
                return -1;
            } else if ($currentUser?.account === b.account.address) {
                return 1;
            }

            const hasUsernameA = a.account.username?.localName !== undefined;
            const hasUsernameB = b.account.username?.localName !== undefined;

            if (hasUsernameA !== hasUsernameB) {
                return hasUsernameA ? -1 : 1;
            }

            const nameA = a.account.username?.localName ?? a.account.address;
            const nameB = b.account.username?.localName ?? b.account.address;

            return nameA.localeCompare(nameB);
        });
    };

    const getWalletAddress = async () => {
        if ($currentUser?.address) {
            return $currentUser.address;
        }

        const signer = await getSigner();
        return signer.address;
    };
</script>

<div
    class="flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg
     {standalone
        ? 'dark:border-gray-700 dark:bg-gray-800'
        : 'dark:border-gray-600 dark:bg-gray-700'}"
>
    {#await getWalletAddress() then address}
        {#await getSortedAccounts(address)}
            <div class="flex h-16 w-32 items-center justify-center">
                <LoadingSpinner />
            </div>
        {:then accounts}
            {#if standalone}
                <div class="flex flex-col gap-1 px-5 pb-2 pt-5">
                    <div class="text-xl font-semibold">Select an account</div>
                    <div class="text-sm opacity-60">Choose a Lens account to sign in with.</div>
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
            {:else if accounts.length > 1}
                <div
                    class="flex cursor-default items-center gap-2 px-4 pt-3 text-gray-500 dark:text-gray-400"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        class="w-4"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M17 2.1l4 4-4 4" />
                        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
                    </svg>
                    <div class="text-xs font-semibold">Switch account</div>
                </div>
            {/if}

            <div class="overflow-y-auto py-1 {standalone ? 'max-h-96 px-1' : 'max-h-32'}" in:slide>
                {#each accounts as p, index (p.account.address)}
                    {@const avatarUrl = getAccountAvatar(p.account)}

                    <div
                        class="group m-1 flex min-w-[16rem] cursor-pointer items-center gap-3 rounded-xl p-2
                            hover:bg-orange-300 {standalone
                            ? 'dark:hover:bg-gray-900'
                            : 'dark:hover:bg-gray-800'}"
                        on:click={() => onAccountSelected(p)}
                    >
                        {#if !avatarUrl || avatarError[index]}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="w-8 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-300"
                            >
                                <path
                                    d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3"
                                />
                                <circle cx="12" cy="10" r="3" />
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        {:else}
                            <img
                                src={avatarUrl}
                                alt="Account avatar"
                                class="w-8 rounded-full object-cover"
                                on:error={() => {
                                    avatarError.push(index);
                                }}
                            />
                        {/if}

                        <div class="flex grow flex-col gap-0.5">
                            <div class="text-sm font-semibold text-black dark:text-white">
                                {p.account.metadata?.name ||
                                    p.account.username?.localName ||
                                    truncateAddress(p.account.address)}
                            </div>
                            <div class="text-xs text-gray-600 dark:text-gray-300">
                                {p.account.username
                                    ? `@${p.account.username.value}`
                                    : truncateAddress(p.account.address)}
                            </div>
                        </div>

                        {#if $currentUser?.username === p.account.username?.value && accounts.length > 1}
                            {#if p.account.address === $currentUser?.account}
                                <div
                                    class="h4 w-4"
                                    use:tippy={{ delay: 0, content: 'View account' }}
                                >
                                    <svg
                                        class="color-white h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <g fill="none" fill-rule="evenodd">
                                            <path
                                                d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5M15 3h6v6M10 14L20.2 3.8"
                                            />
                                        </g>
                                    </svg>
                                </div>
                            {/if}
                            <div class="mr-1 rounded-full bg-orange p-1.5 group-hover:hidden"></div>
                        {/if}
                    </div>
                {/each}
            </div>

            {#if !standalone}
                <div
                    on:click={() => {
                        $darkMode = !$darkMode;
                    }}
                    class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-600"
                >
                    <span class="text-black dark:text-white"> Dark mode </span>
                    <DarkModeSwitch />
                </div>

                <div class="border-t border-gray-200 p-1 dark:border-gray-600">
                    {#if showSettings}
                        <button
                            type="button"
                            class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5
                            hover:bg-orange-300 dark:hover:bg-gray-800"
                            on:click={launchOptions}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                class="mx-1.5 w-5 text-gray-600 dark:text-gray-200"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="3"></circle>
                                <path
                                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                                ></path>
                            </svg>
                            <span class="text-sm text-black dark:text-white">Settings</span>
                        </button>
                    {/if}

                    <button
                        type="button"
                        class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5
                        hover:bg-orange-300 dark:hover:bg-gray-800"
                        on:click={showLogoutDialog}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            class="mx-1.5 w-5 text-gray-600 dark:text-gray-200"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M16 17l5-5-5-5M19.8 12H9"
                            />
                        </svg>
                        <span class="text-sm text-black dark:text-white">Log out</span>
                    </button>
                </div>
            {/if}
        {/await}
    {/await}
</div>
