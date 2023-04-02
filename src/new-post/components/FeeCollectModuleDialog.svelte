<script lang="ts">
    //@ts-ignore
    import tippy from "sveltejs-tippy";
    import {beforeUpdate, createEventDispatcher, onMount} from 'svelte';
    import {z} from "zod";

    import {collectFeeToCollectModule, getEnabledModuleCurrencies} from '../../lib/lens-modules'
    import {collectFee} from '../../lib/store/state-store'

    import type {
        CollectModule, Erc20,
        FeeCollectModuleSettings,
        LimitedFeeCollectModuleSettings,
        LimitedTimedFeeCollectModuleSettings,
        ModuleFeeAmount,
        TimedFeeCollectModuleSettings
    } from "../../graph/lens-service";
    import {CollectModules} from "../../graph/lens-service";
    import {currentUser} from "../../lib/store/user-store";

    const dispatch = createEventDispatcher();

    let isLimited: boolean;
    let hasReferralFee: boolean = false;

    const priceSchema = z.number({
        required_error: "Price is required",
        invalid_type_error: "Price must be a number",
    }).positive('Price must be greater than zero');

    const referralSchema = z.number({
        required_error: "Referral rate not set",
        invalid_type_error: "Referral must be a number",
    }).positive('Referral must be greater than zero');

    const limitSchema = z.number({
        required_error: "Limit is not set",
        invalid_type_error: "Limit must be a number",
    }).positive('Limit must be greater than zero');

    let token: Erc20;

    let priceError: string;
    let limitError: string;
    let referralError: string;

    const validatePrice = (price: number): number => {
        try {
            priceSchema.parse(price);
            priceError = null;
            return price;
        } catch (e) {
            priceError = e.issues?.[0]?.message ?? 'Invalid number';
        }
        return null;
    };

    const onPriceValueChange = (event) => {
        const value = event.target.value;
        validatePrice(Number(value))
    };

    const validateReferral = (referral: number) => {
        try {
            referralSchema.parse(referral);
            referralError = null;
            return referral;
        } catch (e) {
            referralError = e.issues?.[0]?.message ?? 'Invalid number';
        }
        return null;
    };

    const onReferralValueChange = (event) => {
        const value = event.target.value;
        validateReferral(Number(value))
    };

    const validateLimit = (limit: number) => {
        try {
            limitSchema.parse(limit);
            limitError = null;
            return limit;
        } catch (e) {
            limitError = e.issues?.[0]?.message ?? 'Invalid number';
        }
        return null;
    };

    const onLimitValueChange = (event) => {
        const value = event.target.value;
        validateLimit(Number(value))
    };

    const onSetClick = async () => {
        console.log('onSetClick', $collectFee);

        if (!validatePrice($collectFee.price) ||
            (hasReferralFee && !validateReferral($collectFee.referralFee)) ||
            (isLimited && !validateLimit($collectFee.limit))
        ) {
            return;
        }

        if (!$collectFee.token) {
            $collectFee.token = token;
        }

        const collectModule = collectFeeToCollectModule(
            $currentUser?.address,
            $collectFee,
        );

        dispatch('moduleUpdated', collectModule);
    }

    beforeUpdate(() => {
        if (!$collectFee) {
            $collectFee = {};
        }
    });

    onMount(() => {
        if ($collectFee.limit) {
            isLimited = true;
        }

        if ($collectFee.referralFee) {
            hasReferralFee = true;
        }
    });

    const onCurrencyChange = () => {
        $collectFee.token = token;
    };

    $: {
        if (!hasReferralFee) {
            referralError = null;
        } else {
            validateReferral($collectFee.referralFee);
        }

        if (!isLimited) {
            limitError = null;
        } else {
            validateLimit($collectFee.limit)
        }
    }
</script>

