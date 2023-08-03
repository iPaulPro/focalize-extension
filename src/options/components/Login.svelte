<script lang="ts">
    import focalizeLogo from '../../assets/focalize-logo-large.svg';
    import InlineSVG from 'svelte-inline-svg';
    import {authenticateUser, NoProfileError} from '../../lib/user/lens-auth';
    import {currentUser} from '../../lib/stores/user-store';
    import {userFromProfile} from '../../lib/user/user';
    import toast from 'svelte-french-toast';
    import DialogOuter from '../../lib/components/DialogOuter.svelte';
    import {tick} from 'svelte';
    import ConnectWalletDialog from './ConnectWalletDialog.svelte';
    import {createEventDispatcher} from 'svelte';
    import {fade} from 'svelte/transition';
    import type {Profile} from '../../lib/graph/lens-service';
    import type WalletConnection from '../../lib/evm/WalletConnection';

    const dispatch = createEventDispatcher();

    let walletConnectDialog: HTMLDialogElement;
    let showWalletConnectDialog = false;

    const showConnectWalletDialog = async () => {
        showWalletConnectDialog = true;
        await tick();
        walletConnectDialog?.showModal();
    };

    const authenticate = async (wallet: WalletConnection) => {
        console.log('authenticate: wallet', wallet);
        walletConnectDialog?.close();
        let authenticatedProfile: Profile;
        try {
            authenticatedProfile = await authenticateUser(wallet);
        } catch (e) {
            if (e instanceof NoProfileError) {
                dispatch('noProfile');
            }
            return;
        }
        $currentUser = userFromProfile(authenticatedProfile);
        console.log('Authenticated user', $currentUser);
    };

    const onSignInClick = async () => {
        try {
            await showConnectWalletDialog();
        } catch (e) {
            console.error('Error logging in',e);
            toast.error('Error logging in', {duration: 5000});
        }

        if ($currentUser) {
            try {
                await chrome.runtime.sendMessage({type: 'setNotificationsAlarm', enabled: true});
            } catch (e) {
                console.error('Error setting alarm', e)
            }
        }
    };

</script>

<main class="w-full h-[100dvh]">

  <div class="w-full h-full flex justify-center items-center">

    <div class="flex flex-col items-center gap-4 pb-36" in:fade>

      <InlineSVG src={focalizeLogo} alt="Focalize Logo" class="h-32" tabindex="-1" />

      <button type="button" on:click={onSignInClick}
              class="group mt-24 py-3 px-6 flex justify-center items-center gap-2.5
              bg-orange-600 hover:bg-orange-500
              rounded-full border border-white border-opacity-10
              text-white text-center text-lg font-medium
              transition-all ease-in duration-200 hover:-translate-y-0.5
              shadow-none hover:shadow-lg hover:shadow-orange-700 active:shadow-md active:shadow-orange-700
              focus:ring-offset-2 focus:ring-orange-400 focus:outline-0 focus:ring-2 active:ring-0 active:ring-offset-0">
        <svg viewBox='0 0 290 186' fill='currentColor'
             class='w-10 -scale-x-100 group-hover:scale-x-100 drop-shadow-sm group-hover:drop-shadow-dark'>
          <path
              d='M145.24.08c13.96 0 27.11 4.67 36.99 13.16 10.36 8.89 16.4 21.24 17.62 35.88 11.21-9.5 24.22-13.96 37.83-12.92 12.99.99 25.59 6.97 35.46 16.85 9.88 9.88 15.86 22.47 16.85 35.47 1.12 14.73-4.19 28.75-15.35 40.55a211.07 211.07 0 0 1-3.31 3.41c-52.846 52.836-121.756 53.963-125.992 53.98h-.108c-2.94 0-72.72-.61-126.08-53.98a151.15 151.15 0 0 1-3.31-3.41C4.67 117.27-.64 103.25.49 88.52c.99-12.99 6.97-25.59 16.85-35.47 9.88-9.88 22.47-15.86 35.47-16.85 13.61-1.04 26.62 3.42 37.83 12.92 1.21-14.64 7.26-26.99 17.61-35.88C118.14 4.75 131.28.08 145.24.08Zm15.1 141.36c-2.7 4.96-8.68 8.17-15.23 8.17-6.55 0-12.52-3.21-15.23-8.17l-7.03 3.83c4.08 7.49 12.82 12.34 22.25 12.34s18.17-4.85 22.27-12.34Zm-56.1-42.85c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.223 0 2.426.071 3.603.21a11.507 11.507 0 0 0-5.913 10.06c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.58-.043-1.15-.126-1.708 3.297 3.63 5.256 8.152 5.256 13.048h8c0-16.33-15.18-29.61-33.84-29.61Zm82.06 0c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.225 0 2.431.072 3.611.211A11.507 11.507 0 0 0 184 116.86c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.576-.042-1.142-.124-1.695 3.29 3.627 5.244 8.145 5.244 13.035h8c0-16.33-15.18-29.61-33.84-29.61Z' />
        </svg>
        <span class="drop-shadow-sm group-hover:drop-shadow-dark">Sign in with Lens</span>
      </button>

    </div>

  </div>
</main>

{#if showWalletConnectDialog}
  <dialog id="walletConnectDialog" bind:this={walletConnectDialog} on:close={() => showWalletConnectDialog = false}
          class="w-2/3 max-w-md rounded-2xl shadow-2xl p-0 border border-gray-200 dark:bg-gray-800
          dark:border-gray-700">
    <DialogOuter>
      <ConnectWalletDialog
          on:select={(e) => authenticate(e.detail)}
          on:dismiss={() => walletConnectDialog.close()}/>
    </DialogOuter>
  </dialog>
{/if}