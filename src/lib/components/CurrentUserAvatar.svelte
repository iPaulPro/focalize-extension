<script lang="ts">
    import tooltip from "svelte-ktippy"
    import InlineSVG from "svelte-inline-svg";
    import AccountChooser from './AccountChooser.svelte';
    import ConfirmLogoutDialog from './ConfirmLogoutDialog.svelte';
    import DialogOuter from './DialogOuter.svelte';
    import ImageAvatar from '../../assets/ic_avatar.svg';
    import {currentUser} from '../stores/user-store';

    export let showSettings = true;

    let avatarError;
    let logoutDialog: HTMLDialogElement;

    const showLogoutDialog = () => {
        logoutDialog.showModal();
    };
</script>

<div class="w-full h-full cursor-pointer tooltip flex-none"
     use:tooltip={{
           component: AccountChooser,
           props: {showSettings},
           trigger: 'click',
           interactive: true,
           placement: 'auto'
         }}
     on:logout={showLogoutDialog}>

  {#if avatarError || !$currentUser?.avatarUrl}
    <InlineSVG src={ImageAvatar}
               class="w-full aspect-square rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300" />
  {:else if $currentUser}
    <img src={$currentUser.avatarUrl} alt="Profile avatar"
         class="w-full aspect-square object-contain rounded-full border-2 border-transparent hover:border-orange"
         on:error={() => {avatarError = true}}>
  {/if}

</div>

<dialog id="logoutDialog" bind:this={logoutDialog}
        on:click={(event) => {if (event.target.id === 'logoutDialog') logoutDialog?.close()}}
        class="rounded-2xl shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0">
  <DialogOuter title="Log out">
    <ConfirmLogoutDialog />
  </DialogOuter>
</dialog>

<style>
</style>