<script lang="ts">
    import Select from 'svelte-select';

    import {darkMode, notificationsEnabled, notificationsRefreshInterval,} from "../../lib/store/preferences-store";
    import type {RefreshInterval} from '../../lib/store/preferences-store'
    import {nodeNotifications} from "../../lib/store/preferences-store";

    import LensNodeSelect from "./LensNodeSelect.svelte";

    const collection: RefreshInterval[] = [
        {value: 1, label: '1 min'},
        {value: 5, label: '5 min'},
        {value: 15, label: '15 min'},
        {value: 30, label: '30 min'},
        {value: 60, label: '1 hr'},
    ];

    let selectedInterval;

    $: {
        if (!selectedInterval && $notificationsRefreshInterval) {
            selectedInterval = $notificationsRefreshInterval;
        }

        chrome.runtime.sendMessage({setAlarm: $notificationsEnabled}).catch(console.error);
    }

    const onIntervalChange = (event) => {
        $notificationsRefreshInterval = event.detail;
    }
</script>

<div class="h-screen px-4 pb-24 pt-6 overflow-auto md:px-8">

  <h1 class="text-2xl font-semibold text-neutral-800 dark:text-white">
    Notification settings
  </h1>

  <h2 class="text-neutral-400 text-lg pt-2">
    Control what type of desktop notifications are enabled, and how often to check for new ones.
  </h2>

  <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 py-3 md:py-6"></div>

  <section class="w-full flex flex-col py-6 md:py-12">

    <div class="flex flex-col md:flex-row md:gap-12 pb-8">

      <div class="w-full md:w-1/3">
        <div class="flex flex-col pb-6">
          <div class="text-lg font-medium text-neutral-800 dark:text-white">
            Desktop notifications
          </div>
          <div class="text-base text-neutral-400">
            Focalize can create system notifications for every notification you get on Lens
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
              Notify me of unread notifications on Lens
            </div>
          </div>
        </div>

        <div class="w-full xl:w-4/5 flex {!$notificationsEnabled ? 'opacity-40' : 'opacity-100'}">
          <div class="flex flex-col pl-[4.5rem]">
            <div class="text-base font-medium dark:text-white">
              Refresh interval
            </div>
            <div class="text-base text-neutral-400">
              How often to check for new notifications
            </div>
          </div>
          <div class="pt-1 pl-2 flex flex-grow justify-end">
            <Select items={collection} bind:value={selectedInterval} on:change={onIntervalChange}
                    clearable={false} searchable={false} showChevron={true} disabled={!$notificationsEnabled}
                    --item-is-active-bg="#DB4700" --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                    --font-size="0.875rem" --background="transparent"
                    --list-background={$darkMode ? '#374354' : 'white'}
                    --selected-item-padding="0" --list-border-radius="0.75rem"
                    class="w-fit h-fit bg-white dark:bg-gray-800
                    {$notificationsEnabled ? 'hover:bg-gray-100 dark:hover:bg-gray-600 shadow' : ''}
                    text-gray-800 dark:text-gray-300 dark:hover:text-gray-100
                    rounded-xl border-none ring-0 focus:outline-none focus:ring-0 focus:border-none"/>
          </div>
        </div>

        <div class="w-full xl:w-4/5 flex flex-col md:flex-row gap-2 justify-between
             {!$notificationsEnabled ? 'opacity-40' : 'opacity-100'}">
          <div class="flex flex-col pl-[4.5rem]">
            <div class="text-base font-medium dark:text-white">
              App to launch
            </div>
            <div class="text-base text-neutral-400">
              When you click on a notification
            </div>
          </div>
          <LensNodeSelect preference={nodeNotifications} disabled={!$notificationsEnabled} notifications={true}/>
        </div>

      </div>

    </div>

    <div class="w-full  border-b border-b-gray-200 dark:border-b-gray-700 pt-6"></div>

  </section>
</div>