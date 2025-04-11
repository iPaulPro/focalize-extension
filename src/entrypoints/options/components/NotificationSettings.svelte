<script lang="ts">
    import Select from 'svelte-select';
    import LensNodeSelect from './LensNodeSelect.svelte';
    import {
        darkMode,
        notificationsEnabled,
        notificationsRefreshInterval,
        nodeNotifications,
        notificationsGrouped,
        notificationsFiltered,
        notificationsForQuotes,
        notificationsForFollows,
        notificationsForPostActions,
        notificationsForComments,
        notificationsForMentions,
        notificationsForMirrors,
        notificationsForReactions,
        notificationsForGroups,
        notificationsForActions,
    } from '@/lib/stores/preferences-store';
    import type { RefreshInterval } from '@/lib/types/RefreshInterval';

    const collection: RefreshInterval[] = [
        { value: 1, label: '1 min' },
        { value: 5, label: '5 min' },
        { value: 15, label: '15 min' },
        { value: 30, label: '30 min' },
        { value: 60, label: '1 hr' },
    ];

    let selectedInterval: RefreshInterval | undefined = undefined;

    $: if (!selectedInterval && $notificationsRefreshInterval) {
        selectedInterval = $notificationsRefreshInterval;
    }

    $: if ($notificationsEnabled !== undefined) {
        // eslint-disable-next-line no-undef
        browser.runtime
            .sendMessage({ type: 'setNotificationsAlarm', enabled: $notificationsEnabled })
            .catch(console.error);
    }

    const onIntervalChange = () => {
        if (selectedInterval) {
            $notificationsRefreshInterval = selectedInterval;
            // eslint-disable-next-line no-undef
            browser.runtime
                .sendMessage({ type: 'setNotificationsAlarm', enabled: true })
                .catch(console.error);
        }
    };
</script>

<div class="h-screen overflow-auto px-4 pb-24 pt-6 md:px-8">
    <h1 class="text-2xl font-semibold tracking-tight text-neutral-800 dark:text-white">
        Lens notification settings
    </h1>

    <h2 class="pt-2 text-lg text-neutral-400">
        Control how and when you'll see system notifications
    </h2>

    <div class="w-full border-b border-b-gray-200 py-3 dark:border-b-gray-700 md:py-6"></div>

    <section class="flex w-full flex-col py-6 md:py-10">
        <div class="flex flex-col pb-4 md:flex-row md:gap-12">
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">
                        Desktop notifications
                    </div>
                    <div class="text-base text-neutral-400">
                        Focalize can create system notifications for every notification you receive
                        on Lens
                    </div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3">
                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsEnabled} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Notifications enabled
                        </div>
                        <div class="text-base text-neutral-400">Notify of activity on Lens</div>
                    </div>
                </div>

                <div
                    class="flex w-full xl:w-4/5 2xl:w-3/5 {!$notificationsEnabled
                        ? 'opacity-40'
                        : 'opacity-100'}"
                >
                    <div class="flex flex-col pl-16">
                        <div class="text-base font-medium dark:text-white">Refresh interval</div>
                        <div class="text-base text-neutral-400">
                            How often to check for new Lens notifications
                        </div>
                    </div>
                    <div class="flex flex-grow justify-end pl-2 pt-1">
                        <Select
                            items={collection}
                            bind:value={selectedInterval}
                            on:change={onIntervalChange}
                            clearable={false}
                            searchable={false}
                            showChevron={true}
                            disabled={!$notificationsEnabled}
                            --item-is-active-bg="#DB4700"
                            --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                            --font-size="0.875rem"
                            --background="transparent"
                            --list-background={$darkMode ? '#374354' : 'white'}
                            --selected-item-padding="0"
                            --list-border-radius="0.75rem"
                            class="!h-fit !w-fit !bg-white dark:!bg-gray-800
                            {$notificationsEnabled
                                ? '!shadow hover:!bg-gray-100 dark:hover:!bg-gray-600'
                                : ''}
                    !focus:outline-none !rounded-xl !border-none
                    !text-gray-800 ring-0 focus:!border-none focus:!ring-0 dark:!text-gray-300 dark:hover:!text-gray-100"
                        />
                    </div>
                </div>

                <div
                    class="flex w-full xl:w-4/5 2xl:w-3/5 {!$notificationsEnabled
                        ? 'opacity-40'
                        : 'opacity-100'}"
                >
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsGrouped} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Group notifications</div>
                        <div class="text-base text-neutral-400">
                            Only show one notification with my unseen Lens activity count
                        </div>
                    </div>
                </div>

                <div
                    class="flex w-full justify-between gap-2 xl:w-4/5 2xl:w-3/5
                        {!$notificationsEnabled || !$notificationsGrouped
                        ? 'opacity-40'
                        : 'opacity-100'}"
                >
                    <div class="flex flex-col pl-16">
                        <div class="text-base font-medium dark:text-white">App to launch</div>
                        <div class="text-base text-neutral-400">
                            When I click on a grouped notification
                        </div>
                    </div>
                    <LensNodeSelect
                        preference={nodeNotifications}
                        disabled={!$notificationsEnabled || !$notificationsGrouped}
                        notifications={true}
                    />
                </div>
            </div>
        </div>

        <div class="w-full border-b border-b-gray-200 pt-6 dark:border-b-gray-700"></div>

        <div
            class="flex flex-col pb-6 pt-10 md:flex-row md:gap-12 {!$notificationsEnabled
                ? 'opacity-40'
                : 'opacity-100'}"
        >
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">
                        Customize
                    </div>
                    <div class="text-base text-neutral-400">
                        Specify which kinds of events you'll receive system notifications for
                    </div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3">
                <div
                    class="flex w-full xl:w-4/5 2xl:w-3/5 {!$notificationsEnabled
                        ? 'opacity-40'
                        : 'opacity-100'}"
                >
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsFiltered} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Filter notifications
                            <span
                                class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal dark:bg-gray-700"
                                >Beta</span
                            >
                        </div>
                        <div class="text-base text-neutral-400">
                            Only show me relevant notifications
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForPostActions} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Post action alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify about post actions, like collects and tips
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForActions} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Account action alerts
                        </div>
                        <div class="text-base text-neutral-400">
                            Notify about account actions, like tips
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForComments} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Comment alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify of new comments on my content
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForFollows} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Follow alerts</div>
                        <div class="text-base text-neutral-400">Notify of new followers</div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForMentions} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Mention alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify when someone mentions me
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForMirrors} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Repost alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify when someone reposts my content
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForReactions} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Reaction alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify when someone likes my content
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForQuotes} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Quote alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify when someone quotes my posts and comments
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$notificationsForGroups} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Group alerts</div>
                        <div class="text-base text-neutral-400">
                            Notify about group membership requests and approvals
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>