<div class="p-4 dark:bg-gray-800">

    <div id="amount">

      <label for="price" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Price
      </label>

      <div class="mt-1 relative rounded-lg">

        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span class="text-gray-500 sm:text-sm">$</span>
        </div>

        <input type="number" name="price" id="price" autocomplete="off" placeholder="0.00" min="0"
               bind:value={$collectFee.price} on:change={onPriceValueChange}
               class="focus:ring-orange-500 border-l border-b border-t border-gray-300 py-2 px-4 focus:border-orange-500
               block w-full pl-7 pr-12 rounded-xl text-base dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100"/>

        <div class="absolute inset-y-0 right-0 flex items-center">
          <label for="currency" class="sr-only">
            Currency
          </label>

          {#await getEnabledModuleCurrencies()}

            <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101"
                 fill="none"
                 xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="#E5E7EB"/>
              <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor"/>
            </svg>

          {:then tokens}

            <select id="Currency" name="currency" bind:value={token} on:change={onCurrencyChange}
                    class="focus:ring-orange-500 py-2 px-4 border-t border-r border-gray-300 border-b bo focus:border-orange-500
                  h-full pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-300 sm:text-sm rounded-r-xl">

              {#each tokens as token}
                <option value={token}>
                  {token.symbol}
                </option>
              {/each}

            </select>

          {/await}
        </div>
      </div>
      {#if priceError}
        <div class="pt-2 text-orange-600">{priceError}</div>
      {/if}
    </div><!-- #amount -->

    <div id="collectLimit" class="flex items-center py-2 mt-4 gap-6">

      <div class="grow flex items-center">
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input type="checkbox" name="toggle" id="collectLimitToggle" bind:checked={isLimited}
                 class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
          <label for="collectLimitToggle"
                 class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
        </div>
        <span class="text-gray-400 text-base pr-2 inline-flex items-center">
          <svg viewBox="0 0 24 24" fill="none" class="inline w-4 mr-1.5" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Limited edition
        </span>
      </div>

      <input type="number" id="collectLimitInput" placeholder="1" autocomplete="off" min="0"
             bind:value={$collectFee.limit} on:change={onLimitValueChange} disabled={!isLimited}
             class="rounded-lg border-transparent appearance-none border border-gray-400 py-2
             px-2 bg-white w-20 placeholder-gray-400 shadow-md text-base focus:outline-none
             focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center font-semibold
             dark:bg-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-100
             disabled:opacity-50 disabled:hidden"/>

    </div><!-- #collectLimit -->

    {#if limitError}
      <div class="text-orange-600 w-full text-right">{limitError}</div>
    {/if}

    <div id="timed" class="flex items-center py-2 mt-2 gap-6">

      <div class="grow flex items-center">
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input type="checkbox" name="toggle" id="collectTimedToggle" bind:checked={$collectFee.timed}
                 class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
          <label for="collectTimedToggle"
                 class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
        </div>
        <span class="text-gray-400 text-base inline-flex items-center">
          <svg viewBox="0 0 24 24" fill="none" class="inline w-4 mr-1.5"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Only available for 24 hours
        </span>
      </div>

    </div><!-- #timed -->

    <div id="follower-only" class="flex items-center py-2 mt-2 gap-6">

      <div class="grow flex items-center">
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input type="checkbox" name="toggle" id="followerOnlyToggle" bind:checked={$collectFee.followerOnly}
                 class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
          <label for="followerOnlyToggle"
                 class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
        </div>
        <span class="text-gray-400 text-base inline-flex items-center">
          <svg viewBox="0 0 24 24" fill="none" class="inline w-4 mr-1.5"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Followers only
        </span>
      </div>

    </div><!-- #follower-only -->

    <div id="referralFee" class="flex items-center py-2 mt-1 gap-6">

      <div class="grow flex items-center">
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input type="checkbox" name="toggle" id="referralFeeToggle" bind:checked={hasReferralFee}
                 class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
          <label for="referralFeeToggle"
                 class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
        </div>
        <span class="text-gray-400 text-base inline-flex items-center">
          <svg viewBox="0 0 24 24" class="inline w-4 mr-1.5" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 2.1l4 4-4 4"/>
            <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
            <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
          </svg>
          Referral fee
        </span>
      </div>

      <div class="relative rounded-lg {hasReferralFee ? '' : 'hidden'}">
        <input type="number" id="referralFeeInput" placeholder="5" autocomplete="off" min="0" max="100"
               bind:value={$collectFee.referralFee} on:change={onReferralValueChange} disabled={!hasReferralFee}
               class="rounded-lg border-transparent appearance-none border border-gray-400 disabled:opacity-50 pl-2 pr-3
               px-4 bg-white w-24 text-gray-700 placeholder-gray-400 shadow-md text-base focus:outline-none focus:ring-2
               focus:ring-orange-500 focus:border-transparent text-center font-semibold
               dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100"/>
        <div class="absolute inset-y-0 right-0 flex items-center mr-8 text-gray-400">
          %
        </div>
      </div>

    </div><!-- #referralFee -->

    {#if referralError}
      <div class="text-orange-600 w-full text-right">{referralError}</div>
    {/if}

    <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      <div class="flex items-center text-xs pr-2 text-neutral-800 dark:text-neutral-300 cursor-help"
           use:tippy={({
             content: 'A 2% fee is collected only when your NFT sells, and only for the initial sale.',
             appendTo: 'parent'
           })}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="inline w-4"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="pl-1.5">Focalize collects a 2% fee</span>
      </div>

      <button type="button" on:click={onSetClick}
              disabled={!$collectFee.price || priceError || referralError || limitError}
              class="w-auto py-1.5 px-8 flex justify-center items-center
              bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400
              dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600
              rounded-full shadow-md
              focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              text-white text-center text-lg font-semibold dark:disabled:text-gray-400
              transition ease-in duration-200 ">
        Set
      </button>
    </div>
  </div>

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