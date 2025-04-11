<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import { fade, slide } from 'svelte/transition';
    import { z } from 'zod';
    import { DateTime } from 'luxon';
    import { toast } from 'svelte-sonner';
    import type { Account, DateTime as LensDateTime } from '@lens-protocol/client';

    import { currentUser } from '@/lib/stores/user-store';
    import { COLLECT_DURATION_ITEMS } from '@/lib/lens/lens-modules';
    import CollectSettingsSwitch from './CollectSettingsSwitch.svelte';
    import { collectSettings, type Recipient } from '@/lib/stores/state-store';
    import { formatCryptoValue, getAvatarFromAddress, truncateAddress } from '@/lib/utils/utils';
    import CollectFeeSplitInput from './CollectFeeSplitInput.svelte';
    import CollectRecipientInput from './CollectRecipientInput.svelte';
    import LoadingSpinner from '@/lib/components/LoadingSpinner.svelte';
    import { getAccountAvatar } from '@/lib/utils/lens-utils';
    import { SUPPORTED_CURRENCIES } from '@/lib/utils/supported-currencies';
    import { CURRENT_CHAIN_ID } from '@/lib/config';
    import { getAccount } from '@/lib/lens-service';

    export let isCompact: boolean = false;

    const dispatch = createEventDispatcher<any>();

    const currencies = SUPPORTED_CURRENCIES.filter(
        (c) => c.contract.chainId === Number(CURRENT_CHAIN_ID),
    );

    let contentDiv: HTMLDivElement;
    let priceInput: HTMLInputElement;
    let isPaid: Writable<boolean> = writable();
    let isLimited: Writable<boolean> = writable();
    let hasReferralFee: Writable<boolean> = writable();
    let splitRevenue: Writable<boolean> = writable();
    let addingRecipient: boolean = false;
    let splitEvenly: boolean = true;
    let endDateValue: string | null;
    let endTimeValue: string | null;

    const priceSchema = z
        .number({
            required_error: 'Price is not set',
            invalid_type_error: 'Price must be a number',
        })
        .positive('Price must be greater than zero');

    const referralSchema = z
        .number({
            required_error: 'Referral rate not set',
            invalid_type_error: 'Referral must be a number',
        })
        .positive('Referral must be greater than zero')
        .lte(100, 'Referral must be less than or equal to 100%');

    const limitSchema = z
        .number({
            required_error: 'Limit is not set',
            invalid_type_error: 'Limit must be a number',
        })
        .positive('Limit must be greater than zero');

    const timeSchema = z
        .date({
            required_error: 'Date is not set',
            invalid_type_error: 'Date must be a valid date',
        })
        .min(new Date(), 'End time must be in the future');

    let selectedTokenSymbol: string;

    let priceError: string | null = null;
    let limitError: string | null = null;
    let referralError: string | null = null;
    let splitError: string | null = null;
    let timeError: string | null = null;

    let currentUserAccount: Account | null = null;

    const validatePrice = (price: number | undefined): number | undefined | null => {
        try {
            priceSchema.parse(price);
            priceError = null;
            return price;
        } catch (e) {
            if (e instanceof z.ZodError) {
                priceError = e.issues?.[0]?.message ?? 'Invalid number';
            }
        }
        return null;
    };

    const onPriceValueChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        const price = validatePrice(Number(value));
        if (price && !$collectSettings.token) {
            $collectSettings.token = currencies.find((c) => c.symbol === selectedTokenSymbol);
        }
    };

    const validateReferral = (referral: number | undefined): number | undefined | null => {
        try {
            referralSchema.parse(referral);
            referralError = null;
            return referral;
        } catch (e) {
            if (e instanceof z.ZodError) {
                referralError = e.issues?.[0]?.message ?? 'Invalid number';
            }
        }
        return null;
    };

    const onReferralValueChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        validateReferral(Number(value));
    };

    const validateLimit = (limit: number | undefined): number | undefined | null => {
        try {
            limitSchema.parse(limit);
            limitError = null;
            return limit;
        } catch (e) {
            if (e instanceof z.ZodError) {
                limitError = e.issues?.[0]?.message ?? 'Invalid number';
            }
        }
        return null;
    };

    const validateTime = (isoTime: string): LensDateTime | undefined => {
        try {
            const date = new Date(isoTime);
            timeSchema.parse(date);
            timeError = null;
            return isoTime as LensDateTime;
        } catch (e) {
            if (e instanceof z.ZodError) {
                timeError = e.issues?.[0]?.message ?? 'Invalid date';
            }
        }
        return undefined;
    };

    const onDoneClick = async () => {
        dispatch('done');
    };

    const addRecipient = (recipient: Recipient) => {
        console.log('addRecipient', recipient, $collectSettings.recipients);

        const addressExisting = $collectSettings.recipients?.find(
            (r) => r.address === recipient.address,
        );
        if (addressExisting) {
            toast.error('Address already in recipient list', { duration: 5000 });
            return;
        }

        if (!$collectSettings.recipients) {
            $collectSettings.recipients = [];
        }
        $collectSettings.recipients.push(recipient);
        $collectSettings = { ...$collectSettings };
        addingRecipient = false;
        console.log('addRecipient: recipients updated', $collectSettings.recipients);
    };

    const removeRecipient = (recipient: Recipient) => {
        console.log('removeRecipient: recipient', recipient);
        $collectSettings.recipients = $collectSettings.recipients?.filter(
            (r) => r.address !== recipient.address,
        );
        console.log('removeRecipient: recipients updated', $collectSettings.recipients);
    };

    const ensureEvenSplit = () => {
        if (!$collectSettings.recipients?.length) return;

        const numRecipients = $collectSettings.recipients.length;
        const splitAmount = Math.floor(100 / numRecipients);
        const remainder = 100 - splitAmount * numRecipients;

        $collectSettings.recipients = $collectSettings.recipients.map((recipient, index) => ({
            ...recipient,
            split: index === 0 ? splitAmount + remainder : splitAmount,
        }));
    };

    $: if (splitEvenly && $collectSettings.recipients?.length) {
        ensureEvenSplit();
    } else if (!splitEvenly && $collectSettings.recipients?.length === 1) {
        splitEvenly = true;
        ensureEvenSplit();
    }

    $: if ($isPaid === false) {
        $collectSettings.price = undefined;
        $collectSettings.referralFee = undefined;
        $collectSettings.recipients = undefined;
        $hasReferralFee = false;
        $splitRevenue = false;
        priceError = null;
    } else {
        validatePrice($collectSettings.price);
    }

    $: if ($hasReferralFee === false) {
        $collectSettings.referralFee = undefined;
        referralError = null;
    } else {
        validateReferral($collectSettings.referralFee);
    }

    $: if ($isLimited === false) {
        $collectSettings.limit = undefined;
        limitError = null;
    } else {
        validateLimit($collectSettings.limit);
    }

    $: if ($currentUser) {
        getAccount({ address: $currentUser.account }).then((account) => {
            // eslint-disable-next-line svelte/infinite-reactive-loop
            currentUserAccount = account;
        });
    }

    $: if ($splitRevenue === false) {
        $collectSettings.recipients = undefined;
        splitError = null;
    } else if ($splitRevenue) {
        if ($currentUser && !$collectSettings.recipients) {
            $collectSettings.recipients = [
                {
                    address: $currentUser.account ?? $currentUser.address,
                    split: 100,
                    identity: {
                        lens: currentUserAccount ?? undefined,
                    },
                } satisfies Recipient,
            ];
        }
    }

    $: if ($collectSettings.timed && $collectSettings.durationInHours === undefined) {
        $collectSettings.durationInHours = 24;
    } else if ($collectSettings.timed === false) {
        timeError = null;
        $collectSettings.durationInHours = undefined;
        $collectSettings.endDate = undefined;
    } else if ($collectSettings.durationInHours === 0 && endDateValue && endTimeValue) {
        const iso = `${endDateValue}T${endTimeValue}`;
        const dateTime = DateTime.fromISO(iso).toISO() ?? new Date().toISOString(); // add timezone offset
        $collectSettings.endDate = validateTime(dateTime);
    } else if ($collectSettings.durationInHours && $collectSettings.durationInHours > 0) {
        timeError = null;
    }

    $: if ($collectSettings.recipients) {
        const total =
            $collectSettings.recipients
                ?.filter((recipient: Recipient) => recipient.split)
                .reduce((acc: number, recipient: Recipient) => acc + recipient.split, 0) ?? 0;
        splitError = total !== 100 ? `Revenue shares must add up to 100%` : null;
    }

    $: if (priceInput && $isPaid && $collectSettings.price === undefined) {
        tick().then(() => priceInput?.focus());
    }

    $: recipientsAtCapacity = $collectSettings.recipients?.length === 4;

    $: if (currencies.length) {
        $collectSettings.token = currencies.find((c) => c.symbol === selectedTokenSymbol);
    }

    onMount(async () => {
        $isPaid = $collectSettings.price !== undefined;
        $isLimited = $collectSettings.limit !== undefined;
        $hasReferralFee = $collectSettings.referralFee !== undefined;
        $splitRevenue = $collectSettings.recipients?.length !== undefined;

        console.log('onMount', $collectSettings);
        if ($collectSettings.endDate) {
            const endDate = DateTime.fromISO($collectSettings.endDate);
            endDateValue = endDate.toISODate();
            endTimeValue = endDate.toISOTime({ includeOffset: false, suppressMilliseconds: true });
            console.log('onMount: endDateValue', endDateValue, 'endTimeValue', endTimeValue);
        }

        if ($collectSettings.token) {
            selectedTokenSymbol = $collectSettings.token.symbol;
        }
    });
