<script lang="ts">
    import {ensureCorrectChain} from '../lib/ethers-service';
    import {getMainFocusFromFileType, MAX_FILE_SIZE, SUPPORTED_MIME_TYPES} from '../lib/file-utils';
    import {getDefaultProfile} from '../lib/lens-auth';

    import type {CollectModuleItem, PaidCollectModule, SelectItem} from '../lib/lens-modules.js';
    import {
        COLLECT_ITEMS,
        CONTENT_WARNING_ITEMS,
        getCollectModuleParams,
        REFERENCE_ITEMS,
    } from '../lib/lens-modules.js';

    import {
        createAudioAttributes,
        createVideoAttributes,
        generateAudioPostMetadata,
        generateImagePostMetadata,
        generateTextPostMetadata,
        generateVideoPostMetadata,
        submitPost
    } from '../lib/lens-post.js';

    import {
        attachment,
        author,
        clearPostState,
        content,
        cover,
        darkMode,
        description,
        gifAttachment,
        profile,
        title
    } from '../lib/state';

    import type {
        MetadataAttributeInput,
        PublicationMetadataMediaInput,
        PublicationMetadataV2Input,
    } from '../graph/lens-service';
    import {CollectModules, PublicationMainFocus, ReferenceModules} from '../graph/lens-service';

    import ModuleChoiceItem from './components/ModuleChoiceItem.svelte';
    import ModuleSelectionItem from './components/ModuleSelectionItem.svelte'
    import MarkdownEditor from './components/MarkdownEditor.svelte';
    import PlainTextEditor from './components/PlainTextEditor.svelte';
    import PostTags from './components/PostTags.svelte';
    import PostTabs from './components/PostTabs.svelte';
    import CollectModuleDialog from './components/FeeCollectModuleDialog.svelte';
    import MediaUploader from './components/MediaUploader.svelte';

    import Select from 'svelte-select';
    import toast, {Toaster} from 'svelte-french-toast';
    import {onMount} from 'svelte';

    import tags from "language-tags";
    import GifSelectionDialog from './components/GifSelectionDialog.svelte'

    /**
     * Bound to the rich text editor
     */
    let getMarkdown: () => string;

    /**
     * Bound to the tag component
     */
    let getTags: () => string[];

    let initialMarkdownText: string;

    let postType: PublicationMainFocus;
    let shareUrl: string;

    let postContentWarning = CONTENT_WARNING_ITEMS[0];
    let referenceItem: SelectItem<ReferenceModules> = REFERENCE_ITEMS[0];
    let collectItem: SelectItem<CollectModuleItem> = COLLECT_ITEMS[0];

    let feeCollectModule: PaidCollectModule;

    let postId: string;
    let isSubmittingPost = false;
    let isFileDragged = false;
    let gifSelectionDialog: HTMLDialogElement;

    $: collectModuleParams = getCollectModuleParams(collectItem, feeCollectModule);

    $: referenceModuleParams = referenceItem.value;

    const getMainFocusFromUrlParams = (urlParams: URLSearchParams): PublicationMainFocus => {
        if (!urlParams.has('type')) {
            return PublicationMainFocus.TextOnly;
        }

        switch (urlParams.get('type')) {
            case 'image':
            case 'video':
                return PublicationMainFocus.Image;
            case 'link':
                return PublicationMainFocus.Link;
            case 'article':
                return PublicationMainFocus.Article;
            default:
                return PublicationMainFocus.TextOnly;
        }
    };

    const parseSearchParams = () => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        postType = getMainFocusFromUrlParams(urlParams);

        let markdown = '', linkText = '';

        if (urlParams.has('title')) {
            const title = urlParams.get('title');
            linkText += `${title}`;
            markdown += `**${title}**`;
        }

        if (urlParams.has('desc')) {
            const desc = urlParams.get('desc').replaceAll('\n', '\n> ');
            linkText += `\n\n${desc}`;
            markdown += `\n\n> ${desc}`;
        }

        if (urlParams.has('url')) {
            const url = urlParams.get('url');
            shareUrl = url;
            markdown += `\n\n<${url}>`;
        }

        if (markdown.length > 0) {
            initialMarkdownText = markdown;
        }

        if (urlParams.has('text')) {
            const plainText = urlParams.get('text');
            content.set(plainText);
        } else if (linkText.length > 0) {
            content.set(linkText)
        }
    };

    const onPostTypeChange = (e) => {
        postType = e.detail;
    };

    const showCollectFeesDialog = () => {
        const dialog: HTMLDialogElement = document.getElementById('collectFees');
        dialog.showModal();
        dialog.addEventListener('close', () => {
            if (!feeCollectModule) {
                collectItem = COLLECT_ITEMS[0];
            }
        });
    };

    const onCollectModuleChange = (e) => {
        if (e.detail.value.type === CollectModules.FeeCollectModule) {
            showCollectFeesDialog();
        } else {
            feeCollectModule = null;
        }
    };

    const onFeeCollectModuleUpdated = (e) => {
        feeCollectModule = e.detail;
        collectItem = COLLECT_ITEMS[2];
        console.log('onFeeCollectModuleUpdated', feeCollectModule);

        const dialog: HTMLDialogElement = document.getElementById('collectFees');
        if (dialog) {
            dialog.close();
        }
    };

    const showGifSelectionDialog = () => {
        gifSelectionDialog = document.getElementById('selectGif');
        gifSelectionDialog.showModal();
    }

    parseSearchParams();

    const getContent = (): string => {
        switch (postType) {
            case PublicationMainFocus.Article:
                return getMarkdown();
            case PublicationMainFocus.Link:
                return $content ? `${$content}\n\n${shareUrl}` : shareUrl;
        }
        return $content;
    };

    const buildMetadata = (): PublicationMetadataV2Input => {
        if (postType !== PublicationMainFocus.Image) {
            // Maybe an Article, Link, or plain text post
            const content = getContent();
            // TODO validate

            return generateTextPostMetadata(
                $profile.handle,
                content,
                postType,
                getTags(),
                postContentWarning.value,
            );
        }

        let mediaMetadata: PublicationMetadataMediaInput;

        if ($attachment) {
            mediaMetadata = {
                item: `ipfs://${$attachment.cid}`,
                type: $attachment.type,
            };
        } else if ($gifAttachment) {
            mediaMetadata = $gifAttachment;
        }

        if ($cover) {
            mediaMetadata.cover = `ipfs://${$cover.cid}`
        }

        const tags = getTags().length === 0 ? null : getTags();

        if ($attachment?.type.startsWith('image/') || $gifAttachment) {
            return generateImagePostMetadata(
                $profile.handle,
                mediaMetadata,
                $title,
                $content,
                tags,
                postContentWarning.value,
                $description,
            );
        } else if ($attachment?.type.startsWith('video/')) {
            const attributes = createVideoAttributes();

            return generateVideoPostMetadata(
                $profile.handle,
                mediaMetadata,
                $title,
                `ipfs://${$cover.cid}`,
                $cover.type,
                $content,
                attributes,
                tags,
                postContentWarning.value,
                $description,
            );
        } else if ($attachment?.type.startsWith('audio/')) {
            let attributes: MetadataAttributeInput[] = [];
            if ($author) {
                attributes = createAudioAttributes($author);
            }

            return generateAudioPostMetadata(
                $profile.handle,
                mediaMetadata,
                $title,
                `ipfs://${$cover.cid}`,
                $cover.type,
                $content,
                attributes,
                tags,
                postContentWarning.value,
                $description,
            );
        }

        throw 'Unrecognized attachment';
    };

    const onSubmitClick = async () => {
        isSubmittingPost = true;

        try {
            await ensureCorrectChain();
        } catch (e) {
            console.log(`Error ${e.code}: ${e.message}`);
            toast.error('Error switching chains');
        }

        try {
            const metadata = buildMetadata();
            metadata.locale = locale.value;

            const publicationId = await submitPost(
                $profile.id,
                metadata,
                referenceModuleParams,
                collectModuleParams
            );

            postId = `${$profile.id}-${publicationId}`;
            console.log('onSubmitClick: post id', postId);

            clearPostState()
        } catch (e) {
            // TODO handle post submit error
            console.error(e);
            toast.error('Error creating post');
        } finally {
            isSubmittingPost = false;
        }
    };

    const getCollectPrice = (module: PaidCollectModule) => {
        if (!module) return null;
        return module.amount.value + ' $' + module.amount.asset.symbol;
    };

    const getCollectFeeString = (module: PaidCollectModule): string => {
        if (!module) return null;

        let subtext: string, edition: string;

        switch (module.__typename) {
            case 'LimitedTimedFeeCollectModuleSettings':
                edition = module.collectLimit === "1" ? 'Edition' : 'Editions';
                subtext = `${module.collectLimit} ${edition}, 24 hours`;
                break;
            case 'LimitedFeeCollectModuleSettings':
                edition = module.collectLimit === "1" ? 'Edition' : 'Editions';
                subtext = `${module.collectLimit} ${edition}`;
                break;
            case 'TimedFeeCollectModuleSettings':
                subtext = '24 hours'
                break;
        }

        let text = getCollectPrice(module);
        if (subtext) {
            text += ', ' + subtext;
        }
        return text;
    }

    $: collectFeeString = getCollectFeeString(feeCollectModule);

    $: collectPrice = getCollectPrice(feeCollectModule);

    onMount(async () => {
        try {
            if (!$profile) {
                const defaultProfile = await getDefaultProfile();
                profile.set(defaultProfile);
            }
        } catch (e) {
            window.location = '/src/options/index.html';
        }
    });

    const setAttachment = (file: File) => {
        if (!file.type ||
            !SUPPORTED_MIME_TYPES.includes(file.type) ||
            file.size > MAX_FILE_SIZE
        ) {
            toast.error('File not supported');
            isFileDragged = false;
            return;
        }

        attachment.set(file);
        isFileDragged = false;
        postType = getMainFocusFromFileType(file.type);
    }

    const onFileDropped = (ev) => {
        const dt = ev.dataTransfer;
        const file: File = dt.files[0];
        console.log('File dropped', file);
        setAttachment(file);
    };

    $: shouldDisableSubmitBtn = isSubmittingPost ||
        (postType === PublicationMainFocus.Link && !shareUrl) ||
        (postType === PublicationMainFocus.TextOnly && (!$content || $content.length === 0) ||
        // (postType === PublicationMainFocus.Article && (!getMarkdown() || getMarkdown().length === 0)) ||
        (postType === PublicationMainFocus.Image && (!$attachment && !$gifAttachment)));

    const locales = navigator.languages.map(tag => ({
        value: tag,
        label: tags(tag).language().descriptions().join(', ')
    }))

    $: locale = navigator.languages[0];

    const onGifSelected = () => {
        postType = PublicationMainFocus.Image;
        collectItem = COLLECT_ITEMS[COLLECT_ITEMS.length - 1];
        gifSelectionDialog?.close();
    }
