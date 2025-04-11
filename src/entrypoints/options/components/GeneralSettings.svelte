<script lang="ts">
    import {
        darkMode,
        nodePost,
        nodeArticle,
        nodeAudio,
        nodeImage,
        nodeVideo,
        nodeSearch,
        usePopupComposer,
        autoSignMetadata,
        dispatcherDialogShown,
    } from '@/lib/stores/preferences-store';
    import { currentUser } from '@/lib/stores/user-store';
    import LensNodeSelect from './LensNodeSelect.svelte';
    import { MainContentFocus } from '@lens-protocol/client';
    import { disableAccountManager, enableAccountManager, getMe } from '@/lib/lens-service';
    import { toast } from 'svelte-sonner';
    import { onMount } from 'svelte';
    import { nodeGroup } from '@/lib/stores/preferences-store.js';
    import { onError } from '@/lib/utils/error-utils';

    let signlessEnabled: boolean;

    const refreshMe = async () => {
        try {
            const me = await getMe();
            signlessEnabled = me?.isSignless ?? false;
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
        }
    };

    $: if ($currentUser) {
        refreshMe();
    }

    onMount(async () => {
        await refreshMe();
        currentUser.update((user) => {
            if (user) {
                user.signless = signlessEnabled;
            }
            return user;
        });
    });

    const onChange = async () => {
        if (!$currentUser) throw new Error('No user found');

        if (signlessEnabled) {
            try {
                await enableAccountManager();
                $currentUser.signless = true;
                toast.success('Signless posting enabled!');
            } catch (e) {
                signlessEnabled = false;
                if (e instanceof Error) {
                    onError(e, 'Unable to enable signless posting');
                }
            }
        } else {
            try {
                await disableAccountManager();
                $dispatcherDialogShown = true;
                $currentUser.signless = false;
                toast.success('Signless posting disabled.');
            } catch (e) {
                signlessEnabled = true;
                if (e instanceof Error) {
                    onError(e, 'Unable to disable signless posting');
                }
            }
        }
    };
</script>

<div class="h-screen overflow-auto px-4 pb-24 pt-6 md:px-8">
    <h1 class="text-2xl font-semibold tracking-tight text-neutral-800 dark:text-white">
        General settings
    </h1>

    <h2 class="pt-2 text-lg text-neutral-400">
        These preferences are automatically synced across installs.
    </h2>

    <div class="w-full border-b border-b-gray-200 py-3 dark:border-b-gray-700 md:py-6"></div>

    <section class="flex w-full flex-col py-6 md:py-10">
        <div class="flex flex-col pb-4 md:flex-row md:gap-12">
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">Gasless</div>
                    <div class="text-base text-neutral-400">
                        Enabling signless allows you to post without needing to sign transactions or
                        pay for your own gas.
                    </div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3">
                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input
                                type="checkbox"
                                bind:checked={signlessEnabled}
                                on:change={onChange}
                            />
                            <span
                                class="slider round flex items-center justify-between px-2
                                      shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">
                            Use Lens Account Manager
                        </div>
                        <div class="text-base text-neutral-400">
                            Allow trusted apps to sign onchain transactions and pay for gas on your
                            behalf
                        </div>
                    </div>
                </div>

                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$autoSignMetadata} />
                            <span
                                class="slider round flex items-center justify-between px-2
                                      shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Auto-sign metadata</div>
                        <div class="text-base text-neutral-400">
                            Disable to sign your own post metadata
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="w-full border-b border-b-gray-200 pt-6 dark:border-b-gray-700"></div>

        <div class="flex flex-col pb-6 pt-10 md:flex-row md:gap-12">
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">Display</div>
                    <div class="text-base text-neutral-400">
                        Customize the look and feel of Focalize.
                    </div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3">
                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$darkMode} />
                            <span
                                class="slider round flex items-center justify-between px-2 shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Dark mode</div>
                        <div class="text-base text-neutral-400">Use a dark theme</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="w-full border-b border-b-gray-200 pt-6 dark:border-b-gray-700"></div>

        <div class="flex flex-col pb-6 pt-10 md:flex-row md:gap-12">
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">Composer</div>
                    <div class="text-base text-neutral-400">Customize the post composer.</div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3">
                <div class="flex w-full">
                    <div class="pt-1">
                        <label class="switch">
                            <input type="checkbox" bind:checked={$usePopupComposer} />
                            <span
                                class="slider round flex items-center justify-between px-2
                  shadow-none"
                            ></span>
                        </label>
                    </div>

                    <div class="flex flex-col pl-4">
                        <div class="text-base font-medium dark:text-white">Use popup composer</div>
                        <div class="text-base text-neutral-400">
                            Launches a popup window when creating a new post
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="w-full border-b border-b-gray-200 pt-6 dark:border-b-gray-700"></div>

        <div class="flex flex-col pb-6 pt-10 md:flex-row md:gap-12">
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">
                        Omnibox Search
                    </div>
                    <div class="text-base text-neutral-400">
                        Search for Lens accounts directly from the URL bar by typing "lens" then
                        pressing tab.
                    </div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3 xl:w-1/2 2xl:w-2/5">
                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Launch</div>
                        <div class="text-base text-neutral-400">
                            Choose the app to open when selecting a user.
                        </div>
                    </div>
                    <LensNodeSelect preference={nodeSearch} />
                </div>
            </div>
        </div>

        <div class="w-full border-b border-b-gray-200 dark:border-b-gray-700"></div>

        <div class="flex flex-col pb-6 pt-10 md:flex-row md:gap-12">
            <div class="w-full shrink-0 grow-0 md:w-1/3">
                <div class="flex flex-col pb-6 pr-6">
                    <div class="text-lg font-medium text-neutral-800 dark:text-white">
                        Lens Apps
                    </div>
                    <div class="text-base text-neutral-400">
                        Select the apps to launch when opening notifications and viewing your posts.
                    </div>
                </div>
            </div>

            <div class="flex w-full flex-col gap-6 md:w-2/3 xl:w-1/2 2xl:w-2/5">
                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Posts</div>
                        <div class="text-base text-neutral-400">Short-form posts and links</div>
                    </div>
                    <LensNodeSelect preference={nodePost} focus={MainContentFocus.TextOnly} />
                </div>

                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Groups</div>
                        <div class="text-base text-neutral-400">Events regarding groups</div>
                    </div>
                    <LensNodeSelect preference={nodeGroup} />
                </div>

                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Images</div>
                        <div class="text-base text-neutral-400">
                            Posts containing image attachments
                        </div>
                    </div>
                    <LensNodeSelect preference={nodeImage} focus={MainContentFocus.Image} />
                </div>

                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Videos</div>
                        <div class="text-base text-neutral-400">
                            Posts containing video attachments
                        </div>
                    </div>
                    <LensNodeSelect preference={nodeVideo} focus={MainContentFocus.Video} />
                </div>

                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Audio</div>
                        <div class="text-base text-neutral-400">
                            Posts containing audio attachments
                        </div>
                    </div>
                    <LensNodeSelect preference={nodeAudio} focus={MainContentFocus.Audio} />
                </div>

                <div class="flex w-full justify-between gap-4">
                    <div class="flex flex-col">
                        <div class="text-base font-medium dark:text-white">Articles</div>
                        <div class="text-base text-neutral-400">Long-form posts</div>
                    </div>
                    <LensNodeSelect preference={nodeArticle} focus={MainContentFocus.TextOnly} />
                </div>
            </div>
        </div>
    </section>
</div>
