<script lang="ts">
    import { tippy } from 'svelte-tippy';
    import { v4 as uuid } from 'uuid';
    import {
        isThreeDFile,
        isUnsupportedTreeDFile,
        MAX_FILE_SIZE,
        SUPPORTED_MIME_TYPES,
    } from '@/lib/utils/file-utils';
    import { CONTENT_WARNING_ITEMS, type SelectOption } from '@/lib/lens/lens-modules';
    import { collectSettingsToModuleInput, REFERENCE_ITEMS } from '@/lib/lens/lens-modules';
    import {
        generateAudioPostMetadata,
        generateImagePostMetadata,
        generateLinkPostMetadata,
        generateTextPostMetadata,
        generateThreeDPostMetadata,
        generateVideoPostMetadata,
        submitPost,
    } from '@/lib/lens/lens-post';
    import {
        author,
        clearPostState,
        collectSettings,
        content,
        contentWarning,
        cover,
        description,
        draftId,
        file,
        loadFromDraft,
        postState,
        PostState,
        title,
        tags as postTags,
        sharingLink,
        image,
        video,
        audio,
        threeDAsset,
        album,
        date,
    } from '@/lib/stores/state-store';
    import { currentUser } from '@/lib/stores/user-store';
    import { darkMode, dispatcherDialogShown } from '@/lib/stores/preferences-store';
    import ModuleChoiceItem from './components/ModuleChoiceItem.svelte';
    import ModuleSelectionItem from './components/ModuleSelectionItem.svelte';
    import CollectSettingsDialog from './components/CollectSettingsDialog.svelte';
    import MediaUploader from './components/MediaUploader.svelte';
    import Select from 'svelte-select';
    import { toast, Toaster } from 'svelte-sonner';
    import { beforeUpdate, onDestroy, onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import tags from 'language-tags';
    import GifSelectionDialog from './components/GifSelectionDialog.svelte';
    import SetAccountManagerDialog from '@/lib/components/SetAccountManagerDialog.svelte';
    import { ensureUser } from '@/lib/user/user';
    import { getDraft, postDrafts, saveDraft } from '@/lib/stores/draft-store';
    import { Subject } from 'rxjs';
    import { debounceTime } from 'rxjs/operators';
    import PostDraftsList from '@/lib/components/PostDraftsList.svelte';
    import AutoRelativeTimeView from '@/lib/components/AutoRelativeTimeView.svelte';
    import PostPreview from './components/PostPreview.svelte';
    import DialogOuter from '@/lib/components/DialogOuter.svelte';
    import { throttle } from 'throttle-debounce';
    import { DateTime } from 'luxon';
    import {
        getSearchParams,
        isPopup,
        launchComposerTab,
        POPUP_MIN_HEIGHT,
    } from '@/lib/utils/utils';
    import { launchComposerWindow } from '@/lib/utils/utils.js';
    import type { PostDraft } from '@/lib/types/PostDraft';
    import PostMetadata from './components/PostMetadata.svelte';
    import TextEditor from './components/TextEditor.svelte';
    import CurrentUserAvatar from '@/lib/components/CurrentUserAvatar.svelte';
    import EditorActionsBar from '@/lib/editor/components/EditorActionsBar.svelte';
    import { type PostMetadata as LensPostMetadata, type URI } from '@lens-protocol/metadata';
    import { getMemberGroups } from '@/lib/lens-service';
    import type { EvmAddress, Feed, Group } from '@lens-protocol/client';
    import { GLOBAL_FEED } from '@/lib/utils/lens-utils';
    import FeedChoiceItem from '@/entrypoints/post/components/FeedChoiceItem.svelte';
    import FeedSelectItem from '@/entrypoints/post/components/FeedSelectItem.svelte';
    import { type GroveFile } from '@/lib/grove-service';
    import { type SimpleCollect } from '@/lib/types/SimpleCollect';
    import { onError } from '@/lib/utils/error-utils';

    const draftSubject: Subject<PostDraft> = new Subject();

    let gifDialogComponent: GifSelectionDialog;
    let textEditorComponent: TextEditor;

    let postId: string;
    let isSubmittingPost = false;
    let isFileDragged = false;
    let collectSettingsDialog: HTMLDialogElement;
    let showCollectDialog = false;
    let gifSelectionDialog: HTMLDialogElement;
    let enableDispatcherDialog: HTMLDialogElement;
    let postDraftsDialog: HTMLDialogElement;
    let isPopupWindow: boolean | undefined = undefined;
    let contentDiv: HTMLElement;
    let contentDivHeight: number;
    let showAdvanced = false;
    let feedsAndGroups: SelectOption<Feed | Group>[] = [
        {
            value: GLOBAL_FEED,
            label: 'Global Feed',
        },
    ];
    let canPostToFeed: boolean = true;

    let postDraft: PostDraft | undefined;
    let postMetaData: LensPostMetadata;

    let postContentWarning = CONTENT_WARNING_ITEMS[0];
    let referenceItem: SelectOption<boolean | undefined> = REFERENCE_ITEMS[0];
    let selectedFeedItem: SelectOption<Feed | Group> = feedsAndGroups[0];

    type CurrentTabData = {
        title: string;
        desc: string;
        url: string;
        icon: string;
        image: string;
    };
    let currentTabData: CurrentTabData | undefined;

    $: referenceModuleParams = referenceItem.value;
    $: isMediaPostType = $image || $audio || $video;

    $: if (postContentWarning.value) {
        $contentWarning = postContentWarning.value;
    }

    const getCurrentTabData = (): CurrentTabData | undefined => {
        const urlParams = getSearchParams();

        const title = urlParams.title;
        const desc = urlParams.desc;
        const url = urlParams.url;
        const icon = urlParams.icon;
        const image = urlParams.image;

        return title || desc
            ? {
                  title,
                  desc,
                  url,
                  icon,
                  image,
              }
            : undefined;
    };

    const parseSearchParams = () => {
        const urlParams = getSearchParams();

        if (urlParams.text) {
            content.set(urlParams.text);
            return;
        }

        if (urlParams.draft) {
            $draftId = urlParams.draft;
        }

        currentTabData = getCurrentTabData();
        if (currentTabData?.url) {
            $sharingLink = currentTabData.url;
        }
    };

    const showCollectSettingsDialog = async () => {
        showCollectDialog = true;
        await tick();
        collectSettingsDialog?.showModal();
    };

    const onCollectSettingsDialogDone = () => {
        collectSettingsDialog?.close();
        showCollectDialog = false;
    };

    const showGifSelectionDialog = async () => {
        gifSelectionDialog?.showModal();
        gifDialogComponent?.onGifDialogShown();
    };

    const buildMetadata = async (): Promise<LensPostMetadata> => {
        if (!$currentUser) throw new Error('No user found');

        const locale = selectedLocale?.value ?? navigator.languages[0];

        if ($sharingLink) {
            return await generateLinkPostMetadata(
                $currentUser.username,
                $sharingLink,
                $title ?? undefined,
                $content ?? undefined,
                $postTags,
                $contentWarning,
                $description ?? undefined,
                locale,
            );
        } else if ($threeDAsset) {
            return await generateThreeDPostMetadata(
                $currentUser.username,
                $threeDAsset,
                $title ?? undefined,
                $cover,
                $content ?? undefined,
                $postTags,
                $contentWarning,
                $description ?? undefined,
                locale,
            );
        }

        if (!isMediaPostType) {
            if (!$content) throw new Error('No content found');

            return await generateTextPostMetadata(
                $currentUser.username,
                $content,
                $title ?? undefined,
                $postTags,
                $contentWarning,
                $description ?? undefined,
                locale,
            );
        }

        if (!isMediaPostType) throw new Error('No attachments found');

        const attachment = $audio ?? $video ?? $threeDAsset;
        if ($cover && attachment) {
            attachment.cover = $cover as URI;
        }

        let metadata: LensPostMetadata | undefined = undefined;
        const postContent = $content?.length ? $content : undefined;

        if ($image) {
            metadata = await generateImagePostMetadata(
                $currentUser.username,
                $image,
                $title ?? undefined,
                postContent,
                $postTags,
                $contentWarning,
                $description ?? undefined,
                locale,
            );
        } else if ($video) {
            metadata = await generateVideoPostMetadata(
                $currentUser.username,
                $video,
                $title ?? undefined,
                $cover,
                postContent,
                $postTags,
                $contentWarning,
                $description ?? undefined,
                locale,
            );
        } else if ($audio) {
            metadata = await generateAudioPostMetadata(
                $currentUser.username,
                $audio,
                $title ?? undefined,
                $cover,
                postContent,
                $author ?? undefined,
                $album ?? undefined,
                $date ?? undefined,
                $postTags,
                $contentWarning,
                $description ?? undefined,
                locale,
            );
        }

        if (metadata) {
            return metadata;
        }

        throw new Error('Unrecognized attachment');
    };

    const onSubmitClick = async () => {
        if (!$currentUser) throw new Error('No user found');

        if (!$dispatcherDialogShown && !$currentUser.signless) {
            enableDispatcherDialog.showModal();
            return;
        }

        isSubmittingPost = true;

        await ensureDraft();

        let collectModuleParams: SimpleCollect | null = null;
        if ($collectSettings.isCollectible) {
            try {
                collectModuleParams = collectSettingsToModuleInput(
                    $currentUser.address,
                    $collectSettings,
                );
            } catch (e) {
                console.error(e);
                if (e instanceof Error) {
                    toast.error(e.message, { duration: 5000 });
                }
                return;
            }
        }

        try {
            postMetaData = await buildMetadata();

            const feedAddress: EvmAddress =
                selectedFeedItem.value.__typename === 'Feed'
                    ? selectedFeedItem.value.address
                    : selectedFeedItem.value.feed;

            console.log(
                'onSubmitClick: postMetaData, ',
                postMetaData,
                'feed',
                feedAddress,
                ' collectModuleParams',
                collectModuleParams,
            );

            postId = await submitPost(
                $currentUser,
                $draftId ?? uuid(),
                postMetaData,
                feedAddress,
                collectModuleParams,
                referenceModuleParams,
            );
            console.log('onSubmitClick: post id', postId);

            clearPostState();
        } catch (e) {
            if (e instanceof Error) {
                onError(e);
            }
            $postState = PostState.ERROR;
        } finally {
            isSubmittingPost = false;
            await updateWindowHeight();
        }
    };

    const setAttachment = (f: File | undefined) => {
        console.log('setAttachment: file', f);
        if (!f) {
            $file = null;
            return;
        }

        const fileError = (msg: string) => {
            toast.error(msg, { duration: 5000 });
            isFileDragged = false;
        };

        if (f.type === 'image/heic') {
            fileError(
                'HEIC files are not supported. Please use a tool like cloudconvert.com to convert to JPG or WEBP.',
            );
            return;
        }

        if (isUnsupportedTreeDFile(f)) {
            fileError('Only GLB and GLTF 3D files are currently supported.');
            return;
        }

        if (!SUPPORTED_MIME_TYPES.includes(f.type) && !isThreeDFile(f)) {
            fileError('File not supported');
            return;
        }

        if (f.size > MAX_FILE_SIZE) {
            fileError('File too large. Max file size is 8MB');
            return;
        }

        $file = f as GroveFile;
        console.log('setAttachment: validated file state');
        isFileDragged = false;
    };

    const onFileDropped = (dragEvent: DragEvent) => {
        setFileIsDragged(false);
        const dt = dragEvent.dataTransfer;
        const file: File | undefined = dt?.files?.[0];
        console.log('File dropped', file?.name);
        setAttachment(file);
    };

    $: submitEnabled =
        !isSubmittingPost && ($content?.length || isMediaPostType || $sharingLink || $threeDAsset);

    const locales = navigator.languages.map((tag) => ({
        value: tag,
        label: tags(tag).language()?.descriptions().join(', '),
    }));

    let selectedLocale = locales?.[0];

    const onGifSelected = () => {
        gifSelectionDialog?.close();
    };

    const onDispatcherDialogClosed = () => {
        $dispatcherDialogShown = true;
    };

    $: if ($darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    $: if ($currentUser === null) {
        // eslint-disable-next-line no-undef
        browser.runtime.openOptionsPage();
    }

    const updateWindowHeight = async () => {
        await tick();
        if (!isPopupWindow || !contentDiv) return;
        const height = contentDiv.offsetHeight + (window.outerHeight - window.innerHeight);
        window.resizeTo(window.outerWidth, Math.max(POPUP_MIN_HEIGHT, height));
    };

    $: if (contentDivHeight) {
        updateWindowHeight().catch(console.error);
    }

    const setWindowType = async () => {
        isPopupWindow = await isPopup();
    };

    const buildDraft = (): PostDraft =>
        ({
            id: $draftId ?? uuid(),
            title: $title ?? undefined,
            content: $content ?? undefined,
            description: $description ?? undefined,
            author: $author ?? undefined,
            collectFee: $collectSettings ?? undefined,
            tags: $postTags ?? undefined,
            sharingLink: $sharingLink ?? undefined,
            threeDAsset: $threeDAsset ?? undefined,
            image: $image ?? undefined,
            video: $video ?? undefined,
            audio: $audio ?? undefined,
            date: $date ?? undefined,
            album: $album ?? undefined,
            cover: $cover ?? undefined,
            contentWarning: $contentWarning ?? undefined,
            feed:
                selectedFeedItem.value.__typename === 'Feed'
                    ? selectedFeedItem.value.address
                    : selectedFeedItem.value.feed,
        }) as PostDraft;

    const onDraftChanged = async (draft: PostDraft) => {
        postDraft = await saveDraft(draft);
        $draftId = postDraft?.id;
        console.log('onDraftChanged: saved draft', postDraft);
    };

    const debouncedDraftUpdate = draftSubject.pipe(debounceTime(1000)).subscribe(onDraftChanged);

    $: if (
        $content !== undefined ||
        $title !== undefined ||
        $description !== undefined ||
        $audio !== undefined ||
        $video !== undefined ||
        $image !== undefined ||
        $author !== undefined ||
        $postTags !== undefined ||
        $cover !== undefined ||
        $album !== undefined ||
        $date !== undefined ||
        $sharingLink !== undefined ||
        $threeDAsset !== undefined ||
        $collectSettings.isCollectible !== undefined ||
        $contentWarning !== undefined
    ) {
        const draft = buildDraft();
        draftSubject.next(draft);
    }

    $: if ($draftId) {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        searchParams.set('draft', $draftId);
        url.search = searchParams.toString();
        console.log('onDraftChanged: url', url.toString());
        window.history.replaceState({}, '', url.toString());
    }

    const findFeedSelectItem = (feedAddress: string): SelectOption<Feed | Group> | undefined =>
        feedsAndGroups.find((item) =>
            item.value.__typename === 'Feed'
                ? item.value.address === feedAddress
                : item.value.feed?.address === feedAddress,
        );

    const openDraft = async () => {
        if (!$draftId) return;

        postDraft = await getDraft($draftId);
        console.log('openDraft: postDraft', postDraft);
        if (postDraft) {
            clearPostState();
            loadFromDraft(postDraft);
            if (postDraft.feed) {
                selectedFeedItem = findFeedSelectItem(postDraft.feed) ?? feedsAndGroups[0];
            }
        }
    };

    const setFileIsDragged = throttle(300, (isDragged: boolean) => {
        isFileDragged = isDragged;
    });

    const clearCurrentTabData = () => {
        currentTabData = undefined;
    };

    const ensureDraft = async () => {
        if (!$draftId && submitEnabled) {
            const draft = buildDraft();
            postDraft = await saveDraft(draft);
            $draftId = postDraft?.id;
        } else if ($draftId) {
            $draftId = $draftId;
        }
    };

    const openInNewTab = async () => {
        await ensureDraft();
        await launchComposerTab($draftId);
    };

    const openInPopupWindow = async () => {
        await ensureDraft();
        await launchComposerWindow(undefined, $draftId, true);
    };

    const getGroups = async (): Promise<readonly Group[]> => {
        if (!$currentUser?.account) {
            return [];
        }
        return getMemberGroups($currentUser.account);
    };

    const setFeedsAndGroups = async () => {
        const feeds = [GLOBAL_FEED];
        const groups = await getGroups();
        const combined = [...feeds, ...groups];
        feedsAndGroups = combined.map((item) => ({
            value: item,
            label: item.metadata?.name ?? item.address,
        }));

        // check that the selected feed is still in the list
        const feedAddress =
            selectedFeedItem.value.__typename === 'Feed'
                ? selectedFeedItem.value.address
                : selectedFeedItem.value.feed;
        if (!findFeedSelectItem(feedAddress)) {
            selectedFeedItem = feedsAndGroups[0];
        }

        // restore the selected feed from the draft
        if ($draftId) {
            const postDraft = await getDraft($draftId);
            if (postDraft?.feed) {
                selectedFeedItem = findFeedSelectItem(postDraft.feed) ?? feedsAndGroups[0];
            }
        }

        await updateAbilityToPostToFeed();
    };

    const updateAbilityToPostToFeed = async () => {
        let item = selectedFeedItem.value;
        if (item === GLOBAL_FEED) {
            canPostToFeed = true;
            return;
        }

        canPostToFeed =
            item.__typename === 'Group' &&
            item.feed?.operations?.canPost.__typename === 'FeedOperationValidationPassed';
    };

    const onPostDraftDialogClosed = () => {
        if ($draftId !== postDraft?.id) {
            openDraft();
        }
    };

    $: if (isMediaPostType) {
        clearCurrentTabData();
    }

    $: if ($currentUser) {
        setFeedsAndGroups();
    }

    beforeUpdate(async () => {
        await setWindowType();
    });

    onMount(async () => {
        await ensureUser();

        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const draft = searchParams.get('draft');
        if (draft) {
            $draftId = draft;
            await openDraft();
        } else {
            parseSearchParams();
        }
    });

    onDestroy(() => {
        debouncedDraftUpdate?.unsubscribe();
    });
</script>

<main
    class="min-h-full w-full bg-neutral-50 dark:bg-gray-950 {isPopupWindow ? 'compact' : ''}"
    on:drop|preventDefault|stopPropagation={onFileDropped}
    on:dragenter|preventDefault|stopPropagation={() => setFileIsDragged(true)}
    on:dragover|preventDefault|stopPropagation={() => setFileIsDragged(true)}
    on:dragleave|preventDefault|stopPropagation={() => setFileIsDragged(false)}
>
    {#if (postMetaData && $postState && $postState !== PostState.ERROR) || postId}
        <div bind:this={contentDiv} bind:offsetHeight={contentDivHeight}>
            <PostPreview {postMetaData} {postId} />
        </div>
    {:else}
        <div class="min-h-screen w-full">
            <div
                id="content"
                bind:this={contentDiv}
                bind:offsetHeight={contentDivHeight}
                class="container mx-auto min-h-full max-w-screen-md {isPopupWindow ? '' : 'pt-6'}"
            >
                <div
                    class="min-h-[12rem] border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900
                        dark:text-gray-100 {isSubmittingPost ? 'opacity-60' : ''} {isPopupWindow
                        ? ' rounded-b-xl px-2 pb-1 pt-2'
                        : 'mx-2 rounded-xl px-4 pb-2 pt-2'}"
                >
                    <div class="flex">
                        <div class="px-3 pt-4">
                            <div class="h-14 w-14">
                                <CurrentUserAvatar />
                            </div>
                        </div>

                        <div class="w-full">
                            <div
                                class="flex w-full flex-col pl-2 pr-5 pt-4 {isPopupWindow
                                    ? 'pb-2'
                                    : 'pb-4'}"
                            >
                                {#if $currentUser && feedsAndGroups.length}
                                    <div class="flex items-center gap-3">
                                        <Select
                                            bind:value={selectedFeedItem}
                                            on:change={updateAbilityToPostToFeed}
                                            items={feedsAndGroups}
                                            clearable={false}
                                            searchable={false}
                                            listAutoWidth={false}
                                            showChevron={true}
                                            listOffset={-32}
                                            containerStyles="cursor: pointer;"
                                            --height="32px"
                                            --item-height="auto"
                                            --item-is-active-bg="#DB4700"
                                            --item-hover-bg="transparent"
                                            --list-max-height="auto"
                                            --background="transparent"
                                            --list-z-index={20}
                                            --list-background={$darkMode ? '#374354' : 'white'}
                                            --item-padding="0"
                                            --disabled-background="transparent"
                                            --list-border-radius="0.75rem"
                                            --chevron-color={$darkMode ? '#FFB38E' : '#A33500'}
                                            --selected-item-padding="0"
                                            --chevron-height="32px"
                                            --chevron-width="24px"
                                            class="!focus:ring-0 !-ml-4 !-mt-2 !w-fit !rounded-full !border-none !bg-none
                                                !ring-0 hover:!bg-gray-100 focus:!border-none focus:!outline-none
                                                dark:hover:!bg-gray-600"
                                        >
                                            <div slot="item" let:item>
                                                <FeedChoiceItem {item} />
                                            </div>

                                            <div slot="selection" let:selection>
                                                <FeedSelectItem item={selection} />
                                            </div>

                                            <div slot="chevron-icon">
                                                <svg
                                                    class="h-4 w-4"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="3"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                >
                                                    <path d="M6 9l6 6 6-6" />
                                                </svg>
                                            </div>
                                        </Select>
                                        {#if !canPostToFeed}
                                            <div
                                                class="-mt-2 flex items-center rounded-full bg-red-700 py-2 pl-2 pr-3 text-xs text-white dark:bg-red-400"
                                            >
                                                <svg
                                                    class="mr-1 h-4 w-4"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                    <line x1="12" y1="16" x2="12" y2="16" />
                                                </svg>
                                                <span>Cannot post to this feed</span>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}

                                <TextEditor
                                    bind:this={textEditorComponent}
                                    {content}
                                    disabled={isSubmittingPost}
                                    isCompact={isPopupWindow}
                                />

                                <EditorActionsBar
                                    disabled={isSubmittingPost}
                                    isCompact={isPopupWindow ?? false}
                                    showAttachmentButtons={$sharingLink === undefined}
                                    on:emojiSelected={(e) =>
                                        textEditorComponent?.insertAtSelection(e.detail)}
                                    on:fileSelected={(e) => setAttachment(e.detail)}
                                    on:selectGif={() => showGifSelectionDialog()}
                                />
                            </div>

                            {#if isPopupWindow === true}
                                <button
                                    type="button"
                                    on:click={openInNewTab}
                                    use:tippy={{ delay: 400, content: 'Open in a new tab' }}
                                    class="absolute right-2 top-2 rounded-full p-2 opacity-30 hover:bg-gray-200
                                        hover:opacity-100 dark:hover:bg-gray-700"
                                >
                                    <svg
                                        class="h-5 w-5"
                                        viewBox="0 -960 960 960"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M160-114.5q-19.152 0-32.326-13.174T114.5-160v-240q0-19.152 13.174-32.326T160-445.5q19.152 0 32.326 13.174T205.5-400v130.608L690.608-754.5H560q-19.152 0-32.326-13.174T514.5-800q0-19.152 13.174-32.326T560-845.5h240q19.152 0 32.326 13.174T845.5-800v240q0 19.152-13.174 32.326T800-514.5q-19.152 0-32.326-13.174T754.5-560v-130.608L269.392-205.5H400q19.152 0 32.326 13.174T445.5-160q0 19.152-13.174 32.326T400-114.5H160Z"
                                        />
                                    </svg>
                                </button>
                            {:else if isPopupWindow === false}
                                <button
                                    type="button"
                                    on:click={openInPopupWindow}
                                    use:tippy={{ delay: 400, content: 'Open in a popup window' }}
                                    class="absolute right-4 top-8 rounded-full p-2 opacity-40 hover:bg-gray-200
                                        hover:opacity-100 dark:hover:bg-gray-700"
                                >
                                    <svg
                                        class="h-5 w-5"
                                        viewBox="0 -960 960 960"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M182.152-114.022q-27.599 0-47.865-20.265-20.265-20.266-20.265-47.865v-595.696q0-27.697 20.265-48.033 20.266-20.337 47.865-20.337h242.783q14.424 0 24.244 10.012Q459-826.194 459-811.717q0 14.478-9.821 24.174-9.82 9.695-24.244 9.695H182.152v595.696h595.696v-242.783q0-14.424 9.871-24.244Q797.59-459 812.068-459q14.477 0 24.313 9.821 9.837 9.82 9.837 24.244v242.783q0 27.599-20.337 47.865-20.336 20.265-48.033 20.265H182.152Zm181.609-250q-9.326-9.804-9.826-23.385-.5-13.581 9.695-23.963l366.718-366.478H553.065q-14.424 0-24.244-9.871Q519-797.59 519-812.068q0-14.477 9.821-24.313 9.82-9.837 24.244-9.837h258.848q14.394 0 24.349 9.956 9.956 9.955 9.956 24.349v258.848q0 14.424-10.012 24.244Q826.194-519 811.717-519q-14.478 0-24.174-9.821-9.695-9.82-9.695-24.244v-176.283L411.37-362.63q-9.638 9.195-23.591 9.076-13.953-.12-24.018-10.468Z"
                                        />
                                    </svg>
                                </button>
                            {/if}

                            {#if currentTabData}
                                <div
                                    out:fade={{ duration: 200 }}
                                    use:tippy={{ delay: 400, content: currentTabData.url }}
                                    class="relative mb-2 ml-2 flex min-h-[7rem] min-w-0 max-w-[70%] items-center
                                        overflow-hidden truncate rounded-lg border border-gray-300 bg-gray-50
                                        dark:border-gray-600 dark:bg-gray-800"
                                >
                                    {#if currentTabData.image}
                                        <img
                                            src={currentTabData.image}
                                            alt="Favicon"
                                            class="aspect-square h-28 flex-none object-cover"
                                        />
                                    {/if}

                                    <div class="flex flex-col truncate">
                                        <div
                                            class="flex items-center gap-1 px-3 pb-0.5 font-semibold text-orange-600 dark:text-orange-300"
                                        >
                                            <svg
                                                class="h-4 w-4"
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
                                            <span>Sharing link</span>
                                        </div>

                                        <button
                                            type="button"
                                            on:click={clearCurrentTabData}
                                            class="absolute right-2 top-2 rounded-full p-1 transition-none
                                                hover:bg-gray-300 dark:hover:bg-gray-500"
                                        >
                                            <svg
                                                class="h-4 w-4"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>

                                        <div
                                            class="flex items-center gap-1 truncate px-3 pt-0.5 text-sm font-medium"
                                        >
                                            {#if currentTabData.icon}
                                                <img
                                                    src={currentTabData.icon}
                                                    alt="Favicon"
                                                    class="h-4"
                                                />
                                            {/if}
                                            <span class="truncate">{currentTabData.title}</span>
                                        </div>

                                        {#if currentTabData.desc}
                                            <div
                                                class="line-clamp-2 truncate whitespace-pre-wrap px-3 opacity-60"
                                            >
                                                {currentTabData.desc}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>

                    {#if $collectSettings.isCollectible || isMediaPostType || $file || $threeDAsset}
                        <div
                            class="flex w-full justify-center gap-4 rounded-xl border border-gray-200 bg-neutral-50
                                px-4 pb-4 pt-6 dark:border-gray-800 dark:bg-gray-900"
                        >
                            {#if isMediaPostType || $file || $threeDAsset}
                                <div
                                    class={$collectSettings.isCollectible || $audio
                                        ? 'w-1/2'
                                        : 'w-full'}
                                >
                                    <MediaUploader
                                        isCollectable={$collectSettings.isCollectible ?? false}
                                    />
                                </div>
                            {/if}

                            {#if $collectSettings.isCollectible || $audio}
                                <div
                                    class:px-[4.5rem]={!isMediaPostType &&
                                        !$file &&
                                        !$threeDAsset &&
                                        !$audio}
                                    class="w-1/2 grow"
                                >
                                    <PostMetadata on:settingsClick={showCollectSettingsDialog} />
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <div
                        class="ml-[4.5rem] flex flex-wrap gap-6
                            {isPopupWindow ? 'pb-0 pt-1' : 'pb-1 pt-2'}
                            {$collectSettings.isCollectible ||
                        isMediaPostType ||
                        $file ||
                        currentTabData
                            ? ''
                            : 'border-t border-t-gray-200 dark:border-t-gray-800'}"
                    >
                        <Select
                            bind:value={referenceItem}
                            items={REFERENCE_ITEMS}
                            clearable={false}
                            searchable={false}
                            listAutoWidth={false}
                            showChevron={true}
                            listOffset={-96}
                            containerStyles="cursor: pointer;"
                            disabled={isSubmittingPost}
                            --item-height="auto"
                            --item-is-active-bg="#DB4700"
                            --item-hover-bg="transparent"
                            --list-max-height="auto"
                            --background="transparent"
                            --list-z-index={20}
                            --list-background={$darkMode ? '#374354' : 'white'}
                            --item-padding="0"
                            --disabled-background="transparent"
                            --list-border-radius="0.75rem"
                            --chevron-color={$darkMode ? '#FFB38E' : '#A33500'}
                            --selected-item-padding="0"
                            class="!focus:ring-0 !w-fit !rounded-full !border-none !bg-none !ring-0
                                hover:!bg-gray-100 focus:!border-none focus:!outline-none dark:hover:!bg-gray-600"
                        >
                            <div slot="item" let:item>
                                <ModuleChoiceItem {item} />
                            </div>

                            <div slot="selection" let:selection class="flex cursor-pointer">
                                <ModuleSelectionItem {selection} />
                            </div>

                            <div slot="chevron-icon">
                                <svg
                                    class="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                        </Select>

                        <button
                            type="button"
                            on:click={showCollectSettingsDialog}
                            class="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold
                            text-orange-700 hover:bg-gray-100 dark:text-orange-300 dark:hover:bg-gray-600"
                        >
                            <svg
                                class="inline h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 1 1-8 0"
                                />
                            </svg>

                            <span class="pl-1">
                                {$collectSettings.isCollectible
                                    ? 'Edit collect settings'
                                    : 'Create a digital collectible'}
                            </span>

                            <svg
                                class="inline h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="3"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </div>

                {#if showAdvanced || !isPopupWindow}
                    <div
                        class="flex flex-wrap border-b border-gray-200 dark:border-gray-900
                            {isPopupWindow ? 'py-2' : 'py-3'} gap-4 px-2
                            {isSubmittingPost ? 'opacity-60' : ''}"
                    >
                        {#if locales.length > 0}
                            <Select
                                bind:value={selectedLocale}
                                items={locales}
                                disabled={isSubmittingPost}
                                listOffset={-48}
                                clearable={false}
                                searchable={false}
                                showChevron={true}
                                listAutoWidth={false}
                                --item-is-active-bg="#DB4700"
                                --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                                --height={isPopupWindow ? '2.5rem' : '3rem'}
                                --item-height={isPopupWindow ? '2.5rem' : '3rem'}
                                --font-size={isPopupWindow ? '0.75rem' : '0.875rem'}
                                --list-border-radius="0.75rem"
                                --list-z-index={20}
                                --selected-item-padding={isPopupWindow
                                    ? '0.25rem 0 0.25rem 0.25rem'
                                    : '0.5rem 0 0.5rem 0.5rem'}
                                --background="transparent"
                                --list-background={$darkMode ? '#374354' : 'white'}
                                class="dark:!hover:bg-gray-600 dark:!hover:text-gray-100 !h-fit !w-fit !rounded-full
                                    !border-none !bg-white !text-sm !text-gray-800 !shadow !ring-0
                                    hover:!bg-gray-100 focus:!border-none focus:!outline-none focus:!ring-0
                                    dark:!bg-gray-900 dark:!text-gray-300"
                            >
                                <div slot="prepend" class="pr-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        class="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path
                                            d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
                                        />
                                        <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                </div>
                                <div slot="chevron-icon">
                                    <svg
                                        class="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                            </Select>
                        {/if}

                        <Select
                            bind:value={postContentWarning}
                            items={CONTENT_WARNING_ITEMS}
                            clearable={false}
                            searchable={false}
                            listAutoWidth={false}
                            showChevron={true}
                            disabled={isSubmittingPost}
                            listOffset={-48}
                            --item-is-active-bg="#DB4700"
                            --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                            --list-z-index={20}
                            --font-size={isPopupWindow ? '0.8rem' : '0.875rem'}
                            --background="transparent"
                            --list-background={$darkMode ? '#374354' : 'white'}
                            --selected-item-padding={isPopupWindow
                                ? '0.25rem 0 0.25rem 0.25rem'
                                : '0.5rem 0 0.5rem 0.5rem'}
                            --list-border-radius="0.75rem"
                            --height={isPopupWindow ? '2.5rem' : '3rem'}
                            --item-height={isPopupWindow ? '2.5rem' : '3rem'}
                            class="dark:!hover:bg-gray-600 dark:!hover:text-gray-100 !h-fit !w-fit !rounded-full
                                !border-none !bg-white !text-sm !text-gray-800 !shadow !ring-0
                                hover:!bg-gray-100 focus:!border-none focus:!outline-none focus:!ring-0
                                dark:!bg-gray-900 dark:!text-gray-300"
                        >
                            <div slot="prepend" class="pr-1">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    class="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                                    />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <div slot="chevron-icon">
                                <svg
                                    class="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                        </Select>

                        <!--                        <PostTags disabled={isSubmittingPost} isCompact={isPopupWindow ?? false} />-->
                    </div>
                {/if}

                <div
                    class="flex {isPopupWindow
                        ? 'justify-between'
                        : 'justify-end'} items-center px-2"
                >
                    {#if isPopupWindow}
                        <button
                            type="button"
                            on:click={() => {
                                showAdvanced = !showAdvanced;
                            }}
                            use:tippy={{ delay: 400, content: 'More options' }}
                            class="rounded-full p-2 px-2 opacity-40 hover:bg-gray-200 hover:opacity-100
                                dark:hover:bg-gray-700"
                        >
                            {#if showAdvanced}
                                <svg class="h-6 w-6" fill="currentColor" viewBox="0 -960 960 960">
                                    <path
                                        d="M480-575.5q-8.957 0-17.413-3.359-8.457-3.358-14.413-9.315l-124-124Q311.5-724.848 311.5-744t12.674-31.826Q336.848-788.5 356-788.5t31.826 12.674L480-683.652l92.174-92.174Q584.848-788.5 604-788.5t31.826 12.674Q648.5-763.152 648.5-744t-12.674 31.826l-124 124q-6.717 6.718-14.793 9.696Q488.957-575.5 480-575.5ZM324.174-184.174Q311.5-196.848 311.5-216t12.674-31.826l124-124q6.956-6.957 14.913-9.815Q471.043-384.5 480-384.5t17.413 2.859q8.457 2.858 14.413 9.815l124.761 124.761q12.674 12.674 12.294 31.445-.381 18.772-13.055 31.446Q623.152-171.5 604-171.5t-31.826-12.674L480-276.348l-92.174 92.174Q375.152-171.5 356-171.5t-31.826-12.674Z"
                                    />
                                </svg>
                            {:else}
                                <svg class="h-6 w-6" fill="currentColor" viewBox="0 -960 960 960">
                                    <path
                                        d="M324.456-623.413q-12.674-12.674-12.674-32.707 0-20.032 12.674-32.706l123.718-123.718q6.956-6.956 14.913-9.815 7.956-2.859 16.913-2.859t17.413 2.859q8.457 2.859 14.413 9.815l124.478 124.479q12.674 12.674 12.294 32.326-.38 19.652-13.054 32.326t-32.707 12.674q-20.033 0-32.707-12.674L480-713.304l-90.891 90.891q-12.674 12.674-32.326 12.174-19.653-.5-32.327-13.174ZM480-131.5q-8.957 0-16.913-3.359-7.957-3.358-14.913-9.315L324.456-267.891q-12.674-12.674-12.674-32.707 0-20.032 12.674-32.706 12.674-12.674 32.707-12.674t32.707 12.674L480-243.413l90.891-90.891q12.674-12.674 32.326-12.174 19.653.5 32.327 13.174t12.674 32.706q0 20.033-12.674 32.707L511.826-144.174q-5.956 5.957-14.413 9.315Q488.957-131.5 480-131.5Z"
                                    />
                                </svg>
                            {/if}
                        </button>
                    {/if}

                    <div class="flex items-center gap-4">
                        <button
                            type="button"
                            on:click={() => postDraftsDialog.showModal()}
                            class="text-sm text-gray-400 transition-none hover:text-orange dark:text-gray-500
                                dark:hover:text-orange-300"
                        >
                            {#if postDraft?.timestamp}
                                <span
                                    use:tippy={{
                                        delay: 500,
                                        content: DateTime.fromMillis(
                                            postDraft.timestamp,
                                        ).toLocaleString(DateTime.DATETIME_MED),
                                    }}
                                >
                                    Draft saved
                                    <AutoRelativeTimeView
                                        timestamp={postDraft.timestamp}
                                        suffix={true}
                                    />
                                </span>
                            {:else if $postDrafts.size > 0}
                                View all drafts ({[...$postDrafts.values()].length})
                            {/if}
                        </button>

                        <div class="flex items-stretch {isPopupWindow ? 'py-1.5' : 'py-4'}">
                            <button
                                type="button"
                                on:click={onSubmitClick}
                                disabled={!submitEnabled || !canPostToFeed}
                                class="btn-primary group {isPopupWindow ? 'text-base' : 'text-lg'}"
                            >
                                {#if isSubmittingPost}
                                    <svg
                                        aria-hidden="true"
                                        class="mr-3 inline h-4 w-4 animate-spin text-white"
                                        viewBox="0 0 100 101"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                            fill="#E5E7EB"
                                        />
                                        <path
                                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span>Creating post...</span>
                                {:else}
                                    <span>Post</span>
                                {/if}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- container -->

            {#if isFileDragged}
                <div
                    class="absolute inset-0 flex items-center justify-center bg-orange-50 opacity-90 dark:bg-gray-600"
                >
                    <div class="text-3xl font-bold opacity-80 dark:opacity-100">
                        Drop anywhere to attach
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</main>

{#if showCollectDialog}
    <dialog
        id="collectFees"
        bind:this={collectSettingsDialog}
        class="max-h-screen w-2/3 max-w-lg overflow-hidden rounded-2xl border border-gray-200 p-0
            shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    >
        <DialogOuter title="Digital collectible settings">
            <CollectSettingsDialog
                on:done={onCollectSettingsDialogDone}
                isCompact={isPopupWindow}
            />
        </DialogOuter>
    </dialog>
{/if}

<dialog
    id="selectGif"
    bind:this={gifSelectionDialog}
    class="min-h-[18rem] w-2/3 max-w-md overflow-hidden rounded-2xl border border-gray-200 p-0
        shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    on:click={(event) => {
        if (event.target && 'id' in event.target && event.target?.id === 'selectGif')
            gifSelectionDialog?.close();
    }}
>
    <DialogOuter title="Attach a GIF">
        <GifSelectionDialog
            on:gifSelected={onGifSelected}
            bind:this={gifDialogComponent}
            isCompact={isPopupWindow}
        />
    </DialogOuter>
</dialog>

<dialog
    id="enableDispatcherDialog"
    bind:this={enableDispatcherDialog}
    on:close={onDispatcherDialogClosed}
    class="w-2/3 max-w-md rounded-2xl border border-gray-200 p-0 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
>
    <DialogOuter title="Enable Signless Posting">
        <SetAccountManagerDialog on:success={() => enableDispatcherDialog?.close()} />
    </DialogOuter>
</dialog>

<dialog
    id="postDraftsDialog"
    bind:this={postDraftsDialog}
    on:close={onPostDraftDialogClosed}
    class="min-h-[20rem] w-2/3 max-w-md overflow-hidden rounded-2xl border border-gray-200 p-0 shadow-2xl
        dark:border-gray-700 dark:bg-gray-800"
    on:click={(event) => {
        if (event.target && 'id' in event.target && event.target?.id === 'postDraftsDialog')
            postDraftsDialog?.close();
    }}
>
    <DialogOuter title="Post drafts">
        <PostDraftsList on:dismiss={() => postDraftsDialog.close()} />
    </DialogOuter>
</dialog>

<Toaster richColors position="bottom-right" expand={true} />
