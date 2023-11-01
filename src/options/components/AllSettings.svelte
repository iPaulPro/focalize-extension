<script lang="ts">
    import Toolbar from './Toolbar.svelte';
    import {useProfileManager, dispatcherDialogShown} from '../../lib/stores/preferences-store';
    import SetProfileManagerDialog from "../../window/components/SetProfileManagerDialog.svelte";
    import {currentUser} from "../../lib/stores/user-store";
    import GeneralSettings from "./GeneralSettings.svelte";
    import Sidebar from "./Sidebar.svelte";
    import NotificationSettings from "./NotificationSettings.svelte";
    import DialogOuter from '../../lib/components/DialogOuter.svelte';
    import MessagingSettings from './MessagingSettings.svelte';
    import { queryParams } from '../../lib/stores/url-query-store';

    let enableDispatcherDialog: HTMLDialogElement;

    const onDispatcherDialogClosed = () => {
        $dispatcherDialogShown = true

        if ($currentUser?.canUseRelay === false) {
            $useProfileManager = false;
        }
    };

    $: activeTab = $queryParams.tab;

    $: if ($currentUser) {
        console.log('currentUser', $currentUser, $useProfileManager);
        if ($useProfileManager && !$currentUser.canUseRelay && !enableDispatcherDialog?.open) {
            enableDispatcherDialog?.showModal();
        }

        if ($dispatcherDialogShown && $currentUser.canUseRelay === false) {
            $useProfileManager = false;
        }
    }
</script>

<div class="flex flex-col w-full h-full bg-white dark:bg-gray-800">

  <main class="relative h-screen overflow-hidden">

    <div class="flex items-start justify-between">

      <Sidebar/>

      <div class="flex flex-col w-full md:space-y-4">

        <header class="z-40 flex items-center justify-between w-full h-16">
          <Toolbar showIcon={false}/>
        </header>

        {#if !activeTab || activeTab === 'general'}
          <GeneralSettings/>
        {:else if activeTab === 'notifications'}
          <NotificationSettings/>
        {:else if activeTab === 'messaging'}
          <MessagingSettings/>
        {/if}

      </div>

    </div>

  </main>

</div>

<dialog id="enableDispatcherDialog" bind:this={enableDispatcherDialog} on:close={onDispatcherDialogClosed}
        class="w-2/3 max-w-md rounded-2xl shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0">
  <DialogOuter title="Enable Profile Manager">
    <SetProfileManagerDialog on:success={() => enableDispatcherDialog?.close()} />
  </DialogOuter>
</dialog>

<style>
</style>