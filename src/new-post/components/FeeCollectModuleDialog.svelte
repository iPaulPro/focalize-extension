<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    import {getEnabledModuleCurrencies} from '../../lib/lens-post.js'
    import {getAddressFromSigner} from "../../lib/ethers-service";

    import type {CollectModule, Erc20} from "../../graph/lens-service";

    const dispatch = createEventDispatcher();

    let price: number;
    let token: Erc20;
    let limited: boolean;
    let limit: number;
    let timed: boolean;

    export let followerOnly: boolean;

    const onSetClick = async () => {
        const address = await getAddressFromSigner();

        let baseModule = {
            amount: {
                currency: token.address,
                value: price
            },
            recipient: address,
            referralFee: 0,
            followerOnly
        }

        let collectModule: CollectModule;

        if (limited && timed) {
            collectModule = {
                limitedTimedFeeCollectModule: {
                    ...baseModule,
                    collectLimit: limit.toString()
                }
            };
        } else if (limited) {
            collectModule = {
                limitedFeeCollectModule: {
                    ...baseModule,
                    collectLimit: limit.toString()
                }
            };
        } else if (timed) {
            collectModule = {
                timedFeeCollectModule: {
                    ...baseModule
                }
            };
        } else {
            collectModule = {
                feeCollectModule: {
                    ...baseModule
                }
            };
        }

        dispatch('moduleUpdated', collectModule);
    }
</script>

<div class="flex flex-col p-4">

  <div class="flex justify-between items-start">

    <h1 class="pb-4 text-xl font-medium">Sell as an NFT</h1>

    <form method="dialog">
      <button>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
      </button>
    </form>
  </div>

  <div id="amount">
    <label for="price" class="block text-sm font-medium text-gray-700">
      Price
    </label>
    <div class="mt-1 relative rounded-md shadow-sm">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500 sm:text-sm">
                $
            </span>
      </div>
      <input type="text" name="price" id="price" bind:value={price}
             class="focus:ring-orange-500 border-l border-b border-t border-gray-300 py-2 px-4 focus:border-orange-500
             block w-full pl-7 pr-12 rounded-md text-base"
             placeholder="0.00"/>
      <div class="absolute inset-y-0 right-0 flex items-center">
        <label for="currency" class="sr-only">
          Currency
        </label>
        {#await getEnabledModuleCurrencies()}
        {:then tokens}
          <select id="Currency" name="currency" bind:value={token}
                  class="focus:ring-indigo-500 py-2 px-4 border-t border-r border-gray-300 border-b bo focus:border-indigo-500
                 h-full pl-2 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-r-md">

            {#each tokens as token}
              <option value={token}>
                {token.symbol}
              </option>
            {/each}
          </select>
        {/await}
      </div>
    </div>
  </div><!-- #amount -->

  <div id="collectLimit" class="flex items-center py-2 mt-4 gap-6">

    <div class="grow">
      <div class="relative inline-block w-10 mr-2 align-middle select-none">
        <input type="checkbox" name="toggle" id="collectLimitToggle" bind:checked={limited}
               class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
        <label for="collectLimitToggle"
               class="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
      </div>
      <span class="text-gray-400 text-base">
        Limited edition
      </span>
    </div>

    <input type="number" id="collectLimitInput" placeholder="No. available" bind:value={limit} disabled={!limited}
           class="rounded-lg border-transparent appearance-none border border-gray-400 disabled:border-gray-300 py-2 px-4 bg-white w-40
             text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-orange-500
             focus:border-transparent"/>

  </div><!-- #collectLimit -->

  <div id="timed" class="flex items-center py-2 mt-2 gap-6">

    <div class="grow">
      <div class="relative inline-block w-10 mr-2 align-middle select-none">
        <input type="checkbox" name="toggle" id="collectTimedToggle" bind:checked={timed}
               class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
        <label for="collectTimedToggle"
               class="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
      </div>
      <span class="text-gray-400 text-base">
        Only available for 24 hours
      </span>
    </div>

  </div><!-- #collectLimit -->

  <div class="flex justify-end">

    <button on:click={onSetClick}
        class="mt-4 w-fit py-1.5 px-8 flex justify-center items-center rounded-lg w-auto disabled:bg-neutral-400
          bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white text-center text-lg
          transition ease-in duration-200 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2">
      Set
    </button>

  </div>

</div>