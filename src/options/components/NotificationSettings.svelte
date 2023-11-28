<script lang="ts">
    import Select from 'svelte-select';

    import {
        darkMode,
        messagesRefreshEnabled,
        notificationsEnabled,
        notificationsForQuotes,
        notificationsRefreshInterval,
    } from '../../lib/stores/preferences-store';
    import {nodeNotifications, notificationsForFollows, notificationsGrouped} from "../../lib/stores/preferences-store";

    import LensNodeSelect from "./LensNodeSelect.svelte";
    import {
        notificationsFiltered, notificationsForCollects, notificationsForComments,
        notificationsForMentions, notificationsForMirrors, notificationsForReactions
    } from '../../lib/stores/preferences-store';
    import type {RefreshInterval} from '../../lib/notifications/RefreshInterval';

    const collection: RefreshInterval[] = [
        {value: 1, label: '1 min'},
        {value: 5, label: '5 min'},
        {value: 15, label: '15 min'},
        {value: 30, label: '30 min'},
        {value: 60, label: '1 hr'},
    ];

    let selectedInterval: RefreshInterval | undefined = undefined;

    $: if (!selectedInterval && $notificationsRefreshInterval) {
        selectedInterval = $notificationsRefreshInterval;
    }

    $: if ($notificationsEnabled !== undefined) {
        chrome.runtime.sendMessage({type: 'setNotificationsAlarm', enabled: $notificationsEnabled}).catch(console.error);
    }

    $: if ($messagesRefreshEnabled !== undefined) {
        chrome.runtime.sendMessage({type: 'setMessagesAlarm', enabled: $messagesRefreshEnabled}).catch(console.error);
    }

    const onIntervalChange = () => {
      if (selectedInterval) {
        $notificationsRefreshInterval = selectedInterval;
        chrome.runtime.sendMessage({type: 'setNotificationsAlarm', enabled: true}).catch(console.error);
      }
    }
</script>

<div class="h-screen px-4 pb-24 pt-6 overflow-auto md:px-8">

  <h1 class="text-2xl font-semibold text-neutral-800 dark:text-white tracking-tight">
    Lens notification settings
  </h1>

  <h2 class="text-neutral-400 text-lg pt-2">
    Control how and when you'll see system notifications
  </h2>

  <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 py-3 md:py-6"></div>

  <section class="w-full flex flex-col py-6 md:py-10">

    <div class="flex flex-col md:flex-row md:gap-12 pb-4">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Desktop notifications
          </div>
          <div class="text-base text-neutral-400">
            Focalize can create system notifications for every notification you receive on Lens
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 flex flex-col gap-6">

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsEnabled}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Notifications enabled
            </div>
            <div class="text-base text-neutral-400">
              Notify of activity on Lens
            </div>
          </div>
        </div>

        <div class="w-full xl:w-4/5 2xl:w-3/5 flex {!$notificationsEnabled ? 'opacity-40' : 'opacity-100'}">
          <div class="flex flex-col pl-16">
            <div class="text-base font-medium dark:text-white">
              Refresh interval
            </div>
            <div class="text-base text-neutral-400">
              How often to check for new Lens notifications
            </div>
          </div>
          <div class="pt-1 pl-2 flex flex-grow justify-end">
            <Select items={collection} bind:value={selectedInterval} on:change={onIntervalChange}
                    clearable={false} searchable={false} showChevron={true} disabled={!$notificationsEnabled}
                    --item-is-active-bg="#DB4700" --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                    --font-size="0.875rem" --background="transparent"
                    --list-background={$darkMode ? '#374354' : 'white'}
                    --selected-item-padding="0" --list-border-radius="0.75rem"
                    class="!w-fit !h-fit !bg-white dark:!bg-gray-800
                    {$notificationsEnabled ? 'hover:!bg-gray-100 dark:hover:!bg-gray-600 !shadow' : ''}
                    !text-gray-800 dark:!text-gray-300 dark:hover:!text-gray-100
                    !rounded-xl !border-none ring-0 !focus:outline-none focus:!ring-0 focus:!border-none"/>
          </div>
        </div>

        <div class="w-full xl:w-4/5 2xl:w-3/5 flex {!$notificationsEnabled ? 'opacity-40' : 'opacity-100'}">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsGrouped}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Group notifications
            </div>
            <div class="text-base text-neutral-400">
              Only show one notification with my unseen Lens activity count
            </div>
          </div>
        </div>

        <div class="w-full xl:w-4/5 2xl:w-3/5 flex gap-2 justify-between
             {!$notificationsEnabled || !$notificationsGrouped ? 'opacity-40' : 'opacity-100'}">
          <div class="flex flex-col pl-16">
            <div class="text-base font-medium dark:text-white">
              App to launch
            </div>
            <div class="text-base text-neutral-400">
              When I click on a grouped notification
            </div>
          </div>
          <LensNodeSelect preference={nodeNotifications} disabled={!$notificationsEnabled || !$notificationsGrouped}
                          notifications={true}/>
        </div>

      </div>

    </div>

    <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 pt-6"></div>

    <div class="flex flex-col md:flex-row md:gap-12 pb-6 pt-10 {!$notificationsEnabled ? 'opacity-40' : 'opacity-100'}">

      <div class="w-full md:w-1/3 grow-0 shrink-0">
        <div class="flex flex-col pb-6 pr-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Customize
          </div>
          <div class="text-base text-neutral-400">
            Specify which kinds of events you'll receive system notifications for
          </div>
        </div>
      </div>

      <div class="w-full md:w-2/3 flex flex-col gap-6">

        <div class="w-full xl:w-4/5 2xl:w-3/5 flex {!$notificationsEnabled ? 'opacity-40' : 'opacity-100'}">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsFiltered}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Filter notifications
              <span class="py-0.5 px-2 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-normal">Beta</span>
            </div>
            <div class="text-base text-neutral-400">
              Only show me relevant notifications
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForCollects}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Collect alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify when someone collects my content
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForComments}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Comment alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify of new comments on my content
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForFollows}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Follow alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify of new followers
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForMentions}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Mention alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify when someone mentions me
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForMirrors}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Mirror alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify when someone mirrors my content
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForReactions}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Reaction alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify when someone likes my content
            </div>
          </div>
        </div>

        <div class="w-full flex">
          <div class="pt-1">
            <label class="switch">
              <input type="checkbox" bind:checked={$notificationsForQuotes}>
              <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
            </label>
          </div>

          <div class="flex flex-col pl-4">
            <div class="text-base font-medium dark:text-white">
              Quote alerts
            </div>
            <div class="text-base text-neutral-400">
              Notify when someone quotes my posts and comments
            </div>
          </div>
        </div>

      </div>

    </div>

  </section>

</div>