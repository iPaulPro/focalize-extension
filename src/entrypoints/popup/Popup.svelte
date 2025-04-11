<script lang="ts">
    import { darkMode } from '@/lib/stores/preferences-store';
    import { storePopup, TabGroup, Tab } from '@skeletonlabs/skeleton';
    import NotificationsList from './notifications/NotificationsList.svelte';
    import { clearBadge, getOpenGraphTags, launchComposerWindow } from '@/lib/utils/utils';
    import { onMount } from 'svelte';
    import { Toaster } from 'svelte-sonner';
    import { ensureUser } from '@/lib/user/user';
    import {
        KEY_NOTIFICATION_ITEMS_CACHE,
        KEY_NOTIFICATION_PAGE_INFO_CACHE,
        selectedMainTab,
        unreadNotificationsCount,
    } from '@/lib/stores/cache-store';
    import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
    import CurrentUserAvatar from '@/lib/components/CurrentUserAvatar.svelte';
    import FloatingComponent from '@/lib/components/FloatingComponent.svelte';

    let notificationsList: NotificationsList;
    let createButton: HTMLButtonElement;
    let showShareButton = false;

    $: {
        if ($darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    const onCreatePostClick = () => {
        launchComposerWindow();
    };

    // eslint-disable-next-line no-undef
    const isSystemTab = (tab: chrome.tabs.Tab) => {
        return (
            tab?.url?.startsWith('chrome://') ||
            tab?.url?.startsWith('chrome-extension://') ||
            tab?.url?.startsWith('brave://')
        );
    };

    const onShareTabClick = async () => {
        // eslint-disable-next-line no-undef
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        console.log('tab', tab);
        if (!tab.id || !tab.url) {
            await launchComposerWindow();
            return;
        }

        const url: string = tab.url;
        const title: string | undefined = tab.title;

        // If the current tab is a chrome page, update the current tab with the extension page
        if (isSystemTab(tab)) {
            await launchComposerWindow();
            return;
        }

        try {
            // eslint-disable-next-line no-undef
            const injected = await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: getOpenGraphTags,
            });

            const openGraphTags = injected[0]?.result ?? {};

            const tags = {
                title: openGraphTags.title ?? title,
                url: url,
                icon: tab.favIconUrl,
                description: openGraphTags.description ?? undefined,
                image: openGraphTags.image ?? undefined,
            };

            return launchComposerWindow(tags);
        } catch (e) {
            console.error(e);
        }

        return launchComposerWindow({ title, url });
    };

    const onNotificationsTabClick = async () => {
        if ($selectedMainTab !== 0) return;
        // eslint-disable-next-line no-undef
        await browser.storage.local.remove([
            KEY_NOTIFICATION_ITEMS_CACHE,
            KEY_NOTIFICATION_PAGE_INFO_CACHE,
        ]);
    };

    const scrollToTop = () => {
        if (notificationsList) {
            notificationsList.scrollToTop();
        }
    };

    onMount(async () => {
        await ensureUser();
        await clearBadge();
        storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });

        // eslint-disable-next-line no-undef
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        showShareButton = !isSystemTab(tab);
    });
</script>

<div class="flex h-full w-full flex-col">
    <TabGroup
        regionPanel="w-full flex-grow overflow-y-auto min-h-0 my-0"
        regionList="flex-shrink-0"
        padding="px-6 py-2"
        border="border-b border-gray-200 dark:border-gray-700"
        class="flex h-full flex-col !space-y-0"
    >
        <Tab bind:group={$selectedMainTab} name="tab1" value={0} on:click={onNotificationsTabClick}>
            <div class="relative mt-2 inline-block h-full w-full">
                {#if $selectedMainTab !== 0 && $unreadNotificationsCount > 0}
                    <span
                        class="variant-filled-primary absolute -right-1.5 -top-1.5 z-10 h-2 w-2 rounded-full"
                    ></span>
                {/if}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    class="h-6 w-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"
                    />
                </svg>
            </div>
        </Tab>

        <div on:click={scrollToTop} class="flex w-full items-center justify-end gap-2 px-4">
            <button
                type="button"
                bind:this={createButton}
                on:click={onCreatePostClick}
                class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
                <svg
                    class="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"
                    ></path>
                    <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
            </button>

            <div class="h-10 w-10">
                <CurrentUserAvatar />
            </div>
        </div>

        <!-- Tab Panels --->
        <svelte:fragment slot="panel">
            {#if $selectedMainTab === 0}
                <NotificationsList bind:this={notificationsList} />
            {/if}
        </svelte:fragment>
    </TabGroup>
</div>

<Toaster richColors position="bottom-right" expand={true} />

{#if showShareButton}
    <FloatingComponent anchors={[createButton]} interactive={true} hideDelay={200} showDelay={0}>
        <ul
            class="w-48 overflow-hidden rounded-xl bg-white text-black shadow-xl dark:bg-gray-700 dark:text-white"
        >
            <li>
                <button type="button" class="menu-button" on:click={onCreatePostClick}>
                    <svg
                        class="menu-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h6" />
                        <path d="M14 3v5h5M18 21v-6M15 18h6" />
                    </svg>
                    New post
                </button>
            </li>
            <li>
                <button type="button" class="menu-button" on:click={onShareTabClick}>
                    <svg
                        class="menu-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path
                            d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 4.2v10.3"
                        />
                    </svg>
                    Share current tab
                </button>
            </li>
        </ul>
    </FloatingComponent>
{/if}

<style>
    .menu-button {
        @apply flex h-full w-full items-center gap-2 px-3.5 py-3 text-start text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600;
    }

    .menu-icon {
        @apply h-5 w-5 select-none transition-none group-hover:text-orange;
    }
</style>