</script>

<main class="w-full h-full {$darkMode ? 'dark' : ''}"
      on:drop|preventDefault|stopPropagation={onFileDropped}
      on:dragenter|preventDefault|stopPropagation={() => isFileDragged = true}
      on:dragover|preventDefault|stopPropagation={() => isFileDragged = true}
      on:dragleave|preventDefault|stopPropagation={() => isFileDragged = false}>

  {#if postId}

    <div class="w-full h-full flex flex-col justify-center items-center dark:bg-gray-900">

      <svg xmlns="http://www.w3.org/2000/svg" class="text-green-600" width="72" height="72" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>

      <div class="text-2xl mt-4 dark:text-gray-100">Post created!</div>

      <a href={import.meta.env.VITE_LENS_PREVIEW_NODE + 'posts/' + postId} target="_blank" rel="noreferrer"
         class="mt-4 w-auto py-2.5 px-12 flex justify-center items-center
          bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 disabled:bg-neutral-400
          rounded-lg shadow-md
          text-white text-center text-lg font-semibold
          focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          transition ease-in duration-200 ">
        View Post
      </a>

    </div>

  {:else}

    <div class="w-full h-full bg-neutral-50 dark:bg-gray-900 {isFileDragged ? 'bg-orange-50 dark:bg-gray-500' : ''} ">

      <div class="container max-w-screen-md mx-auto pt-8">

        <PostTabs {postType} on:typeChange={onPostTypeChange} disabled={isSubmittingPost}/>

        <div class="mt-6 shadow-lg rounded-xl p-4 bg-white dark:bg-gray-800 {isSubmittingPost ? 'opacity-60' : ''}">

          {#if postType === PublicationMainFocus.TextOnly}

            <PlainTextEditor {postType} disabled={isSubmittingPost} placeholder="What's happening" rows={4}
                             on:fileSelected={(e) => setAttachment(e.detail)}
                             on:selectGif={(e) => showGifSelectionDialog()} />

          {:else if postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video || postType === PublicationMainFocus.Audio}

            <MediaUploader isCollectable={!collectModuleParams.revertCollectModule} {collectPrice} />

          {:else if postType === PublicationMainFocus.Link}

            <div class="flex flex-col grow">

              <PlainTextEditor {postType} disabled={isSubmittingPost} placeholder="Text (optional)" rows={3}
                               on:fileSelected={(e) => setAttachment(e.detail)} />

              <div class="pl-24 pr-4 py-2 mt-4">
                <input type="url" id="post-url" placeholder="Url" autocomplete="off"
                       bind:value={shareUrl} disabled={isSubmittingPost}
                       class="appearance-none border border-gray-300 w-full py-3 px-4 text-gray-800 rounded-lg
                   placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-orange-200
                   focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-transparent"/>
              </div>

            </div>

          {:else if postType === PublicationMainFocus.Article}

            <MarkdownEditor bind:getText={getMarkdown} defaultValue={initialMarkdownText} darkMode={$darkMode} />

          {/if}

          <div class="flex pt-3 gap-4 mt-4 border-t border-t-gray-300 dark:border-t-gray-700
                   {postType === PublicationMainFocus.TextOnly || postType === PublicationMainFocus.Link ? 'ml-20' : 'ml-0 justify-center'}">

            <Select items={REFERENCE_ITEMS} bind:value={referenceItem}
                    clearable={false} searchable={false} listAutoWidth={false} showChevron={false} listOffset={-56}
                    containerStyles="cursor: pointer;" disabled={isSubmittingPost}
                    --item-height="auto" --item-is-active-bg="#DB4700" --item-hover-bg="transparent" --list-max-height="auto"
                    --background="transparent" --list-background={$darkMode ? '#374354' : 'white'} --item-padding="0"
                    --disabled-background="transparent"
                    class="w-fit hover:bg-gray-100 dark:hover:bg-gray-600 disabled:hover:bg-transparent
                    rounded-xl border-none ring-0
                    focus:outline-none focus:ring-0 focus:border-none bg-none">

              <div slot="item" let:item let:index>
                <ModuleChoiceItem {item} />
              </div>

              <div slot="selection" let:selection class="flex cursor-pointer">
                <ModuleSelectionItem {selection} />
              </div>

            </Select>

            <Select items={COLLECT_ITEMS} bind:value={collectItem} on:change={onCollectModuleChange}
                    clearable={false} searchable={false} listAutoWidth={false} showChevron={false}
                    disabled={isSubmittingPost} listOffset={-56}
                    --item-height="auto" --item-is-active-bg="#DB4700" --item-hover-bg="transparent" --list-max-height="auto"
                    --background="transparent" --list-background={$darkMode ? '#374354' : 'white'} --item-padding="0"
                    --disabled-background="transparent"
                    class="w-fit hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border-none ring-0
                    focus:outline-none focus:ring-0 focus:border-none bg-none">

              <div slot="item" let:item let:index>
                <ModuleChoiceItem item={collectFeeString && index === 2 ? {label: item.label, summary: collectFeeString, icon: 'collect_paid', btn: showCollectFeesDialog} : item} />
              </div>

              <div slot="selection" let:selection let:index class="flex">
                <ModuleSelectionItem selection={collectFeeString && selection.label === COLLECT_ITEMS[2].label ? {label: collectFeeString, icon: 'collect_paid'} : selection} />
              </div>

            </Select>

          </div>

        </div>

        <div class="flex flex-wrap border-b border-neutral-300 dark:border-gray-800 py-5 gap-4
             {isSubmittingPost ? 'opacity-60' : ''}">

          {#if locales.length > 0}
            <Select items={locales} bind:value={locale} disabled={isSubmittingPost}
                    clearable={false} searchable={false} showChevron={true} listAutoWidth={false}
                    --item-is-active-bg="#DB4700" --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'} --font-size="0.875rem"
                    --background="transparent" --list-background={$darkMode ? '#374354' : 'white'} --selected-item-padding="0.5rem"
                    class="w-fit h-fit max-w-xs bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 shadow
                    text-sm text-gray-800 dark:text-gray-300 dark:hover:text-gray-100
                    rounded-xl border-none ring-0 focus:outline-none focus:ring-0 focus:border-none">
              <div slot="prepend" class="pr-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4"
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </div>
            </Select>
          {/if}

          <Select items={CONTENT_WARNING_ITEMS} clearable={false} searchable={false} listAutoWidth={false} showChevron={true}
                  bind:value={postContentWarning} disabled={isSubmittingPost}
                  --item-is-active-bg="#DB4700" --item-hover-bg={$darkMode ? '#1F2937' : '#FFB38E'} --font-size="0.875rem"
                  --background="transparent" --list-background={$darkMode ? '#374354' : 'white'} --selected-item-padding="0.5rem"
                  class="w-fit h-fit bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 shadow
                  text-gray-800 dark:text-gray-300 dark:hover:text-gray-100
                  rounded-xl border-none ring-0 focus:outline-none focus:ring-0 focus:border-none">
            <div slot="prepend" class="pr-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </Select>

          <PostTags bind:getTags disabled={isSubmittingPost}/>

        </div>

        <div class="flex justify-between pb-6 items-center">

          <label class="switch">
            <input type="checkbox" bind:checked={$darkMode}>
            <span class="slider bg-gray-200 dark:bg-gray-600 round flex justify-between items-center px-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   class="w-4 h-4 text-orange-300"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <path
                    d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   class="w-4 h-4 text-gray-600"
                   stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </span>
          </label>

          <button on:click={onSubmitClick} disabled={shouldDisableSubmitBtn}
                  class="mt-4 w-fit py-2 px-12 flex justify-center items-center rounded-xl w-auto
                  bg-orange-500 hover:bg-orange-600 dark:bg-orange-700 dark:hover:bg-orange-800
                  disabled:bg-neutral-400 dark:disabled:bg-gray-600
                  focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                  text-white text-center text-lg dark:disabled:text-gray-400
                  transition ease-in duration-200 font-semibold shadow-md">

            {#if isSubmittingPost}
              <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101"
                   fill="none"
                   xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="#E5E7EB"/>
                <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentColor"/>
              </svg>
              Creating post...
            {:else}
              Post
            {/if}
          </button>

        </div>

      </div><!-- container -->

    </div>

  {/if}

  <dialog id="collectFees" class="rounded-2xl shadow-2xl dark:bg-gray-700">
    <CollectModuleDialog on:moduleUpdated={onFeeCollectModuleUpdated}/>
  </dialog>

  <dialog id="selectGif" on:close={() => gifSelectionDialog = null}
          on:click={(event) => {if (event.target.id === 'selectGif') gifSelectionDialog?.close()}}
          class="w-2/3 lg:w-1/3 min-h-[20rem] rounded-2xl shadow-2xl dark:bg-gray-700">
    <GifSelectionDialog visible={gifSelectionDialog != null} on:gifSelected={onGifSelected} />
  </dialog>
</main>

<Toaster />

<style>
  /* The switch - the box around the slider */
  .switch {
    position: relative;
    display: inline-block;
    width: 3.5rem;
    height: 1.75rem;
  }

  /* Hide default HTML checkbox */
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The slider */
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    -webkit-transition: .4s;
    transition: .4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 1.25rem;
    width: 1.25rem;
    left: 0.25rem;
    bottom: 0.25rem;
    background-color: white;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    -webkit-transition: .4s;
    transition: .4s;
  }

  .dark .slider:before {
    background-color: #91A3B8;
  }

  input:checked + .slider {
    background-color: #202B39;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #202B39;
  }

  input:checked + .slider:before {
    transform: translateX(1.75rem);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 1.75rem;
  }

  .slider.round:before {
    border-radius: 50%;
  }
</style>