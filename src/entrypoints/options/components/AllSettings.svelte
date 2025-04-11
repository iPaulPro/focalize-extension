<script lang="ts">
    import Toolbar from './Toolbar.svelte';
    import { dispatcherDialogShown } from '@/lib/stores/preferences-store';
    import SetAccountManagerDialog from '@/lib/components/SetAccountManagerDialog.svelte';
    import { currentUser } from '@/lib/stores/user-store';
    import GeneralSettings from './GeneralSettings.svelte';
    import Sidebar from './Sidebar.svelte';
    import NotificationSettings from './NotificationSettings.svelte';
    import DialogOuter from '@/lib/components/DialogOuter.svelte';
    import { queryParams } from '@/lib/stores/url-query-store';
    import EditAccount from '@/entrypoints/options/components/EditAccount.svelte';

    let enableDispatcherDialog: HTMLDialogElement;

    const onDispatcherDialogClosed = () => {
        $dispatcherDialogShown = true;
    };

    $: activeTab = $queryParams.tab;

    $: if ($currentUser) {
        console.log('currentUser', $currentUser);
        if (!$currentUser.signless && !$dispatcherDialogShown && !enableDispatcherDialog?.open) {
            enableDispatcherDialog?.showModal();
        }
    }
</script>

<div class="flex h-full w-full flex-col bg-white dark:bg-gray-800">
    <main class="relative h-screen overflow-hidden">
        <div class="flex items-start justify-between">
            <Sidebar />

            <div class="flex w-full flex-col md:space-y-4">
                <header class="z-40 flex h-16 w-full items-center justify-between">
                    <Toolbar showIcon={false} />
                </header>

                {#if !activeTab || activeTab === 'general'}
                    <GeneralSettings />
                {:else if activeTab === 'account'}
                    <EditAccount />
                {:else if activeTab === 'notifications'}
                    <NotificationSettings />
                {/if}
            </div>
        </div>
    </main>
</div>

<dialog
    id="enableDispatcherDialog"
    bind:this={enableDispatcherDialog}
    on:close={onDispatcherDialogClosed}
    class="w-2/3 max-w-md rounded-2xl border border-gray-200 p-0 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
>
    <DialogOuter title="Enable Signless Posting">
        <SetAccountManagerDialog on:success={() => enableDispatcherDialog?.close()} />
    </DialogOuter>
</dialog>

<style>
</style>
