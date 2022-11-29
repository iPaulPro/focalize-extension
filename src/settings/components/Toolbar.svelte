<script lang="ts">
    import tooltip from "svelte-ktippy"
    import InlineSVG from 'svelte-inline-svg';
    import {link} from 'svelte-spa-router'

    import AccountChooser from "../../components/AccountChooser.svelte";
    import ConfirmLogoutDialog from '../../components/ConfirmLogoutDialog.svelte'

    import focalizeLogo from '../../assets/focalize-logo-large.svg';
    import ImageAvatar from '../../assets/ic_avatar.svg';

    import {profile} from "../../lib/store/user";

    let avatarError;
    let logoutDialog: HTMLDialogElement;

    const showLogoutDialog = () => {
        logoutDialog = document.getElementById('logoutDialog');
        logoutDialog.showModal();
    };

</script>

<nav class="bg-white dark:bg-gray-800  shadow ">

  <div class="px-8">

    <div class="flex items-center justify-between h-16">

      <div class=" flex items-center">
        <a href="/src/" class="flex-shrink-0" use:link>
          <InlineSVG class="h-8 w-8" src={focalizeLogo} alt="Focalize"/>
        </a>
      </div>

      <div class="block">

        <div class="ml-4 flex items-center md:ml-6">

          <a href="/post" use:link
             class="p-3 rounded-full text-gray-700 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-500
             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">

            <span class="sr-only">
                New post
            </span>

            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h6"/>
              <path d="M14 3v5h5M18 21v-6M15 18h6"/>
            </svg>

          </a>

          <div class="ml-6 relative">

            <div class="relative inline-block text-left">

              <div class="tooltip flex items-center justify-center w-full rounded-full p-2 text-sm font-medium cursor-pointer
                   text-gray-700 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
                   use:tooltip={{
                      component: AccountChooser,
                      props: {showSettings: false},
                      trigger: 'click',
                      interactive: true,
                      placement: 'bottom-end'
                     }}
                   on:logout={showLogoutDialog}>

                {#if avatarError || !$profile?.picture?.original}
                  <InlineSVG src={ImageAvatar}
                             class="w-8 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300"/>
                {:else if $profile}
                  <img src={$profile.picture?.original?.url} alt="Profile avatar"
                       class="w-8 aspect-square object-contain rounded-full"
                       on:error={() => {avatarError = true}}>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-8"
                       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3"/>
                    <circle cx="12" cy="10" r="3"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                {/if}

              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</nav>

<dialog id="logoutDialog" class="rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
  <ConfirmLogoutDialog/>
</dialog>