<script lang="ts">
    import focalizeLogo from '~/assets/focalize-logo-large.svg';
    import { releaseDismissed } from '@/lib/stores/preferences-store';
    import { getLatestRelease } from '@/lib/github-service';
    import { queryParams } from '@/lib/stores/url-query-store';

    type Tab = {
        name: string;
        icon: string;
        id?: string;
    };

    const tabs: Tab[] = [
        {
            name: 'General',
            icon: '<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>',
            id: 'general',
        },
        {
            name: 'Account',
            icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            id: 'account',
        },
        {
            name: 'Notifications',
            icon: '<path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path>',
            id: 'notifications',
        },
        {
            name: 'Share feedback',
            icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
        },
    ];

    let activeTab: string = $queryParams.tab ?? tabs[0].id;

    $: if (activeTab) {
        $queryParams.tab = activeTab;
    }

    // eslint-disable-next-line no-undef
    const getVersionName = () => browser.runtime.getManifest().version_name;

    const onShareFeedbackClick = () => {
        window.open('https://github.com/iPaulPro/focalize-extension/issues', '_blank');
    };

    const onTabClick = (tab: Tab) => {
        if (!tab.id) {
            onShareFeedbackClick();
            return;
        }
        activeTab = tab.id;
    };
</script>

<div
    class="relative hidden h-screen w-80 border-r border-r-gray-200 bg-neutral-50 dark:border-r-gray-700 dark:bg-gray-900 lg:block"
>
    <div class="flex h-full flex-col">
        <div class="ml-4 flex items-center justify-start pt-6">
            <img class="ml-1 inline h-8 w-8" src={focalizeLogo} alt="Focalize" />
            <div class="ml-2 text-xl font-bold text-neutral-800 dark:text-white">Focalize</div>
        </div>

        <nav class="mt-6 flex-grow">
            <div class="flex flex-col gap-3">
                {#each tabs as tab, index (index)}
                    <button
                        on:click={() => onTabClick(tab)}
                        class="flex w-auto items-center justify-start gap-1 rounded-full p-2 pl-6 text-start
                            transition-colors duration-200 hover:text-neutral-800 dark:hover:text-gray-200
                            {activeTab === tab.id
                            ? 'text-neutral-800 dark:text-white'
                            : 'border-transparent text-neutral-400'}"
                    >
                        <span class="text-left">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                class="h-5 w-5 transition-none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                                {@html tab.icon}
                            </svg>
                        </span>

                        <span class="flex items-center gap-2 px-2 text-lg font-medium">
                            {tab.name}
                        </span>

                        {#if activeTab === tab.id}
                            <div class="flex flex-grow justify-end pr-1">
                                <div class="rounded-full bg-orange p-1.5"></div>
                            </div>
                        {/if}
                    </button>
                {/each}
            </div>
        </nav>

        <div class="flex flex-col">
            {#await getLatestRelease() then release}
                {#if $releaseDismissed !== release.name}
                    <div
                        class="relative m-3 flex flex-col gap-1 rounded border bg-white p-4 hover:bg-orange-50 dark:border-gray-700
                   dark:bg-gray-800 dark:hover:bg-gray-700"
                    >
                        <div
                            class="flex items-center gap-1 text-base font-bold text-gray-700 dark:text-white"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="inline w-5 transition-none"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="2"></circle>
                                <path
                                    d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"
                                ></path>
                            </svg>

                            <a
                                href="https://github.com/iPaulPro/focalize-extension/releases/latest"
                                target="_blank"
                                rel="noreferrer"
                                class="block tracking-tight"
                            >
                                What's new in {release.name}?
                            </a>
                        </div>

                        <p
                            class="line-clamp-6 whitespace-pre-wrap text-gray-500 dark:text-gray-400"
                        >
                            {release.body}
                        </p>

                        <button
                            on:click={() => ($releaseDismissed = release.name)}
                            class="w-fit pt-1 text-start font-medium text-orange-700 hover:underline dark:text-orange-400"
                        >
                            Dismiss
                        </button>
                    </div>
                {/if}
            {/await}

            <div
                class="flex items-center justify-between border-t border-t-gray-200 px-4 py-2 text-gray-500 dark:border-t-gray-700 dark:text-neutral-300"
            >
                <a
                    class="text-sm"
                    href="https://github.com/iPaulPro/focalize-extension/releases/tag/{'v' +
                        getVersionName()}"
                    target="_blank"
                    rel="noreferrer"
                >
                    v{getVersionName()}
                </a>

                <div class="flex items-center gap-2">
                    <a
                        href="https://share.lens.xyz/u/lens/focalize"
                        title="Lens"
                        target="_blank"
                        rel="noreferrer"
                        class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-500"
                    >
                        <svg viewBox="0 0 290 186" fill="currentColor" class="w-6 transition-none">
                            <path
                                d="M145.24.08c13.96 0 27.11 4.67 36.99 13.16 10.36 8.89 16.4 21.24 17.62 35.88 11.21-9.5 24.22-13.96 37.83-12.92 12.99.99 25.59 6.97 35.46 16.85 9.88 9.88 15.86 22.47 16.85 35.47 1.12 14.73-4.19 28.75-15.35 40.55a211.07 211.07 0 0 1-3.31 3.41c-52.846 52.836-121.756 53.963-125.992 53.98h-.108c-2.94 0-72.72-.61-126.08-53.98a151.15 151.15 0 0 1-3.31-3.41C4.67 117.27-.64 103.25.49 88.52c.99-12.99 6.97-25.59 16.85-35.47 9.88-9.88 22.47-15.86 35.47-16.85 13.61-1.04 26.62 3.42 37.83 12.92 1.21-14.64 7.26-26.99 17.61-35.88C118.14 4.75 131.28.08 145.24.08Zm15.1 141.36c-2.7 4.96-8.68 8.17-15.23 8.17-6.55 0-12.52-3.21-15.23-8.17l-7.03 3.83c4.08 7.49 12.82 12.34 22.25 12.34s18.17-4.85 22.27-12.34Zm-56.1-42.85c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.223 0 2.426.071 3.603.21a11.507 11.507 0 0 0-5.913 10.06c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.58-.043-1.15-.126-1.708 3.297 3.63 5.256 8.152 5.256 13.048h8c0-16.33-15.18-29.61-33.84-29.61Zm82.06 0c-18.66 0-33.84 13.29-33.84 29.61h8c0-11.92 11.59-21.61 25.84-21.61 1.225 0 2.431.072 3.611.211A11.507 11.507 0 0 0 184 116.86c0 6.357 5.153 11.51 11.51 11.51s11.51-5.153 11.51-11.51c0-.576-.042-1.142-.124-1.695 3.29 3.627 5.244 8.145 5.244 13.035h8c0-16.33-15.18-29.61-33.84-29.61Z"
                            />
                        </svg>
                    </a>
                    <a
                        href="https://github.com/iPaulPro/focalize-extension"
                        title="Github"
                        target="_blank"
                        rel="noreferrer"
                        class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-500"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-5 transition-none"
                        >
                            <path
                                d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.627-5.373-12-12-12"
                                fill="currentColor"
                                fill-rule="nonzero"
                            />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
</style>
