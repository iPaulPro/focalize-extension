<script lang="ts">
    import focalizeLogo from '../../assets/focalize-logo-large.svg';
    import lensLogo from '../../assets/lens-logo-small.svg';
    import InlineSVG from 'svelte-inline-svg';
    import {ensureCorrectChain} from '../../lib/ethers-service';
    import {authenticateUser} from '../../lib/lens-auth';
    import {currentUser} from '../../lib/stores/user-store';
    import {userFromProfile} from '../../lib/user';
    import toast from 'svelte-french-toast';

    const onSignInClick = async () => {
        try {
            await ensureCorrectChain();

            const authenticatedProfile = await authenticateUser();
            $currentUser = userFromProfile(authenticatedProfile);

            console.log('Authenticated user', $currentUser);
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

    <div class="flex flex-col items-center gap-4 mb-36">

      <InlineSVG src={focalizeLogo} alt="Focalize Logo" class="w-24 h-24"/>

      <button type="button" on:click={onSignInClick}
              class="mt-24 py-0 pr-6 pl-3 flex justify-center items-center bg-orange-500 hover:bg-orange-600
                  focus:ring-orange-400 focus:ring-offset-orange-200 text-white dark:text-gray-900 transition ease-in duration-200
                  text-center text-base font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2
                  focus:ring-offset-2 rounded-full hover:-translate-y-0.5">
        <InlineSVG src={lensLogo} alt="Lens Logo" class="w-12 h-12"/>
        Sign in with Lens
      </button>

    </div>

  </div>
</main>

<style>
</style>