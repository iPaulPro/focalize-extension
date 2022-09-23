<script lang="ts">
    import {decodeJwt} from 'jose'

    import {submitPost} from '../lib/lens-post.js'
    import {getDefaultProfile, refreshAccessToken} from "../lib/lens-auth";

    import Editor from './Editor.svelte';
    import PostTags from './PostTags.svelte';
    import {onMount} from "svelte";
    import {PublicationContentWarning, PublicationMainFocus} from "../graph/lens-service";
    import type {Profile} from "../graph/lens-service";

    /**
     * Bound to the plain text editor
     */
    let plainText: string;

    /**
     * Bound to the link text editor
     */
    let linkText: string;

    /**
     * Bound to the rich text editor
     */
    let getMarkdown: () => string;

    /**
     * Bound to the tag component
     */
    let getTags: () => string[];

    /**
     * Editor prop
     */
    let defaultValue: string;

    let postType: PublicationMainFocus;

    let postContentWarning: PublicationContentWarning;

    let profile: Profile;

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
        linkText = '';

        if (urlParams.has('title')) {
            const title = urlParams.get('title');
            linkText += `${title}\n\n`;
            markdown += `**${title}**\n`;
        }

        if (urlParams.has('desc')) {
            const desc = urlParams.get('desc').replaceAll('\n', '\n> ');
            linkText += `${desc}\n\n`;
            markdown += `> ${desc}\n\n`;
        }

        if (urlParams.has('url')) {
            const url = urlParams.get('url');
            linkText += `${url}`;
            markdown += `<${url}>`;
        }

        if (urlParams.has('text')) {
            plainText = urlParams.get('text');
        }

        defaultValue = markdown
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

    const onSubmitClick = async () => {
        let content: string;

        switch (postType) {
            case PublicationMainFocus.Article:
                content = getMarkdown();
                break;
            case PublicationMainFocus.Link:
                content = linkText;
                break
            default:
                content = plainText;
        }

        const tags = getTags();
        const publicationId = await submitPost(profile, content, postType, tags, postContentWarning);
        console.log(`onSubmitClick: publication id ${profile.id} - ${publicationId}`);
    }

    onMount(async () => {
        profile = await getDefaultProfile();
    })
</script>

<main class="w-full h-full">

  <div class="container max-w-screen-md mx-auto">

    <div class="flex mt-12">

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
          <a on:click={() => postType = PublicationMainFocus.TextOnly} class="{postType === PublicationMainFocus.TextOnly ? 'active' : ''}
          tab rounded-l-xl inline-block p-3 w-full cursor-pointer" aria-current="page">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
              <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
            </svg>
            Post
          </a>
        </li>
        <li class="w-full">
          <a on:click={() => postType = PublicationMainFocus.Image} class="{postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video ? 'active' : ''}
          tab inline-block p-3 w-full cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M20.4 14.5L16 10 4 20"/>
            </svg>
            Images & Video
          </a>
        </li>
        <li class="w-full">
          <a on:click={() => postType = PublicationMainFocus.Link} class="{postType === PublicationMainFocus.Link ? 'active' : ''}
          tab inline-block p-3 w-full cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            Link
          </a>
        </li>
        <li class="w-full">
          <a on:click={() => postType = PublicationMainFocus.Article} class="{postType === PublicationMainFocus.Article ? 'active' : ''}
          tab rounded-r-xl inline-block p-3 w-full cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto pb-1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
            </svg>
            Article
          </a>
        </li>
      </ul>

    </div>

    {#if postType === PublicationMainFocus.TextOnly}

      <div class="flex mt-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4">
        {#if profile}
          <img src={profile.picture.original.url} alt="Profile image" class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
        {/if}
        <textarea class="w-full text-xl my-3 mr-3 border-none focus:ring-0" rows="6" bind:value={plainText} placeholder="What's happening?"></textarea>
      </div>

    {:else if postType === PublicationMainFocus.Image || postType === PublicationMainFocus.Video}

    {:else if postType === PublicationMainFocus.Link}

      <div class="mt-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4">
        <textarea class="w-full text-lg border-none focus:ring-0" rows="6" bind:value={linkText}></textarea>
      </div>

    {:else if postType === PublicationMainFocus.Article}

      <div class="mt-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4">
        <Editor bind:getMarkdown {defaultValue} isRichText={true} />
      </div>

    {/if}

    <div class="flex border-b border-neutral-300 items-center overflow-x-auto py-1">

      <select bind:value={postContentWarning}
          class="h-fit bg-white hover:bg-gray-50 rounded-xl shadow-sm pl-3 pr-10 py-3 text-left cursor-pointer
          border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" name="warning">
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

      <PostTags bind:getTags />

    </div>

    <div class="flex justify-end">

      <button on:click={onSubmitClick}
          class="mt-4 w-fit py-2.5 px-12 flex justify-center items-center rounded-lg w-auto
          bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 focus:ring-offset-orange-200 text-white text-center text-lg
          transition ease-in duration-200 font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2">
        Post
      </button>

    </div>

  </div><!-- container -->

</main>

<style>

</style>