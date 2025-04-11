<script lang="ts">
    import EditAccountForm from '@/lib/components/EditAccountForm.svelte';
    import {
        type Erc20,
        type Erc20Amount,
        type NativeAmount,
        type NativeToken,
    } from '@lens-protocol/client';
    import { getBalances } from '@/lib/lens-service';
    import { currentUser } from '@/lib/stores/user-store';
    import { onMount, tick } from 'svelte';
    import type { User } from '@/lib/types/User';
    import { tippy } from 'svelte-tippy';
    import GhoIcon from '/images/ic_gho.webp';
    import DepositDialog from '@/lib/components/DepositDialog.svelte';
    import DialogOuter from '@/lib/components/DialogOuter.svelte';
    import WithdrawDialog from '@/lib/components/WithdrawDialog.svelte';

    type Amount = NativeAmount | Erc20Amount;
    let accountBalances: Amount[] = [];

    let depositingAsset: NativeToken | Erc20 | undefined;
    let depositDialog: HTMLDialogElement;
    let withdrawingAsset: NativeToken | Erc20 | undefined;
    let withdrawDialog: HTMLDialogElement;

    const fetchBalances = async (user: User) => {
        if (user?.account) {
            try {
                const balances = await getBalances();
                accountBalances = balances.filter(
                    (balance) =>
                        balance.__typename === 'NativeAmount' ||
                        balance.__typename === 'Erc20Amount',
                );
            } catch {
                // ignore
            }
        }
    };

    onMount(() => {
        const unsubscribe = currentUser.subscribe((user: User | null) => {
            if (user) fetchBalances(user);
        });

        const interval = setInterval(() => {
            if ($currentUser) fetchBalances($currentUser);
        }, 15_000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    });
</script>

<div class="h-screen overflow-auto px-4 pb-24 pt-6 md:px-8">
    <div class="flex max-w-screen-lg flex-col justify-between md:flex-row">
        <div class="flex flex-col justify-center">
            <h1 class="text-2xl font-semibold tracking-tight text-neutral-800 dark:text-white">
                Account settings
            </h1>

            <h2 class="pt-2 text-lg text-neutral-400">
                Manage your account metadata and token balances
            </h2>
        </div>
        <div class="flex flex-col pt-2 md:pt-0">
            <span class="flex items-center gap-2 pr-1 text-base md:justify-end">
                <svg
                    class="inline h-4 w-4 text-gray-800 dark:text-gray-200"
                    viewBox="0 0 512 512"
                    fill="currentColor"
                >
                    <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
                    <path
                        d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L80 128c-8.8 0-16-7.2-16-16s7.2-16 16-16l368 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 32zM416 272a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
                    />
                </svg>
                Balances
            </span>
            <div class="flex flex-col gap-2 pt-2">
                {#each accountBalances as balance (balance.asset.symbol)}
                    <div
                        class="flex justify-between gap-3 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700"
                    >
                        <div class="flex items-center gap-2">
                            <img src={GhoIcon} alt="GHO" class="h-4 w-4" />
                            <span class="text-sm font-bold text-gray-800 dark:text-gray-200">
                                ${new Intl.NumberFormat(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                }).format(balance.value)}
                            </span>
                        </div>
                        <div class="flex items-center justify-end gap-2">
                            <span class="text-sm text-gray-600 dark:text-gray-400">
                                {balance.asset.symbol}
                            </span>
                            <button
                                type="button"
                                class="opacity-65 enabled:hover:opacity-100 disabled:opacity-40"
                                use:tippy={{ content: `Deposit ${balance.asset.name}` }}
                                on:click={async () => {
                                    depositingAsset = balance.asset;
                                    await tick();
                                    depositDialog.showModal();
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
                                    <line x1="12" y1="8" x2="12" y2="16" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                class="opacity-65 enabled:hover:opacity-100 disabled:opacity-40"
                                disabled={Number(balance.value) === 0}
                                use:tippy={{ content: `Withdraw ${balance.asset.name}` }}
                                on:click={async () => {
                                    withdrawingAsset = balance.asset;
                                    await tick();
                                    withdrawDialog.showModal();
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
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <div class="w-full border-b border-b-gray-200 py-3 dark:border-b-gray-700 md:py-6"></div>

    <section class="flex w-full flex-col py-6 md:pb-0 md:pt-10">
        <EditAccountForm />
    </section>

    {#if depositingAsset}
        <dialog
            id="depositDialog"
            bind:this={depositDialog}
            on:close={() => {
                depositingAsset = undefined;
            }}
            class="max-h-screen w-1/3 max-w-lg overflow-hidden rounded-2xl border border-gray-200 p-0
            shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        >
            <DialogOuter title={`Deposit $${depositingAsset.symbol}`}>
                <DepositDialog
                    asset={depositingAsset}
                    on:done={() => {
                        depositDialog.close();
                        if ($currentUser) {
                            fetchBalances($currentUser);
                        }
                    }}
                />
            </DialogOuter>
        </dialog>
    {/if}

    {#if withdrawingAsset}
        <dialog
            id="withdrawDialog"
            bind:this={withdrawDialog}
            on:close={() => {
                withdrawingAsset = undefined;
            }}
            class="max-h-screen w-1/3 max-w-lg overflow-hidden rounded-2xl border border-gray-200 p-0
            shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        >
            <DialogOuter title={`Withdraw $${withdrawingAsset.symbol}`}>
                <WithdrawDialog
                    asset={withdrawingAsset}
                    on:done={() => {
                        withdrawDialog.close();
                        if ($currentUser) {
                            fetchBalances($currentUser);
                        }
                    }}
                />
            </DialogOuter>
        </dialog>
    {/if}
</div>
