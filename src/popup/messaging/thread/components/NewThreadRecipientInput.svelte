<script lang="ts">
    import Tribute from 'tributejs';
    import {
        buildLoadingItemTemplate,
        buildTributeUsernameMenuTemplate,
        searchHandles
    } from '../../../../lib/lens-search';
    import {onMount} from 'svelte';
    import {z} from 'zod';
    import {Subject} from 'rxjs';
    import {debounceTime} from 'rxjs/operators';
    import {createEventDispatcher} from 'svelte';
    import type {Peer} from '../../../../lib/xmtp-service';
    import {getAddressFromEns, getEnsFromAddress} from '../../../../lib/utils';
    import {getProfileByHandle} from '../../../../lib/lens-profile';
    import {canMessage} from '../../../../lib/xmtp-service';
    import LoadingSpinner from '../../../../lib/components/LoadingSpinner.svelte';

    const dispatch = createEventDispatcher();

    const ethereumAddress = z.string().refine(value => /^0x[a-fA-F0-9]{40}$/.test(value), {
        message: 'Invalid Ethereum address',
    });

    const domainName = z.string().refine(value => /\.(lens|eth|test)$/.test(value), {
        message: 'Invalid username',
    });

    const inputSchema = z.union([ethereumAddress, domainName]);

    let input: HTMLInputElement;
    let recipient: string;
    let validRecipient: boolean;
    let error: string;
    let validating: boolean;

    const tribute = async (node) => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchHandles(text, 5, cb),
            menuItemTemplate: (item) => buildTributeUsernameMenuTemplate(item),
            loadingItemTemplate: buildLoadingItemTemplate(),
            fillAttr: 'handle',
            lookup: 'handle',
            autocompleteMode: true,
            replaceTextSuffix: '',
            menuShowMinLength: 2,
            noMatchTemplate: () => {
            },
        });

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            }
        };
    };

    const validateInput = (node: HTMLElement, parameters: any) => {
        const callback: (valid: boolean) => void = parameters.onValidate;
        const subject = new Subject<string>();

        subject.pipe(
            debounceTime(500),
        ).subscribe(value => {
            const result = inputSchema.safeParse(value);
            callback(result.success);
        });

        const handleInput = (event: Event) => {
            validating = true;
            const input = event.target as HTMLInputElement;
            subject.next(input.value);
        };

        node.addEventListener('input', handleInput);

        return {
            destroy() {
                node.removeEventListener('input', handleInput);
                subject.unsubscribe();
            }
        };
    };

    const onValidate = async (valid: boolean) => {
        let peer: Peer = {};
        recipient = recipient.trim();

        const dispatchPeer = (peer: Peer, valid: boolean) => {
            validating = false;
            validRecipient = valid;
            dispatch('peerSelected', peer);
        }

        if (!valid) {
            validating = false;
            validRecipient = valid;
            dispatchPeer(null, valid);
            return;
        }

        error = undefined;

        if (recipient.startsWith('0x')) {
            peer.wallet = {
                address: recipient,
                ens: await getEnsFromAddress(recipient),
            };
        } else if (recipient.endsWith('.lens') || recipient.endsWith('.test')) {
            peer.profile = await getProfileByHandle(recipient);
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
        }

        const address = peer.wallet?.address ?? peer.profile?.ownedBy;
        console.log('onValidate: checking if ', address, ' is available');
        const available = await canMessage(address);
        if (!available) {
            error = 'This user has not registered with XMTP';
            dispatchPeer(null, false);
            return;
        }

        dispatchPeer(peer, valid);
    };

    const onBlur = () => {
        if (!validRecipient && recipient?.length > 0) {
            error = 'Must be a .lens, .eth, or 0x address';
        }
    };

    const onClearText = () => {
        recipient = '';
        error = undefined;
        validRecipient = false;
        dispatch('peerSelected', null);
        input?.focus();
    };

    onMount(() => {
        input?.focus();
    });
</script>

<div class="flex flex-col justify-center text-center px-2 py-4">

  <div class="input-group input-group-divider grid-cols-[auto_1fr_auto] !bg-transparent rounded-xl
       border-surface-200-700-token focus:border-primary-400-500-token divide-surface-200 dark:divide-surface-700 focus:ring-0">

    <div class="input-group-shim">To:</div>

    <input type="text" placeholder="Enter a .lens, .eth, or 0x address" spellcheck="false"
           bind:this={input} bind:value={recipient} on:blur={onBlur}
           use:tribute use:validateInput={{onValidate}}
           class="input rounded-none p-2 text-[0.925rem] {error ? 'input-error' : ''}"/>

    {#if validating}

      <div>
        <LoadingSpinner size="w-4 h-4" />
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