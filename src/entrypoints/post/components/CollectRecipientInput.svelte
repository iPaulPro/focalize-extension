<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import Tribute, { type TributeItem } from 'tributejs';
    import { searchUsernames } from '@/lib/lens/lens-usernames';
    import {
        getAddressFromEns,
        getEnsFromAddress,
        isEthereumAddress,
        validateRecipient,
    } from '@/lib/utils/utils';
    import { createEventDispatcher, onMount } from 'svelte';
    import { buildTributeUsernameMenuTemplate } from '@/lib/components/tribute-username-template';
    import { getAccount } from '@/lib/lens-service';
    import type { Action } from 'svelte/action';
    import type { SimpleAccount } from '@/lib/types/SimpleAccount';

    export let menuContainer: HTMLElement;

    let input: HTMLInputElement;
    let value: string;
    let isValid: boolean;
    let error: string;

    const dispatch = createEventDispatcher<any>();

    const tribute: Action = (node: HTMLElement) => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchUsernames(text, 5, cb),
            menuItemTemplate: (item: TributeItem<SimpleAccount>) =>
                buildTributeUsernameMenuTemplate(item),
            fillAttr: 'username',
            lookup: 'username',
            autocompleteMode: true,
            replaceTextSuffix: '',
            menuShowMinLength: 2,
            menuContainer,
            noMatchTemplate: () => '<span class="hidden"></span>',
            selectTemplate: (item: TributeItem<SimpleAccount> | undefined) =>
                `@${item!.original.username!}`,
        });

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            },
        };
    };

    const checkForExistingRecipient = async () => {
        console.log('checkForExistingRecipient: value=', value);
        const trimmed = value.trim();
        const domainSplit = trimmed.split('.');
        const slashSplit = trimmed.split('/');
        if (domainSplit.length === 2) {
            console.log('checkForExistingRecipient: found domain', domainSplit);
            if (domainSplit[1] === 'lens' || domainSplit[1] === 'test') {
                console.log('checkForExistingRecipient: got lens name', trimmed);
                try {
                    const account = await getAccount({ username: domainSplit[0] });
                    console.log('checkForExistingRecipient: got account', account);
                    if (account) {
                        dispatch('recipient', {
                            address: account.address,
                            identity: {
                                lens: account,
                            },
                        });
                    }
                } catch (e) {
                    console.error('error getting account', e);
                    error = 'Unable to find Lens account';
                    dispatch('error', error);
                }
            } else if (domainSplit[1] === 'eth') {
                const address = await getAddressFromEns(trimmed);
                if (address) {
                    dispatch('recipient', {
                        address,
                        identity: {
                            ens: trimmed,
                        },
                    });
                } else {
                    error = 'Unable to find ENS address';
                    dispatch('error', error);
                }
            }
            return;
        } else if (slashSplit.length == 2) {
            try {
                const account = await getAccount({ username: slashSplit[1] });
                console.log('checkForExistingRecipient: got account', account);
                if (account) {
                    dispatch('recipient', {
                        address: account.address,
                        identity: {
                            lens: account,
                        },
                    });
                }
            } catch (e) {
                console.error('error getting account', e);
                error = 'Unable to find Lens account';
                dispatch('error', error);
            }
        }

        if (!isEthereumAddress(trimmed)) {
            console.log('checkForExistingRecipient: invalid address', trimmed);
            error = 'Invalid address';
            dispatch('error', error);
            return;
        }

        const account = await getAccount({ username: trimmed });
        if (account) {
            console.log('checkForExistingRecipient: found account', trimmed, account);
            dispatch('recipient', {
                address: account.owner,
                identity: {
                    lens: account,
                },
            });
            return;
        }

        const ens = await getEnsFromAddress(trimmed);
        if (ens) {
            console.log('checkForExistingRecipient: found ens', trimmed, ens);
            dispatch('recipient', {
                address: trimmed,
                identity: { ens },
            });
        }
    };

    const onValidated = async (valid: boolean) => {
        isValid = valid;
        await checkForExistingRecipient();
    };

    onMount(() => {
        input.focus();
    });
</script>

<div class="relative flex w-full gap-2">
    <input
        type="text"
        placeholder="Enter a lens username, .eth, or 0x address"
        spellcheck="false"
        bind:this={input}
        bind:value
        on:blur={() => dispatch('cancel')}
        use:tribute
        use:validateRecipient={{ onValidated }}
        class="w-full grow rounded-xl border border-gray-300 pr-8 text-base shadow-sm focus:border-orange-500
              focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
    />

    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        {#if isValid === true}
            <svg
                class="h-4 w-4 text-green-600 dark:text-green-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        {:else if error}
            <div class="h-4 w-4" use:tippy={{ content: error }}>
                <svg
                    class="h-4 w-4 cursor-help text-red-600 dark:text-red-300"
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
    </div>
</div>
