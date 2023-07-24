<script lang="ts">
    import {onMount} from 'svelte';
    import {getXmtpClient} from '../../../lib/xmtp-service';
    import {darkMode, messagesRefreshEnabled} from '../../../lib/stores/preferences-store';
    import {ensureUser} from '../../../lib/user/user';
    import {Toast, toastStore, storePopup} from '@skeletonlabs/skeleton';
    import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
    import {selectedMainTab} from '../../../lib/stores/cache-store';
    import Toolbar from '../../../options/components/Toolbar.svelte';
    import LoadingSpinner from '../../../lib/components/LoadingSpinner.svelte';
    import {initEthers} from '../../../lib/evm/ethers-service';

    let error: string;
    let authenticated = false;
    let waitingOnSignature = false;

    const onXmtpLogin = async () => {
        const enabled = $messagesRefreshEnabled === true;
        await chrome.runtime.sendMessage({type: 'setMessagesAlarm', enabled});
        $selectedMainTab = 1;
        authenticated = true;
    };

    const login = async () => {
        waitingOnSignature = true;

        try {
            const client = await getXmtpClient();
            console.log('onMount: got client', client);
            await onXmtpLogin();
        } catch (e) {
            console.error(e);
            toastStore.trigger({
                message: 'Error authenticating with XMTP. Please try again.',
                background: 'variant-filled-error',
                duration: 5000,
            });
        } finally {
            waitingOnSignature = false;
        }
    };

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    onMount(async () => {
        storePopup.set({computePosition, autoUpdate, flip, shift, offset, arrow});

        await ensureUser();
    });
</script>

<div class="flex flex-col h-full w-full items-center">

  <Toolbar/>

  <div class="flex flex-col w-fit flex-grow gap-4 justify-center items-center p-4">

    {#if waitingOnSignature}

      <LoadingSpinner size="w-16 h-16"/>

      <div class="text-3xl font-medium">
        Waiting on signature...
      </div>

      <div class="text-base opacity-60">
        Please sign the message when prompted by your wallet.
      </div>

    {:else if authenticated}

      <svg class="w-16 h-16 text-success-500-400-token"
            viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>

      <div class="text-3xl font-medium">
        XMTP Connected!
      </div>

      <div class="text-base opacity-60">
        You can now access your direct messages from the toolbar.
      </div>

      <button type="button" on:click={() => window.close()}
              class="btn btn-sm variant-ringed-surface flex gap-2 mt-6">
        Close this window
      </button>

    {:else}

      <svg class="w-16 h-16 text-primary-500 animate-bounce"
           viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>

      <div class="text-3xl font-medium">
        Enable DMs
      </div>

      <div class="text-base opacity-60">
        Direct messages are end-to-end encrypted on the XMTP network.
      </div>

      <button type="button" on:click={login}
              class="btn btn-lg variant-ringed-primary hover:variant-ghost-primary flex gap-1.5 mt-6 font-medium rounded-br-none shadow">
        Connect with
        <svg viewBox="0 0 1058 248" fill="none" class="h-4 w-auto">
          <path
              d="M401.245 122.658L461.097 42.1385H414.665L377.359 96.0866L339.515 42.1385H290.937L349.983 124.537L287.716 208.814H333.879L374.138 151.913L414.128 208.814H462.976L401.245 122.658Z"
              fill="currentColor"/>
          <path
              d="M591.535 158.087H590.998L553.189 42.1385H489.815V209.082H529V86.1558H530.073L571.406 209.082H608.175L649.239 86.1558H650.313V209.082H692.182V42.1385H629.647L591.535 158.087Z"
              fill="currentColor"/>
          <path d="M720.095 41.8701V77.0303H779.018L778.873 208.814H821.01L821.093 77.0303H879.788V41.8701H720.095Z"
                fill="currentColor"/>
          <path
              d="M990.365 41.8701H907.164V208.814H949.301V156.745H989.56C1032.32 156.745 1058 136.234 1058 98.5022C1058 61.2281 1032.27 42.1093 990.428 42.1093L990.365 41.8701ZM949.301 122.121V77.0303H986.339C1003.95 77.0303 1015.59 82.9222 1015.59 99.8441C1015.59 116.537 1004.06 121.853 985.534 121.853L949.301 122.121Z"
              fill="currentColor"/>
          <path
              d="M0 124C0 55.5167 55.5153 0 123.997 0C192.434 0 245.31 54.4848 246.92 123.463C246.92 145.472 239.405 163.991 220.618 181.437C204.742 196.18 177.675 198.346 157.816 187.342C143.641 179.165 132.717 161.751 123.46 148.961L106.283 175.264H69.2451L104.136 123.461L70.3186 72.4675H108.43L123.729 98.7706L138.758 72.4675H177.139L142.248 123.463C142.248 123.463 158.888 148.961 168.013 158.892C177.139 168.823 193.779 169.091 204.514 158.355C216.318 146.551 218.96 137.152 219.008 123.463C219.192 70.4783 177.107 27.9134 123.997 27.9134C70.9311 27.9134 27.9127 70.9328 27.9127 124C27.9127 177.067 70.9311 220.087 123.997 220.087C131.337 220.087 138.372 219.47 145.2 217.939L151.105 245.048C141.389 247.226 133.54 248 123.997 248C55.5153 248 0 192.483 0 124Z"
              fill="#FC4F37"/>
        </svg>

      </button>

    {/if}

  </div>

</div>

<Toast position="t"/>