<script lang="ts">
    import {decodeJwt} from 'jose'

    import {REVERT_COLLECT_MODULE, submitPost} from '../lib/lens-post.js'
    import {getDefaultProfile, refreshAccessToken} from "../lib/lens-auth";
    import {
        CollectModules,
        PublicationContentWarning,
        PublicationMainFocus
    } from "../graph/lens-service";

    import MarkdownEditor from './components/MarkdownEditor.svelte';
    import PlainTextEditor from './components/PlainTextEditor.svelte'
    import PostTags from './components/PostTags.svelte';
    import PostTabs from './components/PostTabs.svelte'

    import {onMount} from "svelte";

    import type {CollectModule, CollectModuleParams, Profile} from "../graph/lens-service";
    import CollectModuleDialog from './components/FeeCollectModuleDialog.svelte'

    /**
     * Bound to the rich text editor
     */
    let getMarkdown: () => string;

    /**
     * Bound to the tag component
     */
    let getTags: () => string[];

    /**
     * Bound to the plain text editor
     */
    let getText: () => string[];

    let initialMarkdownText: string;

    let initialPlainText: string;

    let initialLinkText: string;

    let postType: PublicationMainFocus;

    let postContentWarning: PublicationContentWarning;

    let shareUrl: string;

    let followerOnly: boolean;

    let collectModule: CollectModules;
    let feeCollectModule: CollectModule;

    let profile: Profile;

    let postId: string;
    let isSubmittingPost = false;

    const parseSearchParams = () => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        let type: PublicationMainFocus = PublicationMainFocus.TextOnly;
        if (urlParams.has('type')) {
            switch (urlParams.get('type')) {
                case 'text':
                    type = PublicationMainFocus.TextOnly;
                    break;
                case 'image':
                    type = PublicationMainFocus.Image;
                    break;
                case 'video':
                    type = PublicationMainFocus.Video;
                    break;
                case 'link':
                    type = PublicationMainFocus.Link;
                    break;
                case 'article':
                    type = PublicationMainFocus.Article;
                    break;
            }
        }
        postType = type;

        let markdown = '', linkText = '', plainText = '';

        if (urlParams.has('title')) {
            const title = urlParams.get('title');
            linkText += `"${title}"`;
            markdown += `**${title}**`;
        }

        if (urlParams.has('desc')) {
            const desc = urlParams.get('desc').replaceAll('\n', '\n> ');
            linkText += `\n\n"${desc}"`;
            markdown += `\n\n> ${desc}`;
        }

        if (urlParams.has('url')) {
            const url = urlParams.get('url');
            shareUrl = url;
            markdown += `\n\n<${url}>`;
        }

        if (urlParams.has('text')) {
            plainText = urlParams.get('text');
        }

        initialMarkdownText = markdown;
        initialLinkText = linkText;
        initialPlainText = plainText;
    };

    const onPostTypeChange = (e) => {
        postType = e.detail;
    }

    const onCollectModuleChange = (e) => {
        if (e.target.value === CollectModules.FeeCollectModule) {
            const dialog: HTMLDialogElement = document.getElementById('collectFees');
            dialog.showModal();
        }
    }

    const onFeeCollectModuleUpdated = (e) => {
        feeCollectModule = e.detail;

        const dialog: HTMLDialogElement = document.getElementById('collectFees');
        if (dialog) {
            dialog.close();
        }
    }

    parseSearchParams();

    onMount(async () => {
        chrome.storage.local.get(['accessToken', 'refreshToken'], async result => {
            console.log('Got saved tokens', result);
            const accessToken = decodeJwt(result.accessToken);
            const accessTokenExpiration = accessToken.exp * 1000; // convert to ms

            const now = Date.now();
            if (accessTokenExpiration < now) {
                console.log('Access token is expired.');
                const refreshToken = decodeJwt(result.refreshToken);
                const refreshTokenExpiration = refreshToken.exp * 1000; // convert to ms

                if (refreshTokenExpiration > now) {
                    await refreshAccessToken(result.refreshToken);
                } else {
                    console.log('Refresh token is expired')
                }
            }
        });
    });

    const getContent = (): string => {
        let content: string;

        // TODO validation

        switch (postType) {
            case PublicationMainFocus.Article:
                content = getMarkdown();
                break;
            case PublicationMainFocus.Link:
                content = getText() + '\n\n' + shareUrl;
                break
            default:
                content = getText();
                break;
        }

        return content;
    }

    const onSubmitClick = async () => {
        isSubmittingPost = true;

        let collect: CollectModuleParams;
        switch (collectModule) {
            case CollectModules.FreeCollectModule:
                collect = {freeCollectModule: {followerOnly}};
                break;
            case CollectModules.RevertCollectModule:
                collect = REVERT_COLLECT_MODULE;
                break;
            case CollectModules.FeeCollectModule:
                collect = feeCollectModule;
                break;
        }

        try {
            const publicationId = await submitPost(
                profile,
                getContent(),
                postType,
                getTags(),
                postContentWarning,
                followerOnly,
                collect
            );
            console.log(`onSubmitClick: publication id ${profile.id} - ${publicationId}`);

            postId = `${profile.id}-${publicationId}`

        } catch (e) {
            // TODO handle post submit error
            console.error(e);
        } finally {
            isSubmittingPost = false;
        }
    }

    const viewPost = () => {
        // TODO
    }

    onMount(async () => {
        profile = await getDefaultProfile();
    })
