<script lang="ts">
    import Toolbar from './Toolbar.svelte';
    import { setContext } from 'svelte';
    import {darkMode, useDispatcher, dispatcherDialogShown} from '../../lib/store/preferences';
    import SetDispatcherDialog from "../../new-post/components/SetDispatcherDialog.svelte";
    import {profile} from "../../lib/store/user";
    import GeneralSettings from "./GeneralSettings.svelte";
    import Sidebar from "./Sidebar.svelte";
    import NotificationSettings from "./NotificationSettings.svelte";
    import {writable} from "svelte/store";

    let enableDispatcherDialog: HTMLDialogElement;

    const activeTab = writable(0);
    setContext('activeTab', activeTab);

    $: {
        if ($useDispatcher) {
            if (!$profile.dispatcher?.canUseRelay) {
                enableDispatcherDialog?.showModal();
            }
        }
    }
</script>

<div class="flex flex-col w-full h-full {$darkMode ? 'dark bg-gray-800' : ''}">

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

<dialog id="enableDispatcherDialog" bind:this={enableDispatcherDialog} on:close={() => $dispatcherDialogShown = true}
        class="rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
  <SetDispatcherDialog on:success={enableDispatcherDialog?.close()}/>
</dialog>

<style>
</style>