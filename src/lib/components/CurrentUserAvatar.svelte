<script lang="ts">
    import tooltip from 'svelte-ktippy';
    import AccountChooser from './AccountChooser.svelte';
    import ConfirmLogoutDialog from './ConfirmLogoutDialog.svelte';
    import DialogOuter from './DialogOuter.svelte';
    import { currentUser } from '../stores/user-store';

    export let showSettings = true;

    let avatarError = false;
    let logoutDialog: HTMLDialogElement;

    const showLogoutDialog = () => {
        logoutDialog.showModal();
    };
</script>

<div
    class="tooltip h-full w-full flex-none cursor-pointer"
    use:tooltip={{
        // @ts-expect-error ignore
        component: AccountChooser,
        props: { showSettings },
        trigger: 'click',
        interactive: true,
        placement: 'auto',
    }}
    on:logout={showLogoutDialog}
>
    {#if avatarError || !$currentUser?.avatarUrl}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="aspect-square w-full rounded-full bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300"
        >
            <path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3" />
            <circle cx="12" cy="10" r="3" />
            <circle cx="12" cy="12" r="10" />
        </svg>
    {:else if $currentUser}
        <img
            src={$currentUser.avatarUrl}
            alt="Account avatar"
            class="aspect-square w-full rounded-full border-2 border-transparent object-contain hover:border-orange"
            on:error={() => {
                avatarError = true;
            }}
        />
    {/if}
</div>

<dialog
    id="logoutDialog"
    bind:this={logoutDialog}
    on:click={(event) => {
        if (event.target && 'id' in event.target && event.target?.id === 'logoutDialog')
            logoutDialog?.close();
    }}
    class="rounded-2xl border border-gray-200 p-0 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
>
    <DialogOuter title="Log out">
        <ConfirmLogoutDialog />
    </DialogOuter>
</dialog>

<style>
</style>
