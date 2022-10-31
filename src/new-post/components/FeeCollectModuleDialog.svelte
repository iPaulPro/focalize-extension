<script lang="ts">
    import {createEventDispatcher} from 'svelte';

    import {getEnabledModuleCurrencies} from '../../lib/lens-post.js'
    import {getAddressFromSigner} from "../../lib/ethers-service";

    import type {
        CollectModule,
        Erc20,
        FeeCollectModuleSettings,
        LimitedFeeCollectModuleSettings,
        LimitedTimedFeeCollectModuleSettings,
        ModuleFeeAmount,
        TimedFeeCollectModuleSettings
    } from "../../graph/lens-service";
    import {CollectModules} from "../../graph/lens-service";

    const dispatch = createEventDispatcher();

    let price: number;
    let token: Erc20;
    let limited: boolean;
    let limit: number;
    let timed: boolean;

    export let followerOnly: boolean;

    const onSetClick = async () => {
        const recipient = await getAddressFromSigner();

        const amount: ModuleFeeAmount = {
            asset: token,
            value: price
        }

        let baseModule = {
            amount,
            recipient,
            referralFee: 0,
            followerOnly
        }

        let collectModule: CollectModule;

        if (limited && timed) {
            collectModule = {
                ...baseModule,
                collectLimit: limit.toString(),
                type: CollectModules.LimitedTimedFeeCollectModule,
                __typename: "LimitedTimedFeeCollectModuleSettings"
            } as LimitedTimedFeeCollectModuleSettings;
        } else if (limited) {
            collectModule = {
                ...baseModule,
                collectLimit: limit.toString(),
                type: CollectModules.LimitedFeeCollectModule,
                __typename: "LimitedFeeCollectModuleSettings"
            } as LimitedFeeCollectModuleSettings;
        } else if (timed) {
            collectModule = {
                ...baseModule,
                type: CollectModules.TimedFeeCollectModule,
                __typename: "TimedFeeCollectModuleSettings"
            } as TimedFeeCollectModuleSettings;
        } else {
            collectModule = {
                ...baseModule,
                type: CollectModules.FeeCollectModule,
                __typename: "FeeCollectModuleSettings"
            } as FeeCollectModuleSettings;
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
      <input type="text" name="price" id="price" autocomplete="off" placeholder="0.00" min="0.00"
             bind:value={price}
             class="focus:ring-orange-500 border-l border-b border-t border-gray-300 py-2 px-4 focus:border-orange-500
             block w-full pl-7 pr-12 rounded-md text-base" />
      <div class="absolute inset-y-0 right-0 flex items-center">
        <label for="currency" class="sr-only">
          Currency
        </label>
        {#await getEnabledModuleCurrencies()}
          <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101" fill="none"
               xmlns="http://www.w3.org/2000/svg">
            <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="#E5E7EB"/>
            <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"/>
          </svg>
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

    <input type="number" id="collectLimitInput" placeholder="No. available" autocomplete="off" min="0"
           bind:value={limit} disabled={!limited}
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