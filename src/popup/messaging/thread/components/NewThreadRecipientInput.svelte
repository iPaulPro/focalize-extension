<script lang="ts">
    import Tribute, {type TributeItem} from 'tributejs';
    import {searchHandles} from '../../../../lib/user/search-handles';
    import {onMount} from 'svelte';
    import {createEventDispatcher} from 'svelte';
    import type {Peer} from '../../../../lib/xmtp-service';
    import {
        validateRecipient,
        getAddressFromEns,
        getEnsFromAddress,
        isEthereumAddress,
        addressOrDomainNameType
    } from '../../../../lib/utils/utils';
    import {canMessage} from '../../../../lib/xmtp-service';
    import LoadingSpinner from '../../../../lib/components/LoadingSpinner.svelte';
    import {buildTributeUsernameMenuTemplate} from '../../../../lib/user/tribute-username-template';
    import type {Action} from 'svelte/action';
    import { getProfile } from '../../../../lib/lens-service';
    import type { SimpleProfile } from '../../../../lib/user/SimpleProfile';

    const dispatch = createEventDispatcher();

    export let recipient: string;

    let input: HTMLInputElement;
    let validRecipient: boolean | undefined;
    let error: string | undefined;
    let validating: boolean;

    const tribute: Action = (node: HTMLElement) => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchHandles(text, 5, cb),
            menuItemTemplate: (item: TributeItem<SimpleProfile>) => buildTributeUsernameMenuTemplate(item),
            fillAttr: 'handle',
            lookup: 'handle',
            autocompleteMode: true,
            replaceTextSuffix: '',
            menuShowMinLength: 2,
            noMatchTemplate: () => '',
        });

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            }
        };
    };

    const onValidated = async (valid: boolean) => {
        let peer: Peer = {};
        recipient = recipient.trim();

        const dispatchPeer = (peer: Peer | null, valid: boolean) => {
            validating = false;
            validRecipient = valid;
            dispatch('peerSelected', peer);
        };

        if (!valid) {
            validating = false;
            validRecipient = valid;
            dispatchPeer(null, valid);
            return;
        }

        error = undefined;

        if (recipient.endsWith('.lens') || recipient.endsWith('.test')) {
            peer.profile = await getProfile({handle: recipient}) ?? undefined;
        } else if (recipient.endsWith('.eth')) {
            const address = await getAddressFromEns(recipient);
            if (!address) {
                error = 'No address found for this ENS name';
                dispatchPeer(null, false);
                return;
            }
            peer.wallet = {
                ens: recipient,
                address: address,
            };
        } else if (isEthereumAddress(recipient)) {
            peer.wallet = {
                address: recipient,
                ens: await getEnsFromAddress(recipient),
            };
        }

        const address = peer.wallet?.address ?? peer.profile?.ownedBy?.address;
        const available = address && (await canMessage(address));
        if (!available) {
            error = 'This user has not registered with XMTP';
            dispatchPeer(null, false);
            return;
        }

        dispatchPeer(peer, valid);
    };

    const onBlur = () => {
        if (validRecipient === false && recipient?.length > 0) {
            error = 'Must be a .lens, .eth, or 0x address';
        }
    };

    const onClearText = () => {
        recipient = '';
        error = undefined;
        validRecipient = undefined;
        dispatch('peerSelected', null);
        input?.focus();
    };

    onMount(() => {
        input?.focus();

        if (recipient) {
            const result = addressOrDomainNameType.safeParse(recipient);
            onValidated(result.success);
        }
    });
</script>

<div class="flex flex-col justify-center text-center px-2 py-4">

    <div class="input-group input-group-divider grid-cols-[auto_1fr_auto] !bg-transparent rounded-xl
       border-surface-200-700-token focus:border-primary-400-500-token divide-surface-200 dark:divide-surface-700 focus:ring-0">

        <div class="input-group-shim">To:</div>

        <input type="text" placeholder="Enter a .lens, .eth, or 0x address" spellcheck="false"
               bind:this={input} bind:value={recipient} on:blur={onBlur}
               use:tribute use:validateRecipient={{onValidated, onValidate: () => validating = true}}
               class="input rounded-none p-2 text-[0.925rem] {error ? 'input-error' : ''}"/>

        {#if validating}

            <div>
                <LoadingSpinner size="w-4 h-4" fitContent={true}/>
            </div>

        {:else if validRecipient && !error}

            <div>
                <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-green-600 dark:text-green-400"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>

        {:else if error}

            <button type="button" on:click={onClearText}>
                <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-red-600 dark:text-red-400"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            </button>

        {/if}

    </div>

    {#if error}
        <div class="text-error-500-400-token text-sm mt-2">{error}</div>
    {/if}

</div>