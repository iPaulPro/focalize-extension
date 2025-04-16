<script lang="ts">
    import { bigDecimal, type Erc20, type NativeToken } from '@lens-protocol/client';
    import { getErc20Balance, getNativeBalance, getSigner } from '@/lib/evm/ethers-service';
    import { createEventDispatcher, onMount } from 'svelte';
    import { depositGHO, wrapGHO } from '@/lib/lens-service';
    import { toast } from 'svelte-sonner';
    import { onError } from '@/lib/utils/error-utils';
    import { currentUser } from '@/lib/stores/user-store';
    import type { User } from '@/lib/types/User';

    const dispatch = createEventDispatcher<any>();

    export let asset: NativeToken | Erc20;

    $: isWrappedNative =
        asset.__typename === 'Erc20' && (asset.symbol === 'WGRASS' || asset.symbol === 'WGHO');

    enum FundingSource {
        WALLET,
        ACCOUNT,
    }

    let value: string = '';
    let fundingSource: FundingSource | undefined = undefined;
    let walletBalance: string | undefined = undefined;
    let accountBalance: string | undefined = undefined;
    let isDepositing: boolean = false;
    let isWrapping: boolean = false;

    const updateBalances = async (user: User) => {
        const signer = await getSigner();

        if (isWrappedNative) {
            walletBalance = await getNativeBalance(signer.address);
            if (user.account) {
                accountBalance = await getNativeBalance(user.account);
            }
        } else if (asset.__typename === 'Erc20') {
            walletBalance = await getErc20Balance(asset.contract.address, signer.address);
        } else if (asset.__typename === 'NativeToken') {
            walletBalance = await getNativeBalance(signer.address);
        }

        if (fundingSource === undefined) {
            if (Number(accountBalance) > 0) {
                fundingSource = FundingSource.ACCOUNT;
            } else if (Number(walletBalance) > 0) {
                fundingSource = FundingSource.WALLET;
            }
        }
    };

    const onSubmit = async () => {
        if (!value) {
            toast.error('Please enter a value');
            return;
        }

        if (fundingSource === FundingSource.WALLET && Number(value) > Number(walletBalance)) {
            toast.error('Not enough balance in wallet', { duration: 5000 });
            return;
        }

        if (fundingSource === FundingSource.ACCOUNT && Number(value) > Number(accountBalance)) {
            toast.error('Not enough balance in account', { duration: 5000 });
            return;
        }

        try {
            if (fundingSource === FundingSource.WALLET) {
                isDepositing = true;

                const nativeTx = await depositGHO(bigDecimal(value));
                console.log('onSubmit: deposited native tx', nativeTx);

                isDepositing = false;
                toast.success('Successfully deposited!', { duration: 5000 });
            }

            if (isWrappedNative) {
                isWrapping = true;

                const wrapTx = await wrapGHO(bigDecimal(value));
                console.log('onSubmit: wrapped tx', wrapTx);

                toast.success('Successfully wrapped!', { duration: 5000 });
            }

            dispatch('done');
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
        } finally {
            isDepositing = false;
            isWrapping = false;
        }
    };

    const getFormattedBalance = (balance: string | undefined) => {
        if (!balance) return '0.00';
        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(balance));
    };

    const onMaxClick = () => {
        value =
            (fundingSource === FundingSource.WALLET
                ? getFormattedBalance(walletBalance)
                : getFormattedBalance(accountBalance)) ?? '';
    };

    onMount(() => {
        const unsubscribe = currentUser.subscribe((user: User | null) => {
            if (user) updateBalances(user);
        });

        const interval = setInterval(() => {
            if ($currentUser) {
                updateBalances($currentUser);
            }
        }, 10_000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    });
</script>

<div class="flex flex-col p-5">
    <div class="py-2 text-base text-black dark:text-white">
        Add <span class="font-bold">{asset.name}</span> tokens to your Lens account
    </div>
    <div class="flex gap-2">
        <div class="relative flex-grow">
            <input
                type="number"
                bind:value
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-gray-200 p-2 px-8 py-2 text-base text-black dark:border-gray-700 dark:text-white"
                placeholder="0.00"
            />
            <div class="absolute left-2 top-1/2 -translate-y-1/2">
                <svg
                    class="h-5 w-5 opacity-70"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            </div>
        </div>
        {#if walletBalance || accountBalance}
            <button type="button" class="btn-secondary" on:click={onMaxClick}> Max </button>
        {/if}
    </div>
    <div
        role="radiogroup"
        class="mt-4 flex items-center gap-2 rounded-xl bg-gray-100 p-3 dark:bg-gray-700"
        aria-labelledby="funding-source"
    >
        <div id="funding-source" class="opacity-65">Balance available:</div>
        {#if Number(accountBalance) > 0}
            <label for="funding-account" class="flex items-center gap-1">
                <input
                    id="funding-account"
                    type="radio"
                    bind:group={fundingSource}
                    value={FundingSource.ACCOUNT}
                />
                <span class="opacity-65">Account: ${getFormattedBalance(accountBalance)}</span>
            </label>
        {/if}
        {#if Number(walletBalance) > 0}
            <label for="funding-wallet" class="flex items-center gap-1 pl-2">
                <input
                    id="funding-wallet"
                    type="radio"
                    bind:group={fundingSource}
                    value={FundingSource.WALLET}
                />
                <span class="opacity-65">Wallet: ${getFormattedBalance(walletBalance)}</span>
            </label>
        {/if}
    </div>
    <div class="flex justify-end pt-4">
        <button
            type="button"
            class="btn-primary"
            disabled={!value || Number(value) === 0}
            on:click={onSubmit}
        >
            {#if isDepositing || isWrapping}
                <svg
                    aria-hidden="true"
                    class="mr-3 inline h-4 w-4 animate-spin text-white"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="#E5E7EB"
                    />
                    <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentColor"
                    />
                </svg>
                <span>{isDepositing ? 'Depositing...' : 'Wrapping...'}</span>
            {:else}
                <span>Deposit</span>
            {/if}
        </button>
    </div>
</div>

<style>
    input,
    textarea,
    [contentEditable='true'] {
        &:focus {
            outline: solid var(--clr-accent);
            border: none;
            box-shadow: none;
        }
    }
</style>
