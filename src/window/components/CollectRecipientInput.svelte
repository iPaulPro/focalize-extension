<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import Tribute, {type TributeItem} from 'tributejs';
    import {searchHandles} from '../../lib/user/search-handles';
    import {getAddressFromEns, getEnsFromAddress, isEthereumAddress, validateRecipient} from '../../lib/utils/utils';
    import {createEventDispatcher, onMount} from 'svelte';
    import {getProfileByAddress, getProfileByHandle} from '../../lib/user/lens-profile';
    import {buildTributeUsernameMenuTemplate} from '../../lib/user/tribute-username-template';
    import type {Profile} from "../../lib/graph/lens-service";
    import type {Action} from "svelte/types/runtime/action";

    export let menuContainer: HTMLElement;

    let input: HTMLInputElement;
    let value: string;
    let isValid: boolean;
    let error: string;

    const dispatch = createEventDispatcher();

    const tribute: Action = (node: HTMLElement) => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchHandles(text, 5, cb),
            menuItemTemplate: (item: TributeItem<Profile>) => buildTributeUsernameMenuTemplate(item),
            fillAttr: 'handle',
            lookup: 'handle',
            autocompleteMode: true,
            replaceTextSuffix: '',
            menuShowMinLength: 2,
            menuContainer,
            noMatchTemplate: () => '<span class="hidden"></span>',
        });

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            }
        };
    };

    const checkForExistingRecipient = async () => {
        console.log('checkForExistingRecipient');
        const trimmed = value.trim();
        const split = trimmed.split('.');
        if (split.length === 2) {
            console.log('checkForExistingRecipient: found domain', split);
            if (split[1] === 'lens' || split[1] === 'test') {
                console.log('checkForExistingRecipient: got lens name', trimmed);
                try {
                    const profile = await getProfileByHandle(trimmed);
                    console.log('checkForExistingRecipient: got profile', profile);
                    if (profile) {
                        dispatch('recipient', {
                            address: profile.ownedBy,
                            identity: {
                                lens: profile.handle,
                            }
                        });
                    }
                } catch (e) {
                    error = 'Unable to find Lens profile';
                    dispatch('error', error);
                }
            } else if (split[1] === 'eth') {
                const address = await getAddressFromEns(trimmed);
                if (address) {
                    dispatch('recipient', {
                        address,
                        identity: {
                            ens: trimmed,
                        }
                    });
                } else {
                    error = 'Unable to find ENS address';
                    dispatch('error', error);
                }
            }
            return;
        }

        if (!isEthereumAddress(trimmed)) {
            console.log('checkForExistingRecipient: invalid address', trimmed);
            error = 'Invalid address';
            dispatch('error', error);
            return;
        }

        const profile = await getProfileByAddress(trimmed);
        if (profile) {
            console.log('checkForExistingRecipient: found profile', trimmed, profile);
            dispatch('recipient', {
                address: profile.ownedBy,
                identity: {
                    lens: profile.handle,
                }
            });
            return;
        }

        const ens = await getEnsFromAddress(trimmed);
        if (ens) {
            console.log('checkForExistingRecipient: found ens', trimmed, ens);
            dispatch('recipient', {
                address: trimmed,
                identity: {ens}
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

<div class="relative w-full flex gap-2">

  <input type="text" placeholder="Enter a .lens, .eth, or 0x address" spellcheck="false"
         bind:this={input} bind:value={value} on:blur={() => dispatch('cancel')}
         use:tribute use:validateRecipient={{onValidated}}
         class="w-full grow border border-gray-300 dark:border-gray-600 rounded-xl text-base shadow-sm focus:ring-orange-500
              focus:border-orange-500 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400 pr-8">

  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
    {#if isValid === true}
      <svg class="w-4 h-4 text-green-600 dark:text-green-300" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    {:else if error}
      <svg class="w-4 h-4 text-red-600 dark:text-red-300 cursor-help" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           use:tippy={{content: error}}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    {/if}
  </div>
</div>
