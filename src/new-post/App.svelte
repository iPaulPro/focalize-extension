<script lang="ts">
    import {ensureCorrectChain} from '../lib/ethers-service';

    import {MAX_FILE_SIZE, SUPPORTED_MIME_TYPES} from '../lib/file-utils';
    import {getDefaultProfile} from '../lib/lens-auth';

    import {
        generateImagePostMetadata,
        generateTextPostMetadata,
        generateVideoPostMetadata,
        getCollectModuleParams,
        REVERT_COLLECT_MODULE,
        submitPost
    } from '../lib/lens-post.js'

    import type {
        CollectModule,
        CollectModuleParams,
        PublicationMetadataMediaInput,
        PublicationMetadataV2Input,
    } from '../graph/lens-service';
    import {CollectModules, PublicationContentWarning, PublicationMainFocus} from '../graph/lens-service';

    import {attachment, clearPostState, content, profile, title} from '../lib/state';

    import Select from 'svelte-select';
    import toast, {Toaster} from 'svelte-french-toast';

    import ModuleChoiceItem from './components/ModuleChoiceItem.svelte';
    import ModuleSelectionItem from './components/ModuleSelectionItem.svelte'
    import MarkdownEditor from './components/MarkdownEditor.svelte';
    import PlainTextEditor from './components/PlainTextEditor.svelte'
    import PostTags from './components/PostTags.svelte';
    import PostTabs from './components/PostTabs.svelte'
    import CollectModuleDialog from './components/FeeCollectModuleDialog.svelte'
    import MediaUploader from './components/MediaUploader.svelte'

    import {onMount} from 'svelte';

    const followerOnlyItems = [
        {value: false, label: 'Everyone can engage', summary: 'Anyone can reply, repost, and collect', icon: 'earth'},
        {value: true, label: 'Followers only', summary: 'Only your followers can reply, repost, and collect', icon: 'followers'},
    ];

    const collectItems = [
        {value: CollectModules.FreeCollectModule, label: 'Free to collect', summary: 'Post can be collected as an NFT for free', icon: 'collect_free'},
        {value: CollectModules.FeeCollectModule, label: 'Sell NFT', summary: 'Charge for NFT collection', icon: 'collect_paid'},
        {value: CollectModules.RevertCollectModule, label: 'Disable Collection', summary: 'Do not allow the post to be collected as an NFT', icon: 'collect_disabled'},
    ];

    const contentWarningItems = [
        {value: '', label: 'No content warning'},
        {value: PublicationContentWarning.Nsfw, label: 'NSFW'},
        {value: PublicationContentWarning.Spoiler, label: 'Spoiler'},
        {value: PublicationContentWarning.Sensitive, label: 'Sensitive'},
    ]

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

    let postContentWarning = contentWarningItems[0];
    let followerOnly = followerOnlyItems[0];
    let collectItem = collectItems[0];

    let feeCollectModule: CollectModule;

    let postId: string;
    let isSubmittingPost = false;
    let isFileDragged = false;

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
                collectItem = collectItems[0];
            }
        });
    };

    const onCollectModuleChange = (e) => {
        if (e.detail.value === CollectModules.FeeCollectModule) {
            showCollectFeesDialog();
        } else {
            feeCollectModule = null;
        }
    };

    const onFeeCollectModuleUpdated = (e) => {
        feeCollectModule = e.detail;
        console.log('onFeeCollectModuleUpdated', feeCollectModule);

        const dialog: HTMLDialogElement = document.getElementById('collectFees');
        if (dialog) {
            dialog.close();
        }
    };

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

        const mediaMetadata: PublicationMetadataMediaInput = {
            item: `ipfs://${$attachment.cid}`,
            type: $attachment.type
        };

        if ($attachment.type.startsWith('image/')) {
            return generateImagePostMetadata(
                $profile.handle,
                mediaMetadata,
                $title,
                $content,
                getTags(),
                postContentWarning.value,
            );
        } else if ($attachment.type.startsWith('video/')) {
            return generateVideoPostMetadata(
                $profile.handle,
                mediaMetadata,
                $title,
                $content,
                getTags(),
                postContentWarning.value,
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

        let collect: CollectModuleParams;
        switch (collectItem.value) {
            case CollectModules.FreeCollectModule:
                collect = {freeCollectModule: {followerOnly: followerOnly.value}};
                break;
            case CollectModules.RevertCollectModule:
                collect = REVERT_COLLECT_MODULE;
                break;
            case CollectModules.FeeCollectModule:
                collect = getCollectModuleParams(feeCollectModule);
                break;
        }

        const metadata = buildMetadata();

        try {
            const publicationId = await submitPost(
                $profile.id,
                metadata,
                followerOnly.value,
                collect
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

    const getCollectFeeString = (module: CollectModule): string => {
        if (!module) return null;

        let subtext: string, edition: string;

        switch (module.__typename) {
            case 'FreeCollectModuleSettings':
            case 'UnknownCollectModuleSettings':
            case 'RevertCollectModuleSettings':
                throw 'Unsupported module type';

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

        let text = module.amount.value + ' $' + module.amount.asset.symbol;
        if (subtext) {
            text += ', ' + subtext;
        }
        return text;
    }

    $: collectFeeString = getCollectFeeString(feeCollectModule);

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

    const onFileDropped = (ev) => {
        const dt = ev.dataTransfer;
        const file: File = dt.files[0];
        console.log('File dropped', file);

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
        postType = PublicationMainFocus.Image;
    };

    $: shouldDisableSubmitBtn = isSubmittingPost ||
        (postType === PublicationMainFocus.Link && !shareUrl) ||
        (postType === PublicationMainFocus.TextOnly && (!$content || $content.length === 0) ||
        // (postType === PublicationMainFocus.Article && (!getMarkdown() || getMarkdown().length === 0)) ||
        (postType === PublicationMainFocus.Image && !$attachment));
</script>

<main class="w-full h-full {isFileDragged ? 'bg-orange-50' : 'bg-none'}"
      on:drop|preventDefault|stopPropagation={onFileDropped}
      on:dragenter|preventDefault|stopPropagation={() => isFileDragged = true}
      on:dragover|preventDefault|stopPropagation={() => isFileDragged = true}
      on:dragleave|preventDefault|stopPropagation={() => isFileDragged = false}>

  {#if postId}

    <div class="w-full h-full flex flex-col justify-center items-center">

      <svg xmlns="http://www.w3.org/2000/svg" class="text-green-600" width="72" height="72" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>

      <div class="text-2xl mt-4">Post created!</div>

      <a href="https://testnet.lenster.xyz/posts/{postId}" target="_blank" rel="noreferrer"
         class="mt-4 w-fit py-2.5 px-12 flex justify-center items-center rounded-lg w-auto disabled:bg-neutral-400
          bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white text-center text-lg
          transition ease-in duration-200 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2">
        View Post
      </a>

    </div>

  {:else}

    <div class="container max-w-screen-md mx-auto pt-8">

      <PostTabs {postType} on:typeChange={onPostTypeChange} disabled={isSubmittingPost}/>

      <div class="mt-6 dark:bg-gray-800 shadow-lg rounded-xl p-4 {isSubmittingPost ? 'bg-neutral-300' : 'bg-white'}">

        {#if postType === PublicationMainFocus.TextOnly}

          <div class="flex">

            {#if $profile}
              <img src={$profile.picture.original.url} alt="Profile avatar"
                   class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
            {/if}

            <PlainTextEditor {postType} disabled={isSubmittingPost}/>

          </div>

        {:else if postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video}

          <MediaUploader />

        {:else if postType === PublicationMainFocus.Link}

          <div class="flex">
            {#if $profile}
              <img src={$profile.picture.original.url} alt="Profile avatar"
                   class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
            {/if}

            <div class="flex flex-col grow">

              <PlainTextEditor {postType} disabled={isSubmittingPost}/>

              <div class="p-2">
                <input type="url" id="post-url" placeholder="Url" autocomplete="off"
                       bind:value={shareUrl} disabled={isSubmittingPost}
                       class="appearance-none border border-gray-300 w-full py-3 px-4 text-gray-800 rounded-lg
                   placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-orange-200
                   focus:border-transparent"/>
              </div>

            </div>

          </div>

        {:else if postType === PublicationMainFocus.Article}

          <MarkdownEditor bind:getText={getMarkdown} defaultValue={initialMarkdownText} />

        {/if}

        <div class="flex pt-2 pb-1 {postType === PublicationMainFocus.Article ? 'ml-4' : 'ml-20'}">

          <div class="flex">

            <Select bind:value={followerOnly} items={followerOnlyItems} disabled={isSubmittingPost}
                    clearable={false} searchable={false} listAutoWidth={false} showChevron={false} containerStyles="cursor: pointer;"
                    --item-height="auto" --item-is-active-bg="#DB4700" --item-hover-bg="#FFB38E"
                    class="cursor-pointer hover:bg-gray-50 rounded-xl border-none ring-0 focus:outline-none
                    focus:ring-0 focus:border-none bg-none disabled:bg-transparent">

              <div slot="item" let:item let:index>
                <ModuleChoiceItem {item} />
              </div>

              <div slot="selection" let:selection class="flex cursor-pointer">
                <ModuleSelectionItem {selection} />
              </div>

            </Select>

          </div>

          <div class="flex ml-2">

            <Select items={collectItems} clearable={false} searchable={false} listAutoWidth={false} showChevron={false}
                    bind:value={collectItem} on:change={onCollectModuleChange} disabled={isSubmittingPost}
                    --item-height="auto" --item-is-active-bg="#DB4700" --item-hover-bg="#FFB38E"
                    class="hover:bg-gray-50 rounded-xl border-none ring-0 focus:outline-none focus:ring-0
                    focus:border-none bg-none disabled:bg-transparent">

              <div slot="item" let:item let:index>
                <ModuleChoiceItem item={collectFeeString && index === 1 ? {label: item.label, summary: collectFeeString, icon: 'collect_paid', btn: showCollectFeesDialog} : item} />
              </div>

              <div slot="selection" let:selection let:index class="flex">
                <ModuleSelectionItem selection={collectFeeString && selection.label === collectItems[1].label ? {label: collectFeeString, icon: 'collect_paid'} : selection} />
              </div>

            </Select>

          </div>

        </div>

      </div>

      <dialog id="collectFees" class="rounded-xl shadow-2xl">
        <CollectModuleDialog followerOnly={followerOnly.value} on:moduleUpdated={onFeeCollectModuleUpdated}/>
      </dialog>

      <div class="flex border-b border-neutral-300 py-5 gap-4">

        <Select items={contentWarningItems} clearable={false} searchable={false} listAutoWidth={false} showChevron={true}
                bind:value={postContentWarning}
                --item-height="auto" --item-is-active-bg="#DB4700" --item-hover-bg="#FFB38E" --font-size="0.875rem"
                class="w-fit h-fit hover:bg-gray-50 rounded-xl border-none ring-0 focus:outline-none focus:ring-0 focus:border-none bg-none disabled:bg-transparent" />

        <PostTags bind:getTags disabled={isSubmittingPost}/>

      </div>

      <div class="flex justify-end pb-6">

        <button on:click={onSubmitClick} disabled={shouldDisableSubmitBtn}
                class="mt-4 w-fit py-2.5 px-12 flex justify-center items-center rounded-lg w-auto disabled:bg-neutral-400
          bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white text-center text-lg
          transition ease-in duration-200 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2">

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

  {/if}

</main>

<Toaster />