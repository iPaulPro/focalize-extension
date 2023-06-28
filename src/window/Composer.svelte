<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {ensureCorrectChain} from '../lib/ethers-service';
    import {getMainFocusFromMimeType, MAX_FILE_SIZE, SUPPORTED_MIME_TYPES} from '../lib/file-utils';

    import type {SelectItem} from '../lib/lens-modules';
    import {collectSettingsToModuleParams, CONTENT_WARNING_ITEMS, REFERENCE_ITEMS,} from '../lib/lens-modules';

    import {
        createAudioAttributes,
        createVideoAttributes,
        generateAudioPostMetadata,
        generateImagePostMetadata,
        generateTextPostMetadata,
        generateVideoPostMetadata,
        getUrlsFromText,
        submitPost,
    } from '../lib/lens-post';

    import {
        attachments,
        author,
        clearPostState,
        collectSettings,
        content,
        cover,
        description,
        draftId,
        file,
        loadFromDraft,
        publicationState,
        PublicationState,
        title,
    } from '../lib/stores/state-store';
    import {currentUser} from '../lib/stores/user-store';
    import {
        darkMode,
        dispatcherDialogShown,
        richTextComposer,
        useDispatcher,
        useRelay,
    } from '../lib/stores/preferences-store';

    import type {
        CollectModuleParams,
        MetadataAttributeInput,
        PublicationMetadataV2Input,
    } from '../lib/graph/lens-service';
    import {PublicationMainFocus, ReferenceModules} from '../lib/graph/lens-service';

    import ModuleChoiceItem from './components/ModuleChoiceItem.svelte';
    import ModuleSelectionItem from './components/ModuleSelectionItem.svelte';
    import PlainTextEditor from './components/PlainTextEditor.svelte';
    import PostTags from './components/PostTags.svelte';
    import CollectSettingsDialog from './components/CollectSettingsDialog.svelte';
    import MediaUploader from './components/MediaUploader.svelte';
    import PostMethodChooser from './components/PostMethodChooser.svelte';

    import Select from 'svelte-select';
    import toast, {Toaster} from 'svelte-french-toast';
    import tooltip from 'svelte-ktippy';
    import {beforeUpdate, onDestroy, onMount, tick} from 'svelte';
    import {fade} from 'svelte/transition';

    import tags from 'language-tags';
    import GifSelectionDialog from './components/GifSelectionDialog.svelte';
    import SetDispatcherDialog from './components/SetDispatcherDialog.svelte';
    import {ensureUser, type User} from '../lib/user';
    import {getDraft, postDrafts, saveDraft} from '../lib/stores/draft-store';

    import {Subject} from 'rxjs';
    import {debounceTime} from 'rxjs/operators';
    import PostDraftsList from '../lib/components/PostDraftsList.svelte';
    import AutoRelativeTimeView from '../lib/components/AutoRelativeTimeView.svelte';
    import PostPreview from './components/PostPreview.svelte';
    import DialogOuter from '../lib/components/DialogOuter.svelte';
    import {throttle} from 'throttle-debounce';
    import {DateTime} from 'luxon';
    import {getSearchParams, getSearchParamsMap, isPopup, launchComposerTab, POPUP_MIN_HEIGHT} from '../lib/utils';
    import {launchComposerWindow} from '../lib/utils.js';
    import type {CollectSettings} from '../lib/collect-settings';
    import type {PostDraft} from '../lib/post-draft';

    /**
     * Bound to the tag component
     */
    let getTags: () => string[];

    let onGifDialogShown: () => {};

    let mainFocus: PublicationMainFocus;

    let postContentWarning = CONTENT_WARNING_ITEMS[0];
    let referenceItem: SelectItem<ReferenceModules> = REFERENCE_ITEMS[0];

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
    let mainDiv: HTMLElement;

    const draftSubject: Subject<PostDraft> = new Subject();
    let postDraft: PostDraft;
    let postMetaData: PublicationMetadataV2Input;
    let currentTabData: {
        title: string,
        desc: string,
        url: string,
        icon: string,
    } | undefined;

    $: referenceModuleParams = referenceItem.value;
    $: isMediaPostType = $attachments && $attachments.length > 0;

    const getCurrentTabData = (): {
        title: string,
        desc: string,
        url: string,
        icon: string,
    } | undefined => {
        const queryString = window.location.search;
        const urlParams = getSearchParamsMap(queryString);

        const title = urlParams.title;
        const desc = urlParams.desc;
        const url = urlParams.url;
        const icon = urlParams.icon;

        return title || desc ? {
            title,
            desc,
            url,
            icon
        } : undefined;
    }

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
    };

    const showCollectSettingsDialog = async () => {
        showCollectDialog = true;
        await tick();
        collectSettingsDialog?.showModal();
    };

    const onCollectSettingsDialogDone = (e) => {
        collectSettingsDialog?.close();
        showCollectDialog = false;
    };

    const showGifSelectionDialog = async () => {
        gifSelectionDialog?.showModal();
        onGifDialogShown();
    }

    const buildMetadata = (): PublicationMetadataV2Input => {
        if (!$currentUser) throw new Error('No user found');

        if (!isMediaPostType) {
            // TODO validate

            let postType = PublicationMainFocus.TextOnly;

            const urls = getUrlsFromText($content);
            if (urls.length > 0) {
                postType = PublicationMainFocus.Link;
            }

            return generateTextPostMetadata(
                $currentUser.handle,
                $content,
                postType,
                getTags(),
                postContentWarning.value,
            );
        }

        if ($cover) {
            $attachments[0].cover = `ipfs://${$cover.cid}`
        }

        const tags = getTags().length === 0 ? null : getTags();
        let attributes: MetadataAttributeInput[] = [];

        mainFocus = getMainFocusFromMimeType($attachments[0].type);

        let metadata: PublicationMetadataV2Input;

        switch (mainFocus) {
            case PublicationMainFocus.Image:
                metadata = generateImagePostMetadata(
                    $currentUser.handle,
                    $attachments,
                    $title,
                    $content,
                    tags,
                    postContentWarning.value,
                    $description,
                );
                break;
            case PublicationMainFocus.Video:
                attributes = createVideoAttributes();
                metadata = generateVideoPostMetadata(
                    $currentUser.handle,
                    $attachments,
                    $title,
                    $cover?.cid ? `ipfs://${$cover.cid}` : undefined,
                    $cover?.type,
                    $content,
                    attributes,
                    tags,
                    postContentWarning.value,
                    $description,
                );
                break;
            case PublicationMainFocus.Audio:
                if ($author) attributes = createAudioAttributes($author);
                metadata = generateAudioPostMetadata(
                    $currentUser.handle,
                    $attachments,
                    $title,
                    $cover?.cid ? `ipfs://${$cover.cid}` : undefined,
                    $cover?.type,
                    $content,
                    attributes,
                    tags,
                    postContentWarning.value,
                    $description,
                );
                break;
        }

        if (metadata) {
            metadata.locale = locale?.value ?? navigator.languages[0];
            return metadata;
        }

        throw new Error('Unrecognized attachment');
    };

    const onSubmitClick = async () => {
        if (!$currentUser) throw new Error('No user found');

        isSubmittingPost = true;

        try {
            await ensureCorrectChain();
        } catch (e) {
            console.log(`Error ${e.code}: ${e.message}`);
            toast.error('Error switching chains', {duration: 5000});
            return;
        }

        let collectModuleParams: CollectModuleParams;
        try {
            collectModuleParams = collectSettingsToModuleParams($currentUser.address, $collectSettings);
        } catch (e) {
            console.error(e);
            toast.error(e.message, {duration: 5000});
            return;
        }

        try {
            postMetaData = buildMetadata();

            console.log('onSubmitClick: postMetaData, ', postMetaData, ' collectModuleParams', collectModuleParams);

            const publicationId = await submitPost(
                $currentUser,
                $draftId,
                postMetaData,
                referenceModuleParams,
                collectModuleParams,
                $useDispatcher,
                $useRelay
            );

            postId = `${$currentUser.profileId}-${publicationId}`;
            console.log('onSubmitClick: post id', postId);

            clearPostState();
        } catch (e) {
            console.error(e);
            toast.error('Error creating post', {duration: 5000});
        } finally {
            isSubmittingPost = false;
        }
    };

    const getCollectPrice = (settings: CollectSettings): string | undefined => {
        if (!settings?.price) return 'Free collect';
        return settings.price + ' $' + settings.token?.symbol;
    };

    const getCollectString = (settings: CollectSettings): string | undefined => {
        if (!settings || !settings.isCollectible) return null;

        let subtext: string, edition: string;

        let text = getCollectPrice(settings);
        console.log('getCollectString', settings, text);

        const getTimed = () => settings.durationInHours > 0
            ? `${settings.durationInHours} hours`
            : DateTime.fromISO(settings.endDate).toLocaleString(DateTime.DATETIME_SHORT)

        if (settings.limit) {
            edition = settings.limit === 1 ? 'Edition' : 'Editions';
            subtext = `${settings.limit} ${edition}` + (settings.timed ? `, ${getTimed()}` : '');
        } else
            if (settings.timed) {
            subtext = getTimed();
        }

        if (!text) {
            text = subtext;
        } else if (subtext) {
            text += ', ' + subtext;
        }
        return text;
    }

    $: collectFeeString = getCollectString($collectSettings);

    $: collectPrice = getCollectPrice($collectSettings);

    const setAttachment = (f: File) => {
        if (f.type === 'image/heic') {
            toast.error('HEIC files are not supported. Please use a tool like cloudconvert.com to convert to JPG or WEBP.', {duration: 5000});
            isFileDragged = false;
            return;
        }

        if (!f || !f.type ||
            !SUPPORTED_MIME_TYPES.includes(f.type) ||
            f.size > MAX_FILE_SIZE
        ) {
            toast.error('File not supported', {duration: 5000});
            isFileDragged = false;
            return;
        }

        file.set(f);
        console.log('setAttachment: file', $file);
        isFileDragged = false;
    };

    const onFileDropped = (ev) => {
        setFileIsDragged(false);
        const dt = ev.dataTransfer;
        const file: File = dt.files[0];
        console.log('File dropped', file);
        setAttachment(file);
    };

    $: submitEnabled = !isSubmittingPost && ($content?.length > 0 || isMediaPostType);

    const locales = navigator.languages.map(tag => ({
        value: tag,
        label: tags(tag).language()?.descriptions().join(', ')
    }));

    $: locale = navigator.languages[0];

    const onGifSelected = () => {
        gifSelectionDialog?.close();
    };

    const onUseDispatcherSelected = () => {
        if (!$currentUser) throw new Error('No user found');

        if (!$currentUser.canUseRelay) {
            enableDispatcherDialog.showModal();
        }
    };

    const onDispatcherDialogClosed = () => {
        $dispatcherDialogShown = true

        if ($currentUser?.canUseRelay === false) {
            $useDispatcher = false;
        }
    };

    $: if ($darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    $: if ($currentUser === null) {
        chrome.runtime.openOptionsPage();
    }

    $: if ($dispatcherDialogShown && $currentUser?.canUseRelay === false) {
        $useDispatcher = false;
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

    const buildDraft = (): PostDraft => ({
        id: $draftId,
        title: $title,
        content: $content,
        description: $description,
        attachments: $attachments,
        author: $author,
        collectFee: $collectSettings
    });

    const onDraftChanged = async (draft: PostDraft) => {
        postDraft = await saveDraft(draft);
        $draftId = postDraft.id;
        console.log('onDraftChanged: saved draft', postDraft);
    };

    const debouncedDraftUpdate = draftSubject.pipe(debounceTime(1000)).subscribe(onDraftChanged);

    $: if ($content || $title || $description || $attachments || $author || $collectSettings.isCollectible !== undefined) {
        const draft = buildDraft();
        draftSubject.next(draft);
    }

    const openDraft = async () => {
        postDraft = await getDraft($draftId);
        console.log('openDraft: postDraft', postDraft);
        if (postDraft) {
            loadFromDraft(postDraft);
        }
    };

    const setFileIsDragged = throttle(300, (isDragged: boolean) => {
        isFileDragged = isDragged;
    });

    const clearCurrentTabData = () => {
        currentTabData = null;
    };

    const onCurrentTabDataClicked = () => {
        if (!currentTabData) return;

        if (!$richTextComposer) {
            $content = `${currentTabData.title}\n\n"${currentTabData.desc}"\n\n${currentTabData.url}`;
            return;
        }

        let md = '';

        if (currentTabData.title) md += `**${currentTabData.title}**`;
        if (currentTabData.desc) md += `\n  > ${currentTabData.desc.replace('\n', '\n> ')}`;
        if (currentTabData.url) md += `\n\n${currentTabData.url}`;
        if (md.length > 0) $content = $content ? $content + '\n' + md : md;
    };

    const ensureDraft = async () => {
        if (!$draftId && submitEnabled) {
            const draft = buildDraft();
            postDraft = await saveDraft(draft);
            $draftId = postDraft.id;
        } else if ($draftId) {
            $draftId = $draftId;
        }
    }

    const openInNewTab = async () => {
        await ensureDraft();
        await launchComposerTab($draftId)
    };

    const openInPopupWindow = async () => {
        await ensureDraft();
        await launchComposerWindow(null, $draftId)
    };

    $: if ($draftId !== postDraft?.id) {
        openDraft();
    }

    $: if (isMediaPostType) {
        clearCurrentTabData();
    }

    $: if ($content?.length > 0) {
        clearCurrentTabData();
    }

    beforeUpdate(async () => {
        await setWindowType();
    });

    onMount(async () => {
        await ensureUser((user: User) => {
            if (!user.canUseRelay && !$dispatcherDialogShown && !enableDispatcherDialog?.open) {
                enableDispatcherDialog.showModal();
            }
        });

        parseSearchParams();

        if ($draftId) await openDraft();
    });

    onDestroy(() => {
        debouncedDraftUpdate?.unsubscribe();
    });
</script>

<main bind:this={mainDiv} class="w-full min-h-full dark:bg-gray-900 bg-neutral-50 {isPopupWindow ? 'compact' : ''}"
      on:drop|preventDefault|stopPropagation={onFileDropped}
      on:dragenter|preventDefault|stopPropagation={() => setFileIsDragged(true)}
      on:dragover|preventDefault|stopPropagation={() => setFileIsDragged(true)}
      on:dragleave|preventDefault|stopPropagation={() => setFileIsDragged(false)}>

  {#if (postMetaData && $publicationState && $publicationState !== PublicationState.ERROR) || postId}

    <div bind:this={contentDiv} bind:offsetHeight={contentDivHeight}>
      <PostPreview currentUser={$currentUser} publicationState={$publicationState} {postMetaData} {postId} />
    </div>

  {:else}

    <div class="w-full min-h-screen">

      <div id="content" bind:this={contentDiv} bind:offsetHeight={contentDivHeight}
           class="min-h-full container max-w-screen-md mx-auto {isPopupWindow ? '' : 'pt-6'}">

        <div class="min-h-[12rem] bg-white dark:bg-gray-800  {isSubmittingPost ? 'opacity-60' : ''}
             {isPopupWindow ? 'shadow p-2 rounded-b-2xl' : 'mx-2 rounded-2xl p-4 shadow-lg'}">

          <PlainTextEditor disabled={isSubmittingPost} isCompact={isPopupWindow}
                           on:fileSelected={(e) => setAttachment(e.detail)}
                           on:selectGif={(e) => showGifSelectionDialog()}/>

          {#if isPopupWindow === true}
            <button type="button" on:click={openInNewTab} use:tippy={({delay: 400, content: 'Open in a new tab'})}
                    class="absolute right-4 top-4 opacity-30 hover:opacity-100 p-2 hover:bg-gray-200
                    dark:hover:bg-gray-700 rounded-full">
              <svg class="w-5 h-5" viewBox="0 -960 960 960" fill="currentColor">
                <path
                    d="M160-114.5q-19.152 0-32.326-13.174T114.5-160v-240q0-19.152 13.174-32.326T160-445.5q19.152 0 32.326 13.174T205.5-400v130.608L690.608-754.5H560q-19.152 0-32.326-13.174T514.5-800q0-19.152 13.174-32.326T560-845.5h240q19.152 0 32.326 13.174T845.5-800v240q0 19.152-13.174 32.326T800-514.5q-19.152 0-32.326-13.174T754.5-560v-130.608L269.392-205.5H400q19.152 0 32.326 13.174T445.5-160q0 19.152-13.174 32.326T400-114.5H160Z"/>
              </svg>
            </button>
          {:else if isPopupWindow === false}
            <button type="button" on:click={openInPopupWindow} use:tippy={({delay: 400, content: 'Open in a popup window'})}
                    class="absolute right-6 top-10 opacity-40 hover:opacity-100 p-2 hover:bg-gray-200
                    dark:hover:bg-gray-700 rounded-full">
              <svg class="w-5 h-5" viewBox="0 -960 960 960" fill="currentColor">
                <path
                    d="M182.152-114.022q-27.599 0-47.865-20.265-20.265-20.266-20.265-47.865v-595.696q0-27.697 20.265-48.033 20.266-20.337 47.865-20.337h242.783q14.424 0 24.244 10.012Q459-826.194 459-811.717q0 14.478-9.821 24.174-9.82 9.695-24.244 9.695H182.152v595.696h595.696v-242.783q0-14.424 9.871-24.244Q797.59-459 812.068-459q14.477 0 24.313 9.821 9.837 9.82 9.837 24.244v242.783q0 27.599-20.337 47.865-20.336 20.265-48.033 20.265H182.152Zm181.609-250q-9.326-9.804-9.826-23.385-.5-13.581 9.695-23.963l366.718-366.478H553.065q-14.424 0-24.244-9.871Q519-797.59 519-812.068q0-14.477 9.821-24.313 9.82-9.837 24.244-9.837h258.848q14.394 0 24.349 9.956 9.956 9.955 9.956 24.349v258.848q0 14.424-10.012 24.244Q826.194-519 811.717-519q-14.478 0-24.174-9.821-9.695-9.82-9.695-24.244v-176.283L411.37-362.63q-9.638 9.195-23.591 9.076-13.953-.12-24.018-10.468Z"/>
              </svg>
            </button>
          {/if}

          {#if currentTabData}

            <div on:click={onCurrentTabDataClicked} out:fade={{duration: 200}}
                 class="flex w-fit max-w-[70%] ml-[5.5rem] pt-1 pb-2 pr-2 truncate
                        cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900
                        rounded-lg border border-dashed border-gray-300 dark:border-gray-500">

              <div class="flex justify-center items-center px-4">
                <svg class="w-5 h-5 text-orange-600 dark:text-orange-200" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 10l6-6 6 6"/>
                  <path d="M4 20h7a4 4 0 0 0 4-4V5"/>
                </svg>
              </div>

              <div class="flex flex-col truncate">
                <div class="flex justify-between items-end gap-24">
                  <div class="flex gap-0.5 text-orange-600 dark:text-orange-200 transition-none font-semibold items-center">
                    <span>Share {isPopupWindow ? 'current' : 'latest'} tab</span>
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>

                  <button type="button" on:click={clearCurrentTabData}
                          class="p-1 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-full transition-none">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div class="flex text-sm font-medium pt-0.5 pr-4 truncate items-center gap-1">
                  {#if currentTabData.icon}
                    <img src={currentTabData.icon} alt="Favicon" class="h-4">
                  {/if}
                  <span class="transition-none truncate">{currentTabData.title}</span>
                </div>

                {#if currentTabData.desc}
                  <div class="opacity-60 transition-none pr-4 truncate whitespace-pre-wrap">
                    {currentTabData.desc}
                  </div>
                {/if}
              </div>

            </div>

          {/if}

          {#if isMediaPostType || $file}
            <MediaUploader isCollectable={$collectSettings.isCollectible} {collectPrice}/>
          {/if}

          <div class="flex flex-wrap gap-4 ml-[4.5rem]
               {isPopupWindow ? 'pt-2' : 'pt-3'}
               {isMediaPostType || currentTabData ? '' : 'border-t border-t-gray-200 dark:border-t-gray-700'}">

            <Select bind:value={referenceItem}
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
                    class="!w-fit hover:!bg-gray-100 dark:hover:!bg-gray-600 !rounded-full !border-none !ring-0
                    focus:!outline-none !focus:ring-0 focus:!border-none !bg-none">

              <div slot="item" let:item let:index>
                <ModuleChoiceItem {item} />
              </div>

              <div slot="selection" let:selection class="flex cursor-pointer">
                <ModuleSelectionItem {selection} />
              </div>

              <div slot="chevron-icon">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>

            </Select>

            <button type="button" on:click={showCollectSettingsDialog}
                    class="py-3 px-4 text-orange-700 flex items-center gap-2
                    dark:text-orange-200 font-semibold sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full">

              <svg class="w-5 h-5 inline" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 1 1-8 0"/>
              </svg>

              <span class="pl-1">
                {$collectSettings.isCollectible ? collectFeeString : 'Create a digital collectible'}
              </span>

              <svg class="w-4 h-4 inline" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

          </div>

        </div>

        {#if showAdvanced || !isPopupWindow}

          <div class="flex flex-wrap border-b border-gray-200 dark:border-gray-800 {isPopupWindow ? 'py-2' : 'py-3'} px-2 gap-4
               {isSubmittingPost ? 'opacity-60' : ''}">

            {#if locales.length > 0}
              <Select bind:value={locale}
                      items={locales}
                      disabled={isSubmittingPost}
                      listOffset={-48}
                      clearable={false}
                      searchable={false}
                      showChevron={true}
                      listAutoWidth={false}
                      --item-is-active-bg="#DB4700"
                      --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                      --height="{isPopupWindow ? '2.5rem' : '3rem'}"
                      --item-height="{isPopupWindow ? '2.5rem' : '3rem'}"
                      --font-size="{isPopupWindow ? '0.75rem' : '0.875rem'}"
                      --list-border-radius="0.75rem" --list-z-index={20}
                      --selected-item-padding="{isPopupWindow ? '0.25rem 0 0.25rem 0.25rem' : '0.5rem 0 0.5rem 0.5rem'}"
                      --background="transparent"
                      --list-background={$darkMode ? '#374354' : 'white'}
                      class="!w-fit !h-fit !bg-white dark:!bg-gray-800 hover:!bg-gray-100 dark:!hover:bg-gray-600
                      !shadow !text-sm !text-gray-800 dark:!text-gray-300 dark:!hover:text-gray-100
                      !rounded-full !border-none !ring-0 focus:!outline-none focus:!ring-0 focus:!border-none">
                <div slot="prepend" class="pr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4"
                       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </div>
                <div slot="chevron-icon">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </Select>
            {/if}

            <Select bind:value={postContentWarning}
                    items={CONTENT_WARNING_ITEMS}
                    clearable={false}
                    searchable={false}
                    listAutoWidth={true}
                    showChevron={true}
                    disabled={isSubmittingPost}
                    listOffset={-48}
                    --item-is-active-bg="#DB4700"
                    --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'}
                    --list-z-index={20}
                    --font-size="{isPopupWindow ? '0.8rem' : '0.875rem'}"
                    --background="transparent"
                    --list-background={$darkMode ? '#374354' : 'white'}
                    --selected-item-padding="{isPopupWindow ? '0.25rem 0 0.25rem 0.25rem' : '0.5rem 0 0.5rem 0.5rem'}"
                    --list-border-radius="0.75rem"
                    --height="{isPopupWindow ? '2.5rem' : '3rem'}"
                    --item-height="{isPopupWindow ? '2.5rem' : '3rem'}"
                    class="!w-fit !h-fit !bg-white dark:!bg-gray-800 hover:!bg-gray-100 dark:!hover:bg-gray-600
                      !shadow !text-sm !text-gray-800 dark:!text-gray-300 dark:!hover:text-gray-100
                      !rounded-full !border-none !ring-0 focus:!outline-none focus:!ring-0 focus:!border-none">
              <div slot="prepend" class="pr-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4"
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div slot="chevron-icon">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </Select>

            <PostTags bind:getTags disabled={isSubmittingPost} isCompact={isPopupWindow}/>

          </div>

        {/if}

        <div class="flex {isPopupWindow ? 'justify-between' : 'justify-end'} items-center px-2">

          {#if isPopupWindow}
            <button type="button" on:click={() => {showAdvanced = !showAdvanced}}
                    use:tippy={({delay: 400, content: 'More options'})}
                    class="px-2 opacity-40 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 hover:opacity-100 rounded-full">
              {#if showAdvanced}
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 -960 960 960">
                  <path
                      d="M480-575.5q-8.957 0-17.413-3.359-8.457-3.358-14.413-9.315l-124-124Q311.5-724.848 311.5-744t12.674-31.826Q336.848-788.5 356-788.5t31.826 12.674L480-683.652l92.174-92.174Q584.848-788.5 604-788.5t31.826 12.674Q648.5-763.152 648.5-744t-12.674 31.826l-124 124q-6.717 6.718-14.793 9.696Q488.957-575.5 480-575.5ZM324.174-184.174Q311.5-196.848 311.5-216t12.674-31.826l124-124q6.956-6.957 14.913-9.815Q471.043-384.5 480-384.5t17.413 2.859q8.457 2.858 14.413 9.815l124.761 124.761q12.674 12.674 12.294 31.445-.381 18.772-13.055 31.446Q623.152-171.5 604-171.5t-31.826-12.674L480-276.348l-92.174 92.174Q375.152-171.5 356-171.5t-31.826-12.674Z"/>
                </svg>
              {:else}
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 -960 960 960">
                  <path
                      d="M324.456-623.413q-12.674-12.674-12.674-32.707 0-20.032 12.674-32.706l123.718-123.718q6.956-6.956 14.913-9.815 7.956-2.859 16.913-2.859t17.413 2.859q8.457 2.859 14.413 9.815l124.478 124.479q12.674 12.674 12.294 32.326-.38 19.652-13.054 32.326t-32.707 12.674q-20.033 0-32.707-12.674L480-713.304l-90.891 90.891q-12.674 12.674-32.326 12.174-19.653-.5-32.327-13.174ZM480-131.5q-8.957 0-16.913-3.359-7.957-3.358-14.913-9.315L324.456-267.891q-12.674-12.674-12.674-32.707 0-20.032 12.674-32.706 12.674-12.674 32.707-12.674t32.707 12.674L480-243.413l90.891-90.891q12.674-12.674 32.326-12.174 19.653.5 32.327 13.174t12.674 32.706q0 20.033-12.674 32.707L511.826-144.174q-5.956 5.957-14.413 9.315Q488.957-131.5 480-131.5Z"/>
                </svg>
              {/if}
            </button>
          {/if}

          <div class="flex items-center gap-4">

            <button type="button" on:click={() => postDraftsDialog.showModal()}
                    class="text-sm text-gray-400 dark:text-gray-500 hover:text-orange dark:hover:text-orange-300 transition-none">
              {#if postDraft}
                <span use:tippy={({delay: 500, content: DateTime.fromMillis(postDraft.timestamp).toLocaleString(DateTime.DATETIME_MED)})}>
                  Draft saved
                  <AutoRelativeTimeView timestamp={postDraft.timestamp} className="transition-none" suffix={true} />
                </span>
              {:else if $postDrafts.size > 0}
                View all drafts ({[...$postDrafts.values()].length})
              {/if}
            </button>

            <div class="flex items-stretch {isPopupWindow ? 'py-2' : 'py-4'}">

              <button type="button" on:click={onSubmitClick} disabled={!submitEnabled}
                    class="group w-fit py-2 {$useDispatcher ? 'pl-8 pr-7' : 'pl-7 pr-6'} flex justify-center items-center
                    rounded-l-full w-auto bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700
                    disabled:bg-neutral-400 dark:disabled:bg-gray-600
                    focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                    text-white text-center {isPopupWindow ? 'text-base' : 'text-lg'}
                    transition ease-in duration-200 font-semibold shadow-md disabled:shadow-none">

                {#if isSubmittingPost}
                  <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101"
                       fill="none" xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="#E5E7EB"/>
                    <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentColor"/>
                  </svg>
                  Creating post...
                {:else}
                  <span>Post</span>
                  {#if $useRelay && !$useDispatcher}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                         class="w-5 text-white dark:text-orange-200 group-disabled:text-gray-100 ml-2">
                      <polygon points="14 2 18 6 7 17 3 17 3 13 14 2"></polygon>
                      <line x1="3" y1="22" x2="21" y2="22"></line>
                    </svg>
                  {:else if !$useDispatcher}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor"
                         class="w-5 text-white dark:text-orange-200 group-disabled:text-gray-100 ml-2"
                         use:tippy={({content: 'Pay for your own gas', delay: 200})}>
                      <path
                          d="M32.6 27.2q1.25 0 2.225-.975.975-.975.975-2.275 0-1.25-.975-2.2-.975-.95-2.225-.95t-2.225.95q-.975.95-.975 2.2 0 1.3.975 2.275.975.975 2.225.975ZM9 36.35V39 9 36.35ZM9 42q-1.15 0-2.075-.9Q6 40.2 6 39V9q0-1.15.925-2.075Q7.85 6 9 6h30q1.2 0 2.1.925Q42 7.85 42 9v6.7h-3V9H9v30h30v-6.65h3V39q0 1.2-.9 2.1-.9.9-2.1.9Zm17.9-8.65q-1.7 0-2.7-1-1-1-1-2.65V18.35q0-1.7 1-2.675 1-.975 2.7-.975h13.5q1.7 0 2.7.975 1 .975 1 2.675V29.7q0 1.65-1 2.65t-2.7 1Zm14.2-3V17.7H26.2v12.65Z"/>
                    </svg>
                  {/if}
                {/if}
              </button>

            <button type="button" disabled={!submitEnabled}
                    class="pl-3 pr-4 flex justify-center items-center rounded-r-full tooltip
                    border-l border-orange-400 dark:border-orange-700 disabled:border-neutral-300 dark:disabled:border-gray-700
                    bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700
                    disabled:bg-neutral-400 dark:disabled:bg-gray-600
                    focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                    text-white text-center text-lg dark:disabled:text-gray-400
                    transition ease-in duration-200 shadow-md disabled:shadow-none"
                      use:tooltip={{
                      component: PostMethodChooser,
                      props: {},
                      trigger: 'click',
                      interactive: true,
                      placement: 'bottom-end',
                      offset: [0, 5]
                    }}
                      on:useDispatcher={onUseDispatcherSelected}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="w-4 h-4" fill="currentColor">
                  <!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com
                  License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->
                  <path
                      d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/>
                </svg>
              </button>

            </div>

          </div>

        </div>

      </div><!-- container -->

      {#if isFileDragged}
        <div class="absolute inset-0 flex justify-center items-center bg-orange-50 dark:bg-gray-600 opacity-90">
          <div class="text-3xl font-bold opacity-80 dark:opacity-100">
            Drop anywhere to attach
          </div>
        </div>
      {/if}
    </div>

  {/if}

</main>

{#if showCollectDialog}
  <dialog id="collectFees" bind:this={collectSettingsDialog}
          class="w-2/3 max-w-lg rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600
          p-0 overflow-hidden max-h-screen">
    <DialogOuter title="Digital collectible settings">
      <CollectSettingsDialog on:done={onCollectSettingsDialogDone} isCompact={isPopupWindow}/>
    </DialogOuter>
  </dialog>
{/if}

<dialog id="selectGif" bind:this={gifSelectionDialog}
        class="w-2/3 max-w-md min-h-[18rem] rounded-2xl shadow-2xl dark:bg-gray-700 p-0 overflow-hidden
        border border-gray-200 dark:border-gray-600"
        on:click={(event) => {if (event.target.id === 'selectGif') gifSelectionDialog?.close()}}>
  <DialogOuter title="Attach a GIF">
    <GifSelectionDialog on:gifSelected={onGifSelected} bind:onGifDialogShown isCompact={isPopupWindow}/>
  </DialogOuter>
</dialog>

<dialog id="enableDispatcherDialog" bind:this={enableDispatcherDialog} on:close={onDispatcherDialogClosed}
        class="w-2/3 max-w-md rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-0">
  <DialogOuter title="Enable Dispatcher">
    <SetDispatcherDialog on:success={enableDispatcherDialog?.close()} />
  </DialogOuter>
</dialog>

<dialog id="postDraftsDialog" bind:this={postDraftsDialog}
        class="w-2/3 max-w-md min-h-[20rem] rounded-2xl shadow-2xl p-0 border border-gray-200 dark:bg-gray-700
        dark:border-gray-600 overflow-hidden"
        on:click={(event) => {if (event.target.id === 'postDraftsDialog') postDraftsDialog?.close()}}>
  <DialogOuter title="Post drafts" >
    <PostDraftsList on:dismiss={() => postDraftsDialog.close()}/>
  </DialogOuter>
</dialog>

<Toaster />