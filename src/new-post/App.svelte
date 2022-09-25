<script lang="ts">
    import {decodeJwt} from 'jose'

    import {submitPost} from '../lib/lens-post.js'
    import {getDefaultProfile, refreshAccessToken} from "../lib/lens-auth";
    import {PublicationContentWarning, PublicationMainFocus} from "../graph/lens-service";

    import MarkdownEditor from './components/MarkdownEditor.svelte';
    import PlainTextEditor from './components/PlainTextEditor.svelte'
    import PostTags from './components/PostTags.svelte';

    import {onMount} from "svelte";

    import type {Profile} from "../graph/lens-service";


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

    let followerOnlyReference: boolean;

    let profile: Profile;

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

        let markdown = '';

        if (urlParams.has('title')) {
            const title = urlParams.get('title');
            initialLinkText += `"${title}"\n\n`;
            markdown += `**${title}**\n`;
        }

        if (urlParams.has('desc')) {
            const desc = urlParams.get('desc').replaceAll('\n', '\n> ');
            initialLinkText += `"${desc}"`;
            markdown += `> ${desc}\n\n`;
        }

        if (urlParams.has('url')) {
            const url = urlParams.get('url');
            shareUrl = url;
            markdown += `<${url}>`;
        }

        if (urlParams.has('text')) {
            initialPlainText = urlParams.get('text');
        }

        initialMarkdownText = markdown
    };

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
        try {
            const publicationId = await submitPost(
                profile,
                getContent(),
                postType,
                getTags(),
                postContentWarning,
                followerOnlyReference
            );
            console.log(`onSubmitClick: publication id ${profile.id} - ${publicationId}`);
        } catch (e) {
            // TODO
            console.error(e);
        } finally {
            isSubmittingPost = false;
        }
    }

    onMount(async () => {
        profile = await getDefaultProfile();
    })
</script>

