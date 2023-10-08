<script lang='ts'>
    import {
        darkMode, messagesHideEmptyThreads, messagesHideUnknownSenders,
        messagesNotificationFromFollowing, messagesPlaySounds,
        messagesRefreshEnabled, messagesRefreshInterval, messagesWalletToWallet,
    } from '../../lib/stores/preferences-store';
    import Select from 'svelte-select';
    import type { RefreshInterval } from '../../lib/notifications/RefreshInterval';

    const collection: RefreshInterval[] = [
        {value: 1, label: '1 min'},
        {value: 5, label: '5 min'},
        {value: 15, label: '15 min'},
        {value: 30, label: '30 min'},
        {value: 60, label: '1 hr'},
    ];

    let selectedInterval: RefreshInterval | undefined = undefined;

    $: if (!selectedInterval && $messagesRefreshInterval) {
        selectedInterval = $messagesRefreshInterval;
    }

    const onIntervalChange = () => {
        if (selectedInterval) {
            $messagesRefreshInterval = selectedInterval;
            chrome.runtime.sendMessage({type: 'setMessagesAlarm', enabled: true}).catch(console.error);
        }
    }
</script>

<div class="h-screen px-4 pb-24 pt-6 overflow-auto md:px-8">

    <h1 class="text-2xl font-semibold text-neutral-800 dark:text-white tracking-tight">
        Messaging settings
    </h1>

    <h2 class="text-neutral-400 text-lg pt-2">
        Configure your messaging settings
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
                        Focalize can create system notifications for every message you receive on XMTP
                    </div>
                </div>
            </div>

            <div class="w-full md:w-2/3 flex flex-col gap-6 xl:pr-48">

                <div class="w-full flex">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$messagesRefreshEnabled}>
                            <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Notifications enabled
                        </div>
                        <div class="text-base text-neutral-400">
                            Create system notifications for new messages on XMTP
                        </div>
                    </div>
                </div>

                <div class="w-full flex {!$messagesRefreshEnabled ? 'opacity-40' : 'opacity-100'}">
                    <div class="flex flex-col flex-grow pl-16">
                        <div class="text-base font-medium dark:text-white">
                            Refresh interval
                        </div>
                        <div class="text-base text-neutral-400">
                            How often to check for new messages
                        </div>
                    </div>
                    <div class="pt-1 pl-2 flex flex-none justify-end">
                        <Select items={collection} bind:value={selectedInterval} on:change={onIntervalChange}
                                clearable={false} searchable={false} showChevron={true} disabled={!$messagesRefreshEnabled}
                                --item-is-active-bg="#DB4700" --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                                --font-size="0.875rem" --background="transparent"
                                --list-background={$darkMode ? '#374354' : 'white'}
                                --selected-item-padding="0" --list-border-radius="0.75rem"
                                class="!w-fit !h-fit !bg-white dark:!bg-gray-800
                                {$messagesRefreshEnabled ? 'hover:!bg-gray-100 dark:hover:!bg-gray-600 !shadow' : ''}
                                !text-gray-800 dark:!text-gray-300 dark:hover:!text-gray-100
                                !rounded-xl !border-none ring-0 !focus:outline-none focus:!ring-0 focus:!border-none"/>
                    </div>
                </div>

                <div class="w-full flex">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$messagesNotificationFromFollowing}>
                            <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Only known senders
                        </div>
                        <div class="text-base text-neutral-400">
                            Only notify of messages from the profiles that you follow and wallets you have engaged with
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700 pt-6"></div>

        <div class="flex flex-col md:flex-row md:gap-12 pb-6 pt-10">

            <div class="w-full md:w-1/3 grow-0 shrink-0">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">
                        Options
                    </div>
                    <div class="text-base text-neutral-400">
                        Configure the types of messages you'll see in the messaging tab and manage your messaging preferences
                    </div>
                </div>
            </div>

            <div class="w-full md:w-2/3 flex flex-col gap-6">

                <div class="w-full xl:w-4/5 2xl:w-3/5 flex">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$messagesWalletToWallet}>
                            <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Wallet-to-wallet messaging
                        </div>
                        <div class="text-base text-neutral-400">
                            Display and notify for all messages delivered via XMTP, including those that are not from Lens users
                        </div>
                    </div>
                </div>

                <div class="w-full xl:w-4/5 2xl:w-3/5 flex">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$messagesHideUnknownSenders}>
                            <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Hide unknown senders
                        </div>
                        <div class="text-base text-neutral-400">
                            Hide messages from unknown senders, accessible from the "requests" tab
                        </div>
                    </div>
                </div>

                <div class="w-full xl:w-4/5 2xl:w-3/5 flex">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$messagesHideEmptyThreads}>
                            <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Hide empty conversations
                        </div>
                        <div class="text-base text-neutral-400">
                            Hide conversations that have no messages
                        </div>
                    </div>
                </div>

                <div class="w-full xl:w-4/5 2xl:w-3/5 flex">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$messagesPlaySounds}>
                            <span class="slider round flex justify-between items-center px-2
                  shadow-none"></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            New message sounds
                        </div>
                        <div class="text-base text-neutral-400">
                            Play a sound when a new message is received
                        </div>
                    </div>
                </div>

            </div>
        </div>

    </section>
</div>