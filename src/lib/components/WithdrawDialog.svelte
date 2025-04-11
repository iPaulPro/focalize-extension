<script lang="ts">
    import { bigDecimal, type Erc20, type NativeToken } from '@lens-protocol/client';
    import { getErc20Balance, getNativeBalance } from '@/lib/evm/ethers-service';
    import { createEventDispatcher, onMount } from 'svelte';
    import { unwrapGHO, withdrawErc20, withdrawGHO } from '@/lib/lens-service';
    import { toast } from 'svelte-sonner';
    import { onError } from '@/lib/utils/error-utils';
    import { currentUser } from '@/lib/stores/user-store';
    import type { User } from '@/lib/types/User';
    import { tippy } from 'svelte-tippy';

    const dispatch = createEventDispatcher<any>();

    export let asset: NativeToken | Erc20;

    $: isWrappedNative =
        asset.__typename === 'Erc20' && (asset.symbol === 'WGRASS' || asset.symbol === 'WGHO');

    let value: string = '';
    let accountBalance: string | undefined = undefined;
    let isWithdrawing: boolean = false;
    let isUnwrapping: boolean = false;
    let unwrap: boolean = true;

    const updateBalance = async (user: User) => {
        if (!user.account) return;

        if (asset.__typename === 'Erc20') {
            accountBalance = await getErc20Balance(asset.contract.address, user.account);
        } else {
            accountBalance = await getNativeBalance(user.account);
        }
    };

    const onSubmit = async () => {
        if (!value) {
            toast.error('Please enter a value');
            return;
        }

        if (Number(value) > Number(accountBalance)) {
            toast.error('Not enough balance in account', { duration: 5000 });
            return;
        }

        try {
            if (isWrappedNative && unwrap) {
                isUnwrapping = true;

                const unwrapTx = await unwrapGHO(bigDecimal(value));
                console.log('onSubmit: unwrap tx', unwrapTx);

                isUnwrapping = false;
                toast.success('Successfully unwrapped!', { duration: 5000 });
            }

            isWithdrawing = true;

            if (asset.__typename === 'Erc20') {
                const withdrawTx = await withdrawErc20(asset.contract.address, bigDecimal(value));
                console.log('onSubmit: withdraw tx', withdrawTx);
                toast.success('Successfully withdrew!', { duration: 5000 });
            } else {
                const withdrawTx = await withdrawGHO(bigDecimal(value));
                console.log('onSubmit: withdraw tx', withdrawTx);
                toast.success('Successfully withdrew!', { duration: 5000 });
            }

            dispatch('done');
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
        } finally {
            isWithdrawing = false;
            isUnwrapping = false;
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
        value = getFormattedBalance(accountBalance) ?? '';
    };

    onMount(() => {
        const unsubscribe = currentUser.subscribe((user: User | null) => {
            if (user) updateBalance(user);
        });

        const interval = setInterval(() => {
            if ($currentUser) {
                updateBalance($currentUser);
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
        Withdraw <span class="font-bold">{asset.name}</span> tokens from your Lens account
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
        {#if accountBalance}
            <button type="button" class="btn-secondary" on:click={onMaxClick}> Max </button>
        {/if}
    </div>
    {#if accountBalance}
        <div class="px-2 pt-2 opacity-65">
            <span class="text-sm">
                Account balance: ${getFormattedBalance(accountBalance)}
                {asset.symbol}
            </span>
        </div>
    {/if}
    {#if isWrappedNative}
        <div class="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 p-3 dark:bg-gray-700">
            <label for="unwrap" class="flex items-center gap-1.5">
                <input id="unwrap" type="checkbox" bind:checked={unwrap} class="ml-2" />
                <span class="opacity-65">Unwrap and withdraw</span>
            </label>
            <div
                class="h-4 w-4"
                use:tippy={{
                    content: 'If unchecked the wrapped token with be withdrawn',
                    appendTo: 'parent',
                }}
            >
                <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </div>
        </div>
    {/if}
    <div class="flex justify-end pt-4">
        <button
            type="button"
            class="btn-primary"
            disabled={!value || Number(value) === 0}
            on:click={onSubmit}
        >
            {#if isWithdrawing || isUnwrapping}
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
                <span>{isWithdrawing ? 'Withdrawing...' : 'Unwrapping...'}</span>
            {:else}
                <span>Withdraw</span>
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