<main class="w-full h-full">

  <div class="container max-w-screen-md mx-auto pt-8">

    <div id="post-tabs" class="flex">

      <div class="sm:hidden">
        <label for="tabs" class="sr-only">Select your country</label>
        <select id="tabs" class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500
         focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
         dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
          <option>Post</option>
          <option>Images & Video</option>
          <option>Link</option>
          <option>Article</option>
        </select>
      </div>

      <ul class="hidden w-full text-sm font-medium text-center text-gray-500 rounded-lg divide-x divide-gray-200 shadow
      sm:flex dark:divide-gray-700 dark:text-gray-400">
        <li class="w-full">
          <button on:click={() => postType = PublicationMainFocus.TextOnly} disabled={isSubmittingPost}
             class="{postType === PublicationMainFocus.TextOnly ? 'active' : ''}
          tab rounded-l-xl inline-block p-3 w-full cursor-pointer" aria-current="page">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
              <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
            </svg>
            Post
          </button>
        </li>
        <li class="w-full">
          <button on:click={() => postType = PublicationMainFocus.Image} disabled={isSubmittingPost}
             class="{postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video ? 'active' : ''}
          tab inline-block p-3 w-full cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M20.4 14.5L16 10 4 20"/>
            </svg>
            Images & Video
          </button>
        </li>
        <li class="w-full">
          <button on:click={() => postType = PublicationMainFocus.Link} disabled={isSubmittingPost}
             class="{postType === PublicationMainFocus.Link ? 'active' : ''}
          tab inline-block p-3 w-full cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            Link
          </button>
        </li>
        <li class="w-full">
          <button on:click={() => postType = PublicationMainFocus.Article} disabled={isSubmittingPost}
             class="{postType === PublicationMainFocus.Article ? 'active' : ''}
          tab rounded-r-xl inline-block p-3 w-full cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
            </svg>
            Article
          </button>
        </li>
      </ul>

    </div>

    <div class="mt-6 dark:bg-gray-800 shadow-lg rounded-xl p-4 {isSubmittingPost ? 'bg-neutral-300' : 'bg-white'}">

      {#if postType === PublicationMainFocus.TextOnly}

        <div class="flex">

          {#if profile}
            <img src={profile.picture.original.url} alt="Profile image"
                 class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
          {/if}

          <PlainTextEditor initialText={initialPlainText} {postType} bind:getText disabled={isSubmittingPost} />

        </div>

      {:else if postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video}

      {:else if postType === PublicationMainFocus.Link}

        <div class="flex">
          {#if profile}
            <img src={profile.picture.original.url} alt="Profile image"
                 class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
          {/if}

          <div class="flex flex-col grow">

            <PlainTextEditor initialText={initialLinkText} {postType} bind:getText disabled={isSubmittingPost} />

            <div class="p-2">
              <input type="url" id="post-url" placeholder="Url" bind:value={shareUrl} disabled={isSubmittingPost}
                     class="appearance-none border border-gray-300 w-full py-3 px-4 text-gray-800 rounded-lg
                   placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-orange-600
                   focus:border-transparent"/>
            </div>
          </div>
        </div>

      {:else if postType === PublicationMainFocus.Article}

        <MarkdownEditor bind:getMarkdown {initialMarkdownText} isRichText={true} />

      {/if}

      <div class="flex pt-3 pb-1 {postType === PublicationMainFocus.Article ? 'ml-4' : 'ml-24'}">

        <div class="mt-2">
          {#if followerOnlyReference}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-700">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-orange-700"
                 fill="currentColor">
              <path d="M12 22.2q-2.1 0-3.962-.8-1.863-.8-3.25-2.175Q3.4 17.85 2.6 15.988 1.8 14.125 1.8 12t.8-3.988q.8-1.862 2.188-3.237Q6.175 3.4 8.038 2.6 9.9 1.8 12 1.8q2.125 0 3.988.8 1.862.8 3.237 2.175Q20.6 6.15 21.4 8.012q.8 1.863.8 3.988t-.8 3.988q-.8 1.862-2.175 3.237Q17.85 20.6 15.988 21.4q-1.863.8-3.988.8Zm-1-2.325v-1.95q-.8 0-1.387-.575-.588-.575-.588-1.4v-.975L4.275 10.2q-.075.45-.137.9-.063.45-.063.9 0 3 1.975 5.25T11 19.875Zm6.85-2.525q.5-.55.888-1.175.387-.625.65-1.313.262-.687.4-1.412.137-.725.137-1.45 0-2.425-1.338-4.438-1.337-2.012-3.612-2.887v.375q0 .825-.587 1.4-.588.575-1.388.575h-2v2q0 .4-.287.687-.288.288-.688.288h-2v2h5.95q.425 0 .713.287.287.288.287.688v2.975h1q.65 0 1.163.387.512.388.712 1.013Z"/>
            </svg>
          {/if}
        </div>

        <select bind:value={followerOnlyReference} name="followerOnly"  disabled={isSubmittingPost}
                class="h-fit hover:bg-gray-50 rounded-xl px-2 text-left text-orange-700 hover:text-orange-900 font-semibold
                cursor-pointer border-none ring-0 focus:outline-none focus:ring-0 focus:border-none sm:text-sm bg-none
                disabled:bg-transparent">
          <option value={false}>
            Everyone can reply or repost
          </option>
          <option value={true}>
            Only followers can reply or repost
          </option>
        </select>
      </div>

    </div>

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

      <PostTags bind:getTags disabled={isSubmittingPost} />

    </div>

    <div class="flex justify-end pb-6">

      <button on:click={onSubmitClick} disabled={isSubmittingPost}
              class="mt-4 w-fit py-2.5 px-12 flex justify-center items-center rounded-lg w-auto disabled:bg-neutral-400
          bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white text-center text-lg
          transition ease-in duration-200 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2">

        {#if isSubmittingPost}
          <svg aria-hidden="true" class="inline mr-3 w-4 h-4 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
          </svg>
          Creating post...
        {:else}
          Post
        {/if}
      </button>

    </div>

  </div><!-- container -->

</main>

<style>

</style>