<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {createEventDispatcher, onMount} from 'svelte';
    import {z} from 'zod';

    import {getEnabledModuleCurrencies} from '../../lib/lens-modules';
    import {collectSettings} from '../../lib/stores/state-store';

    import type {Erc20,} from '../../lib/graph/lens-service';

    const dispatch = createEventDispatcher();

    let isPaid: boolean;
    let isLimited: boolean;
    let hasReferralFee: boolean;

    const priceSchema = z.number({
        required_error: 'Price is not set',
        invalid_type_error: 'Price must be a number',
    }).positive('Price must be greater than zero');

    const referralSchema = z.number({
        required_error: 'Referral rate not set',
        invalid_type_error: 'Referral must be a number',
    }).positive('Referral must be greater than zero');

    const limitSchema = z.number({
        required_error: 'Limit is not set',
        invalid_type_error: 'Limit must be a number',
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
        const price = validatePrice(Number(value));
        if (price && !$collectSettings.token) {
            $collectSettings.token = token;
        }
    };

    const validateReferral = (referral: number) => {
        console.log('validateReferral', referral, 'hasReferralFee', hasReferralFee);
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
        validateReferral(Number(value));
    };

    const validateLimit = (limit: number) => {
        console.log('validateLimit', limit, 'isLimited', isLimited);
        try {
            limitSchema.parse(limit);
            limitError = null;
            return limit;
        } catch (e) {
            limitError = e.issues?.[0]?.message ?? 'Invalid number';
        }
        return null;
    };

    const onDoneClick = async () => {
        console.log('onDoneClick', $collectSettings);

        if (!$collectSettings) return;

        dispatch('done');
    };

    onMount(async () => {
        console.log('onMount', $collectSettings);
        isPaid = $collectSettings.price !== undefined;
        isLimited = $collectSettings.limit !== undefined;
        hasReferralFee = $collectSettings.referralFee !== undefined;
    });

    const onCurrencyChange = () => {
        if (!$collectSettings) {
            $collectSettings = {};
        }
        $collectSettings.token = token;
    };

    $: if (isPaid === false) {
        $collectSettings.price = undefined;
        priceError = null;
    } else if ($collectSettings) {
        validatePrice($collectSettings.price);
    }

    $: if (hasReferralFee === false) {
        $collectSettings.referralFee = undefined;
        referralError = null;
    } else if ($collectSettings) {
        validateReferral($collectSettings.referralFee);
    }

    $: if (isLimited === false) {
        $collectSettings.limit = undefined;
        limitError = null;
    } else if ($collectSettings) {
        validateLimit($collectSettings.limit);
    }

    $: if ($collectSettings) {
        console.log('collectSettings', $collectSettings);
    }
</script>

<div>

  <div class="p-4">

    <div class="text-base pb-4 opacity-80">
      Turn your post into a digital collectible that can be sold as an NFT on Polygon.
    </div>

    <div id="collectible" class="flex items-center py-2">
      <div class="relative inline-block w-10 mr-2 align-middle select-none">
        <input type="checkbox" name="toggle" id="collectibleToggle" bind:checked={$collectSettings.isCollectible}
               class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
        <label for="collectibleToggle"
               class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
      </div>
      <div class="opacity-90 text-base pr-2 inline-flex items-center cursor-pointer"
           on:click={() => $collectSettings.isCollectible = !$collectSettings.isCollectible}>
        <svg class="inline w-4 mr-1.5" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 1 1-8 0"/>
        </svg>
        <span class="font-medium">Make post collectible</span>
      </div>
    </div>

    {#if $collectSettings.isCollectible}

      <div class="pl-4">
        <div id="amount" class="flex items-center py-2 mt-2 gap-4 justify-between">

          <div class="flex items-center">
            <div class="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="toggle" id="collectPriceToggle" bind:checked={isPaid}
                     class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200
                     ease-in absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none
                     cursor-pointer focus:ring-0 checked:focus:bg-orange checked:focus:ring-0"/>
              <label for="collectPriceToggle"
                     class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
            </div>
            <div class="opacity-90 text-base pr-2 inline-flex items-center cursor-pointer"
                 on:click={() => isPaid = !isPaid}>
              <svg class="inline w-4 mr-1.5 p-0.5 border border-black dark:border-white rounded-full" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span class="font-medium">Paid collection</span>
            </div>
          </div>

          <div class:hidden={!isPaid}>

            <div class="relative rounded-lg">

              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">$</span>
              </div>

              <input type="number" name="price" id="price" autocomplete="off" placeholder="0.00" min="0"
                     bind:value={$collectSettings.price} on:change={onPriceValueChange}
                     class="focus:ring-orange-500 border-l border-b border-t border-gray-300 py-2 px-4 focus:border-orange-500
                     block w-44 pl-7 pr-24 rounded-xl text-base text-center dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100"/>

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
                          class="focus:ring-orange-500 py-2 px-4 border-t border-r border-gray-300 border-b
                          focus:border-orange-500 h-full pl-2 pr-7 border-transparent bg-transparent text-gray-500
                          dark:text-gray-300 sm:text-sm rounded-r-xl cursor-pointer">

                    {#each tokens as token}
                      <option value={token}>
                        {token.symbol}
                      </option>
                    {/each}

                  </select>

                {/await}
              </div>
            </div>
          </div>

        </div><!-- #amount -->

        {#if priceError}
          <div class="flex justify-end text-orange-600">{priceError}</div>
        {/if}

        <div id="referralFee" class="flex items-center mt-2 gap-6" class:hidden={!isPaid}>

          <div class="grow flex items-center">
            <div class="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="toggle" id="referralFeeToggle" bind:checked={hasReferralFee}
                     class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
              <label for="referralFeeToggle"
                     class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
            </div>
            <div class="opacity-90 text-base inline-flex items-center cursor-pointer"
                 on:click={() => hasReferralFee = !hasReferralFee}>
              <svg viewBox="0 0 24 24" class="inline w-4 mr-1.5" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 2.1l4 4-4 4"/>
                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
              </svg>
              <span class="font-medium">Referral reward</span>
            </div>
            <div use:tippy={({
                content: 'Referrals are paid when someone buys your NFT via a mirrored post',
                appendTo: 'parent'
              })}>
              <svg class="inline w-4 h-4 p-[0.075rem] ml-1 opacity-60 cursor-help" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          </div>

          <div class="relative rounded-lg {hasReferralFee ? '' : 'hidden'}">
            <input type="number" id="referralFeeInput" placeholder="5" autocomplete="off" min="0" max="100"
                   bind:value={$collectSettings.referralFee} on:change={onReferralValueChange}
                   class="w-24 px-4 focus:ring-orange-500 border-l border-b border-t border-gray-300 focus:border-orange-500
                   text-center rounded-xl text-base dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100 pl-2 pr-3" />
            <div class="absolute inset-y-0 right-0 flex items-center mr-8 text-gray-400">
              %
            </div>
          </div>

        </div><!-- #referralFee -->

        {#if referralError && isPaid}
          <div class="pt-1 text-orange-600 w-full text-right">{referralError}</div>
        {/if}

        <div id="collectLimit" class="flex items-center py-2 mt-2 gap-6">

          <div class="grow flex items-center">
            <div class="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="toggle" id="collectLimitToggle" bind:checked={isLimited}
                     class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200
                     ease-in absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none
                     cursor-pointer focus:ring-0 checked:focus:bg-orange checked:focus:ring-0"/>
              <label for="collectLimitToggle"
                     class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
            </div>
            <div class="opacity-90 text-base pr-2 inline-flex items-center cursor-pointer"
                 on:click={() => isLimited = !isLimited}>
              <svg viewBox="0 0 24 24" fill="none" class="inline w-4 h-4 mr-1.5" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span class="font-medium">Limited edition</span>
            </div>
          </div>

          {#if isLimited}
            <input type="number" id="collectLimitInput" placeholder="1" autocomplete="off" min="0"
                   bind:value={$collectSettings.limit}
                   class="w-24 px-4 focus:ring-orange-500 border-l border-b border-t border-gray-300 focus:border-orange-500
                   text-center rounded-xl text-base dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100 pl-2 pr-3"/>
          {/if}
        </div><!-- #collectLimit -->

        {#if limitError}
          <div class="text-orange-600 w-full text-right">{limitError}</div>
        {/if}

        <div id="timed" class="flex items-center py-2 mt-2 gap-6">

          <div class="grow flex items-center">
            <div class="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="toggle" id="collectTimedToggle" bind:checked={$collectSettings.timed}
                     class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
              <label for="collectTimedToggle"
                     class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
            </div>
            <div class="opacity-90 text-base inline-flex items-center cursor-pointer"
                 on:click={() => $collectSettings.timed = !$collectSettings.timed}>
              <svg viewBox="0 0 24 24" fill="none" class="inline w-4 mr-1.5"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span class="font-medium">Only available for 24 hours</span>
            </div>
          </div>

        </div><!-- #timed -->

        <div id="follower-only" class="flex items-center py-2 mt-2 gap-6">

          <div class="grow flex items-center">
            <div class="relative inline-block w-10 mr-2 align-middle select-none">
              <input type="checkbox" name="toggle" id="followerOnlyToggle" bind:checked={$collectSettings.followerOnly}
                     class="checked:bg-orange-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in
               absolute block w-6 h-6 rounded-full bg-white border-4 dark:border-none appearance-none cursor-pointer focus:ring-0
               checked:focus:bg-orange checked:focus:ring-0"/>
              <label for="followerOnlyToggle"
                     class="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"></label>
            </div>
            <div class="opacity-90 text-base inline-flex items-center cursor-pointer"
                 on:click={() => $collectSettings.followerOnly = !$collectSettings.followerOnly}>
              <svg viewBox="0 0 24 24" fill="none" class="inline w-4 mr-1.5"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span class="font-medium">Followers only</span>
            </div>
          </div>

        </div><!-- #follower-only -->
      </div>

    {/if}

  </div>

  <div class="flex items-center justify-between px-2 py-2 border-t border-gray-200 dark:border-gray-600">
    <div class="flex items-center text-xs px-2 text-neutral-800 dark:text-neutral-300 cursor-help"
         use:tippy={({
             content: 'A 2% fee is automatically collected when your NFT is sold',
             appendTo: 'parent'
           })}>
      {#if isPaid}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="inline w-4"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="pl-1.5">Focalize receives 2% of the initial sale</span>
      {/if}
    </div>
    <button type="button" on:click={onDoneClick}
            disabled={priceError || referralError || limitError}
            class="w-auto py-1.5 px-8 flex justify-center items-center
              bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-400
              dark:bg-orange-600 dark:hover:bg-orange-700 dark:disabled:bg-gray-600
              rounded-full shadow-md
              focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              text-white text-center text-lg font-semibold dark:disabled:text-gray-400
              transition ease-in duration-200 ">
      Done
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