</script>

{#if !$currentUser}
    <div class="flex h-full items-center justify-center">
        <LoadingSpinner />
    </div>
{:else}
    <div bind:this={contentDiv} class="grow overflow-y-auto">
        <div class="p-5">
            <div class="pb-4 text-sm opacity-80">
                Turn your post into a digital collectible that can be sold as an NFT on Polygon.
            </div>

            <CollectSettingsSwitch settingsKey="isCollectible" id="collectibleToggle">
                <div slot="icon" class="h-full w-full">
                    <svg
                        class="h-full w-full"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path
                            d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 1 1-8 0"
                        />
                    </svg>
                </div>
                <div slot="label">Make post collectible</div>
            </CollectSettingsSwitch>

            {#if $collectSettings.isCollectible}
                <div class="pl-4 pt-1" in:fade>
                    <div id="amount" class="flex items-center justify-between gap-2">
                        <CollectSettingsSwitch setting={isPaid} id="collectPriceToggle">
                            <div slot="icon" class="h-full w-full">
                                <svg
                                    class="h-full w-full rounded-full border border-black p-0.5 dark:border-white"
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
                            <div slot="label">Paid collection</div>
                        </CollectSettingsSwitch>

                        {#if priceError}
                            <div
                                class="h-5 w-5"
                                use:tippy={{ content: priceError, appendTo: 'parent' }}
                            >
                                <svg
                                    class="h-5 w-5 cursor-help text-red-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                        {/if}

                        <div class="relative rounded-lg" class:hidden={!$isPaid}>
                            <div
                                class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
                            >
                                <span class="text-gray-500 sm:text-sm">$</span>
                            </div>

                            <input
                                type="number"
                                name="price"
                                id="price"
                                autocomplete="off"
                                placeholder="0.00"
                                min="0"
                                bind:this={priceInput}
                                bind:value={$collectSettings.price}
                                on:change={onPriceValueChange}
                                class="block block w-48 w-48 rounded-xl rounded-xl border
                                   px-4 py-2 pl-7 pl-7 pr-24 pr-24 text-center text-center text-base
                                   text-base font-medium text-gray-900 focus:border-orange-500 focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-800 dark:bg-gray-800 dark:text-gray-100
                                   {priceError
                                    ? 'border-red-600'
                                    : 'border-gray-300 dark:border-gray-600'}"
                            />

                            <div class="absolute inset-y-0 right-0 flex items-center">
                                <label for="currency" class="sr-only"> Currency </label>

                                {#if !currencies}
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
                                {:else}
                                    <select
                                        id="Currency"
                                        name="currency"
                                        bind:value={selectedTokenSymbol}
                                        class="h-full max-w-[6rem] cursor-pointer rounded-r-xl border-b border-r border-t
                                            border-gray-300 border-transparent bg-transparent px-4 py-2 pl-2
                                            pr-7 text-gray-500 focus:border-orange-500 focus:ring-orange-500 dark:text-gray-300 sm:text-sm"
                                    >
                                        {#each currencies as token (token.contract.address)}
                                            <option value={token.symbol}>
                                                {token.symbol}
                                            </option>
                                        {/each}
                                    </select>
                                {/if}
                            </div>
                        </div>
                    </div>
                    <!-- #amount -->

                    {#if $isPaid}
                        <div
                            id="recipients"
                            class="flex flex-col justify-center gap-3 pl-4"
                            in:slide
                        >
                            <div class="flex flex-col gap-2">
                                <CollectSettingsSwitch
                                    setting={splitRevenue}
                                    id="splitRevenueToggle"
                                >
                                    <div slot="icon" class="h-full w-full">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            class="h-full w-full"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        >
                                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                                            <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                                        </svg>
                                    </div>
                                    <div slot="label">
                                        <div class="flex items-center">
                                            <span>Share revenue</span>
                                            {#if splitError && $splitRevenue && !$collectSettings.recipients?.length}
                                                <div
                                                    class="ml-2 h-5 w-5"
                                                    use:tippy={{
                                                        content: splitError,
                                                        appendTo: 'parent',
                                                    }}
                                                >
                                                    <svg
                                                        class="h-5 w-5 flex-none cursor-help text-red-600"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                    >
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                                        <line x1="12" y1="16" x2="12.01" y2="16"
                                                        ></line>
                                                    </svg>
                                                </div>
                                            {:else}
                                                <div
                                                    class="ml-1 h-4 w-4"
                                                    use:tippy={{
                                                        content:
                                                            'Share revenue with others from the initial sale',
                                                        appendTo: 'parent',
                                                    }}
                                                >
                                                    <svg
                                                        class="inline h-4 w-4 cursor-help p-[0.075rem] opacity-60"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                    >
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <path
                                                            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                                                        ></path>
                                                        <line x1="12" y1="17" x2="12.01" y2="17"
                                                        ></line>
                                                    </svg>
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </CollectSettingsSwitch>

                                {#if $splitRevenue}
                                    <div class="flex flex-col gap-1.5 pl-6" transition:slide>
                                        {#if $collectSettings.recipients}
                                            {#each $collectSettings.recipients as recipient, index (recipient.address)}
                                                {@const avatarUrl = recipient.identity?.lens
                                                    ? getAccountAvatar(recipient.identity.lens)
                                                    : getAvatarFromAddress(recipient.address)}

                                                <div class="flex items-center gap-2">
                                                    <div class="flex grow items-center gap-3">
                                                        <img
                                                            loading="lazy"
                                                            decoding="async"
                                                            src={avatarUrl}
                                                            alt="avatar"
                                                            class="aspect-square w-7 rounded-full bg-gray-300
                                                             object-cover text-white hover:opacity-80"
                                                        />

                                                        <div class="flex flex-col">
                                                            <div
                                                                class="text-base"
                                                                use:tippy={{
                                                                    content: recipient.address,
                                                                    appendTo: 'parent',
                                                                }}
                                                            >
                                                                {(recipient.identity?.lens
                                                                    ?.username &&
                                                                    `@${recipient.identity.lens.username.localName}`) ??
                                                                    recipient.identity?.ens ??
                                                                    truncateAddress(
                                                                        recipient.address,
                                                                    )}
                                                            </div>
                                                            {#if $collectSettings.price && recipient.split && $collectSettings.token}
                                                                <div
                                                                    class="text-xs text-gray-500 dark:text-gray-400"
                                                                >
                                                                    {formatCryptoValue(
                                                                        $collectSettings.price *
                                                                            (recipient.split / 100),
                                                                    )}
                                                                    ${$collectSettings.token.symbol}
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    </div>

                                                    <CollectFeeSplitInput
                                                        {recipient}
                                                        {splitEvenly}
                                                        autoUpdate={index === 0 &&
                                                            recipient.address ===
                                                                $currentUser.address}
                                                    />

                                                    <button
                                                        type="button"
                                                        class="group rounded-full p-1 hover:bg-gray-300 dark:hover:bg-gray-500"
                                                        on:click={() => removeRecipient(recipient)}
                                                        class:hidden={$collectSettings.recipients
                                                            .length === 1}
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            stroke-width="2"
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            class="h-4 w-4 opacity-60 transition-none group-hover:opacity-100"
                                                        >
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line x1="8" y1="12" x2="16" y2="12"
                                                            ></line>
                                                        </svg>
                                                    </button>
                                                </div>
                                            {/each}
                                        {/if}

                                        {#if addingRecipient}
                                            <div class="flex pr-8">
                                                {#if contentDiv.parentElement}
                                                    <CollectRecipientInput
                                                        menuContainer={contentDiv.parentElement}
                                                        on:recipient={(e) => addRecipient(e.detail)}
                                                        on:cancel={() => (addingRecipient = false)}
                                                    />
                                                {/if}
                                            </div>
                                        {/if}

                                        <div
                                            class="flex {recipientsAtCapacity
                                                ? 'justify-end'
                                                : 'justify-between'} pb-3 pr-8 pt-2"
                                            class:hidden={addingRecipient}
                                        >
                                            <button
                                                type="button"
                                                on:click={() => (addingRecipient = true)}
                                                class:hidden={recipientsAtCapacity}
                                                class="group flex items-center gap-1 rounded-lg border border-gray-200
                                                    px-2 py-1 font-semibold hover:border-orange dark:border-gray-500 dark:hover:border-orange-300"
                                            >
                                                <svg
                                                    class="inline h-3 w-3"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                >
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                                <span class="opacity-80 group-hover:opacity-100"
                                                    >Add recipient</span
                                                >
                                            </button>

                                            {#if $collectSettings.recipients?.length && $collectSettings.recipients?.length > 1}
                                                <button
                                                    type="button"
                                                    on:click={() => (splitEvenly = !splitEvenly)}
                                                    class="group flex items-center gap-1 rounded-lg
                                                        px-2 py-1 font-semibold hover:border-orange dark:hover:border-orange-300
                                                        {splitEvenly
                                                        ? 'bg-orange-600 text-white dark:bg-orange-700'
                                                        : 'border border-gray-200 dark:border-gray-500'}"
                                                >
                                                    <svg
                                                        viewBox="0 -960 960 960"
                                                        fill="currentColor"
                                                        class="inline h-3 w-3"
                                                    >
                                                        <path
                                                            d="m664-240-99-98q-12-12-12-28.5t12-28.5q12-12 29-12t29 12l97 99v-64q0-17 11.5-28.5T760-400q17 0 28.5 11.5T800-360v160q0 17-11.5 28.5T760-160H600q-17 0-28.5-11.5T560-200q0-17 11.5-28.5T600-240h64ZM464-520l200-200h-64q-17 0-28.5-11.5T560-760q0-17 11.5-28.5T600-800h160q17 0 28.5 11.5T800-760v160q0 17-11.5 28.5T760-560q-17 0-28.5-11.5T720-600v-64L519-463q-11 11-25.5 17t-30.5 6H200q-17 0-28.5-11.5T160-480q0-17 11.5-28.5T200-520h264Z"
                                                        />
                                                    </svg>
                                                    <span
                                                        class="{splitEvenly
                                                            ? 'opacity-100'
                                                            : 'opacity-80'} group-hover:opacity-100"
                                                    >
                                                        Split evenly
                                                    </span>
                                                </button>
                                            {:else}
                                                <div></div>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                        <!-- #recipients -->

                        <div id="referralFee" class="flex items-center gap-4 pl-4" in:slide>
                            <CollectSettingsSwitch setting={hasReferralFee} id="referralFeeToggle">
                                <div slot="icon" class="h-full w-full">
                                    <svg
                                        viewBox="0 0 24 24"
                                        class="h-full w-full"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path d="M17 2.1l4 4-4 4" />
                                        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                                        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
                                    </svg>
                                </div>
                                <div slot="label">
                                    <div class="flex items-center">
                                        <span>Referral reward</span>
                                        <div
                                            class="ml-1 h-4 w-4"
                                            use:tippy={{
                                                content:
                                                    'Referrals are paid when someone buys your NFT via a repost',
                                                appendTo: 'parent',
                                            }}
                                        >
                                            <svg
                                                class="inline h-4 w-4 cursor-help p-[0.075rem] opacity-60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                                                ></path>
                                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </CollectSettingsSwitch>

                            {#if referralError}
                                <div
                                    class="h-5 w-5"
                                    use:tippy={{
                                        content: referralError,
                                        appendTo: 'parent',
                                    }}
                                >
                                    <svg
                                        class="h-5 w-5 cursor-help text-red-600"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                </div>
                            {/if}

                            <div class="relative rounded-lg" class:hidden={!$hasReferralFee}>
                                <input
                                    type="number"
                                    id="referralFeeInput"
                                    placeholder="5"
                                    autocomplete="off"
                                    min="0"
                                    max="100"
                                    bind:value={$collectSettings.referralFee}
                                    on:change={onReferralValueChange}
                                    class="w-20 rounded-xl border text-center
                                       text-base font-medium text-gray-900 focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100
                                       {referralError
                                        ? 'border-red-600'
                                        : 'border-gray-300 dark:border-gray-600'}"
                                />
                                <div
                                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                                >
                                    %
                                </div>
                            </div>
                        </div>
                        <!-- #referralFee -->
                    {/if}

                    <div id="collectLimit" class="flex items-center gap-4" in:slide>
                        <CollectSettingsSwitch setting={isLimited} id="collectLimitToggle">
                            <div slot="icon" class="h-full w-full">
                                <svg
                                    class="h-full w-full"
                                    viewBox="0 -960 960 960"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M450-80v-195L301-126l-43-42 192-192v-90h-90L172-262l-44-41 147-147H80v-60h195L125-660l43-43 192 193h90v-91L262-789l42-44 146 147v-194h60v194l150-150 42 43-192 192v91h91l189-189 43 42-147 147h194v60H686l148 149-41 43-192-192h-91v90l192 193-41 43-151-151v195h-60Z"
                                    />
                                </svg>
                            </div>
                            <div slot="label">Limited edition</div>
                        </CollectSettingsSwitch>

                        {#if limitError}
                            <div
                                class="h-5 w-5"
                                use:tippy={{
                                    content: limitError,
                                    appendTo: 'parent',
                                }}
                            >
                                <svg
                                    class="h-5 w-5 cursor-help text-red-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                        {/if}

                        {#if $isLimited}
                            <input
                                type="number"
                                id="collectLimitInput"
                                placeholder="1"
                                autocomplete="off"
                                min="0"
                                bind:value={$collectSettings.limit}
                                class="w-20 rounded-xl text-center text-base font-medium text-gray-900
                     focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100
                     {limitError ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}"
                            />
                        {/if}
                    </div>
                    <!-- #collectLimit -->

                    <div id="timed" class="flex items-center justify-between gap-6" in:slide>
                        <CollectSettingsSwitch settingsKey="timed" id="collectTimedToggle">
                            <div slot="icon" class="h-full w-full">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    class="h-full w-full"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div slot="label">Limited time</div>
                        </CollectSettingsSwitch>

                        {#if $collectSettings.timed}
                            <div class="flex items-center gap-2">
                                {#if timeError}
                                    <div
                                        class="h-5 w-5"
                                        use:tippy={{ content: timeError, appendTo: 'parent' }}
                                    >
                                        <svg
                                            class="h-5 w-5 cursor-help text-red-600"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        >
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </div>
                                {/if}

                                <select
                                    id="timedType"
                                    bind:value={$collectSettings.durationInHours}
                                    class="cursor-pointer rounded-xl text-center text-base
                        font-medium text-gray-900 focus:border-orange-500 focus:ring-orange-500
                        dark:bg-gray-800 dark:text-gray-100
                        {timeError ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}"
                                >
                                    {#each COLLECT_DURATION_ITEMS as item (item.label)}
                                        <option value={item.value}>{item.label}</option>
                                    {/each}
                                </select>
                            </div>
                        {/if}
                    </div>
                    <!-- #timed -->

                    {#if $collectSettings.durationInHours === 0}
                        <div
                            class="flex items-center justify-end gap-2 pb-2 pt-0.5"
                            transition:slide
                        >
                            <div class="opacity-60">Sale ends</div>

                            <label class="text-gray-700" for="date">
                                <input
                                    id="date"
                                    type="date"
                                    bind:value={endDateValue}
                                    class="appearance-none rounded-xl border border-gray-300 px-3 py-2
                       text-[0.925rem] font-semibold text-gray-900 placeholder-gray-400
                       focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                />
                            </label>

                            <label class="text-gray-700" for="time">
                                <input
                                    id="time"
                                    type="time"
                                    step="60"
                                    bind:value={endTimeValue}
                                    class="appearance-none rounded-xl border border-gray-300 px-3 py-2 text-[0.925rem]
                       font-semibold text-gray-900 placeholder-gray-400
                       focus:border-orange-500 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                />
                            </label>
                        </div>
                    {/if}

                    <div id="follower-only" class="flex items-center gap-6">
                        <CollectSettingsSwitch settingsKey="followerOnly" id="followerOnlyToggle">
                            <div slot="icon" class="h-full w-full">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    class="h-full w-full"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div slot="label">Followers only</div>
                        </CollectSettingsSwitch>
                    </div>
                    <!-- #follower-only -->
                </div>
            {/if}
        </div>
    </div>

    <div
        class="flex flex-none items-center justify-end {isCompact
            ? 'p-2'
            : 'p-3'} border-t border-gray-200 dark:border-gray-700"
    >
        <button
            type="button"
            on:click={onDoneClick}
            disabled={priceError !== null ||
                referralError !== null ||
                limitError !== null ||
                splitError !== null ||
                timeError !== null}
            class="flex w-auto items-center justify-center rounded-full bg-orange-500
                px-8 py-1.5 text-center
                text-lg font-semibold text-white
                shadow-md transition
                duration-200 ease-in hover:bg-orange-600 focus:outline-none focus:ring-2
                focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-orange-200 disabled:bg-neutral-400 dark:bg-orange-600
                dark:hover:bg-orange-700 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
        >
            Done
        </button>
    </div>
{/if}

<style>
    #price::-webkit-outer-spin-button,
    #price::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    #price {
        -moz-appearance: textfield;
    }
</style>