</script>

<main class="w-full h-full">

  {#if postId}

    <div class="w-full h-full flex flex-col justify-center items-center">

      <svg xmlns="http://www.w3.org/2000/svg" class="text-green-600" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>

      <div class="text-2xl mt-4">Post created!</div>

      <a href="https://testnet.lenster.xyz/posts/{postId}" target="_blank"
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

            {#if profile}
              <img src={profile.picture.original.url} alt="Profile avatar"
                   class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
            {/if}

            <PlainTextEditor initialText={initialPlainText} {postType} bind:getText disabled={isSubmittingPost}/>

          </div>

        {:else if postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video}

          <div class="h-48 w-full flex flex-col justify-center items-center gap-4 py-12">

            <div class="text-lg">
              Drag and drop images or <button class="font-semibold text-orange">Upload</button>
            </div>

            <div class="text-lg">
              or
            </div>

            <div class="w-full flex justify-center">
              <input type="url" class="w-2/3 rounded-lg border-gray-500" placeholder="Enter an ipfs:// url">
            </div>

          </div>

        {:else if postType === PublicationMainFocus.Link}

          <div class="flex">
            {#if profile}
              <img src={profile.picture.original.url} alt="Profile avatar"
                   class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
            {/if}

            <div class="flex flex-col grow">

              <PlainTextEditor initialText={initialLinkText} {postType} bind:getText disabled={isSubmittingPost}/>

              <div class="p-2">
                <input type="url" id="post-url" placeholder="Url" bind:value={shareUrl} disabled={isSubmittingPost}
                       class="appearance-none border border-gray-300 w-full py-3 px-4 text-gray-800 rounded-lg
                   placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-orange-600
                   focus:border-transparent"/>
              </div>

            </div>

          </div>

        {:else if postType === PublicationMainFocus.Article}

          <MarkdownEditor bind:getMarkdown defaultValue={initialMarkdownText} isRichText={true}/>

        {/if}

        <div class="flex pt-3 pb-1 {postType === PublicationMainFocus.Article ? 'ml-4' : 'ml-24'}">

          <div class="flex">

            <div class="mt-2">
              {#if followerOnly}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-orange-700"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <polyline points="17 11 19 13 23 9"></polyline>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-orange-700"
                     fill="currentColor">
                  <path
                      d="M12 22.2q-2.1 0-3.962-.8-1.863-.8-3.25-2.175Q3.4 17.85 2.6 15.988 1.8 14.125 1.8 12t.8-3.988q.8-1.862 2.188-3.237Q6.175 3.4 8.038 2.6 9.9 1.8 12 1.8q2.125 0 3.988.8 1.862.8 3.237 2.175Q20.6 6.15 21.4 8.012q.8 1.863.8 3.988t-.8 3.988q-.8 1.862-2.175 3.237Q17.85 20.6 15.988 21.4q-1.863.8-3.988.8Zm-1-2.325v-1.95q-.8 0-1.387-.575-.588-.575-.588-1.4v-.975L4.275 10.2q-.075.45-.137.9-.063.45-.063.9 0 3 1.975 5.25T11 19.875Zm6.85-2.525q.5-.55.888-1.175.387-.625.65-1.313.262-.687.4-1.412.137-.725.137-1.45 0-2.425-1.338-4.438-1.337-2.012-3.612-2.887v.375q0 .825-.587 1.4-.588.575-1.388.575h-2v2q0 .4-.287.687-.288.288-.688.288h-2v2h5.95q.425 0 .713.287.287.288.287.688v2.975h1q.65 0 1.163.387.512.388.712 1.013Z"/>
                </svg>
              {/if}
            </div>

            <select bind:value={followerOnly} name="followerOnly" disabled={isSubmittingPost}
                    class="h-fit hover:bg-gray-50 rounded-xl px-2 text-left text-orange-700 hover:text-orange-900 font-semibold
                cursor-pointer border-none ring-0 focus:outline-none focus:ring-0 focus:border-none sm:text-sm bg-none
                disabled:bg-transparent">
              <option value={false}>
                {#if collectModule === CollectModules.RevertCollectModule}
                  Everyone can reply and repost
                {:else}
                  Everyone can reply, repost, & collect
                {/if}
              </option>
              <option value={true}>
                {#if collectModule === CollectModules.RevertCollectModule}
                  Only followers can reply, repost
                {:else}
                  Only followers can reply, repost, & collect
                {/if}
              </option>
            </select>

          </div>

          <div class="flex ml-2">

            <div class="mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 text-orange-700"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 1 1-8 0"/>
              </svg>
            </div>

            <select bind:value={collectModule} name="followerOnly" disabled={isSubmittingPost}
                    on:change={onCollectModuleChange}
                    class="h-fit hover:bg-gray-50 rounded-xl px-2 text-left text-orange-700 hover:text-orange-900 font-semibold
                cursor-pointer border-none ring-0 focus:outline-none focus:ring-0 focus:border-none sm:text-sm bg-none
                disabled:bg-transparent">
              <option value={CollectModules.FreeCollectModule}>
                Mint as a free NFT
              </option>
              <option value={CollectModules.FeeCollectModule}>
                Sell as an NFT
              </option>
              <option value={CollectModules.RevertCollectModule}>
                Do not create an NFT
              </option>
            </select>

          </div>

        </div>

      </div>

      <dialog id="collectFees" class="rounded-xl shadow-2xl">
        <CollectModuleDialog {followerOnly} on:moduleUpdated={onFeeCollectModuleUpdated} />
      </dialog>

      <div class="flex border-b border-neutral-300 items-center overflow-x-auto py-1">

        <select bind:value={postContentWarning} disabled={isSubmittingPost}
                class="h-fit bg-white hover:bg-gray-50 rounded-xl shadow-sm pl-3 pr-10 py-3 text-left cursor-pointer
          border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                name="warning">
          <option value="">
            No Content Warning
          </option>
          <option value={PublicationContentWarning.Nsfw}>
            NSFW
          </option>
          <option value={PublicationContentWarning.Spoiler}>
            Spoiler
          </option>
          <option value={PublicationContentWarning.Sensitive}>
            Sensitive
          </option>
        </select>

        <PostTags bind:getTags disabled={isSubmittingPost}/>

      </div>

      <div class="flex justify-end pb-6">

        <button on:click={onSubmitClick} disabled={isSubmittingPost}
                class="mt-4 w-fit py-2.5 px-12 flex justify-center items-center rounded-lg w-auto disabled:bg-neutral-400
          bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white text-center text-lg
          transition ease-in duration-200 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2">

          {#if isSubmittingPost}
            <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101" fill="none"
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

<style>

</style>