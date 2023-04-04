<script lang="ts">
    import Toolbar from './Toolbar.svelte';
    import { setContext } from 'svelte';
    import {darkMode, useDispatcher, dispatcherDialogShown} from '../../lib/stores/preferences-store';
    import SetDispatcherDialog from "../../popup/components/SetDispatcherDialog.svelte";
    import {currentUser} from "../../lib/stores/user-store";
    import GeneralSettings from "./GeneralSettings.svelte";
    import Sidebar from "./Sidebar.svelte";
    import NotificationSettings from "./NotificationSettings.svelte";
    import {writable} from "svelte/store";

    let enableDispatcherDialog: HTMLDialogElement;

    const activeTab = writable(0);
    setContext('activeTab', activeTab);

    const onDispatcherDialogClosed = () => {
        $dispatcherDialogShown = true

        if ($currentUser?.canUseRelay === false) {
            $useDispatcher = false;
        }
    };

    $: {
        if ($currentUser) {
            if ($useDispatcher && !$currentUser.canUseRelay && !enableDispatcherDialog?.open) {
                enableDispatcherDialog?.showModal();
            }

            if ($dispatcherDialogShown && $currentUser.canUseRelay === false) {
                $useDispatcher = false;
            }
        }
    }
</script>

<div class="flex flex-col w-full h-full dark:bg-gray-800">

  <main class="relative h-screen overflow-hidden">

    <div class="flex items-start justify-between">

      <Sidebar/>

      <div class="flex flex-col w-full md:space-y-4">

        <header class="z-40 flex items-center justify-between w-full h-16">
          <Toolbar showIcon={false}/>
        </header>

        {#if $activeTab === 0}
          <GeneralSettings/>
        {:else if $activeTab === 2}
          <NotificationSettings/>
        {/if}

      </div>

    </div>

  </main>

</div>

<dialog id="enableDispatcherDialog" bind:this={enableDispatcherDialog} on:close={onDispatcherDialogClosed}
        class="rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
  <SetDispatcherDialog on:success={enableDispatcherDialog?.close()}/>
</dialog>

<style>
</style>