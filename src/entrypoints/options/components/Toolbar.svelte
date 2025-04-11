<script lang="ts">
    import focalizeLogo from '~/assets/focalize-logo-large.svg';
    import CurrentUserAvatar from '@/lib/components/CurrentUserAvatar.svelte';

    export let showIcon = true;
</script>

<nav
    class="w-full flex-none border-b border-b-gray-200 bg-white dark:border-b-gray-700 dark:bg-gray-800"
>
    <div class="px-4 md:px-8">
        <div class="flex h-16 items-center justify-between">
            {#if showIcon}
                <div class="flex items-center">
                    <a href="/options.html" class="flex-shrink-0">
                        <img class="h-8 w-8" src={focalizeLogo} alt="Focalize" />
                    </a>
                </div>
            {:else}
                <div class="block">
                    <button
                        class="text-md flex items-center rounded-full p-2 text-gray-500 lg:hidden"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
            {/if}

            <div class="block">
                <div class="ml-4 flex items-center gap-6 md:ml-6">
                    <a
                        href="/post.html"
                        class="!rounded-full !p-3 !text-gray-700 hover:!bg-gray-200 focus:!outline-none focus:!ring-2
             focus:!ring-white focus:!ring-offset-2 focus:!ring-offset-gray-800 dark:!text-gray-50 dark:hover:!bg-gray-500"
                    >
                        <span class="sr-only"> New post </span>

                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"
                            ></path>
                            <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                        </svg>
                    </a>

                    <div class="h-10 w-10">
                        <CurrentUserAvatar showSettings={showIcon} />
                    </div>
                </div>
            </div>
        </div>
    </div>
</nav>
