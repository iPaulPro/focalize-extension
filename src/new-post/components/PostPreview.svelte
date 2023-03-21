<script lang="ts">
    import showdown from "showdown";
    import InlineSVG from "svelte-inline-svg";
    import {DateTime} from "luxon";

    import ImageAvatar from '../../assets/ic_avatar.svg';
    import {ipfsUrlToGatewayUrl} from "../../lib/ipfs-service.js";
    import {getNodeForPublicationMainFocus, getNodeUrlForPublication} from "../../lib/utils";
    import {PublicationState} from "../../lib/store/state-store.js";
    import LoadingSpinner from "./LoadingSpinner.svelte";

    import type {PublicationMetadataV2Input} from "../../graph/lens-service";
    import type {User} from "../../lib/user";

    export let currentUser: User;
    export let publicationState: PublicationState;
    export let postMetaData: PublicationMetadataV2Input;
    export let postId: string;

    const fromMarkdown = new showdown.Converter({
        simpleLineBreaks: true,
        simplifiedAutoLink: true,
    });

    let avatarError;
    let now = DateTime.now();
    let imageLoading = true;

    $: contentHtml = postMetaData?.content ? fromMarkdown.makeHtml(postMetaData?.content) : '';
    $: cover = postMetaData?.media?.[0]?.cover ?? postMetaData?.image;
    $: artist = postMetaData?.attributes?.find(attr => attr.traitType === 'author')?.value ?? currentUser?.handle ?? 'unknown';

    const onViewPostClick = async () => {
        if (!postMetaData || !postId) return;
        const url = await getNodeUrlForPublication(postMetaData.mainContentFocus, postId)
        chrome.notifications.clear(url);
        window.open(url, '_blank');
        window.close();
    };

    const getNodeName = async () => {
        const node = await getNodeForPublicationMainFocus(postMetaData?.mainContentFocus);
        return node.name;
    };
</script>

{#if currentUser}

  <div class="w-full min-h-screen">

    <div class="container h-full max-w-screen-md mx-auto pt-2">

      <div class="flex justify-between items-center">
        <div class="text-2xl font-semibold p-4">
          {#if postId}
            Post published!
          {:else}
            Post preview
          {/if}
        </div>

        <div>
          {#if postId}
            <button type="button" on:click={onViewPostClick}
                    class="mr-4 py-1.5 px-6 flex justify-center items-center rounded-lg
                    bg-orange-600 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700
                    disabled:bg-neutral-400 dark:disabled:bg-gray-600
                    focus:ring-orange-400 focus:ring-offset-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                    text-white text-center text-sm dark:disabled:text-gray-400 font-medium
                    transition ease-in duration-200 shadow-md">
              View on {#await getNodeName() then name} {name} {/await}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="inline w-4 ml-1.5"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <g fill="none" fill-rule="evenodd">
                  <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5M15 3h6v6M10 14L20.2 3.8"/>
                </g>
              </svg>
            </button>
          {:else}

            <div class="flex text-xs pr-4 gap-2 items-center opacity-60">
              {#if publicationState === PublicationState.SUCCESS}
                Transaction success! Waiting for indexer...
              {:else if publicationState === PublicationState.PENDING}
                Indexing...
              {:else}
                Transaction submitted...
              {/if}

              <LoadingSpinner size="w-5 h-5"/>
            </div>

          {/if}
        </div>
      </div>

      <div
          class="min-h-[12rem] mx-2 rounded-xl p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex">

        <div class="w-12 h-12 mx-3 mt-3 shrink-0">

          {#if avatarError || !currentUser.avatarUrl}
            <InlineSVG src={ImageAvatar}
                       class="w-full rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300"/>
          {:else if currentUser}
            <img src={currentUser.avatarUrl} alt="Profile avatar"
                 class="w-full aspect-square object-contain rounded-full border-2 border-transparent"
                 on:error={() => {avatarError = true}}>
          {/if}

        </div>

        <div class="flex flex-col w-full pr-2 pl-1.5 pt-3 shrink">

          {#if currentUser.name}
            <div class="text-base font-medium">
              {currentUser.name}
            </div>
          {/if}
          <div class="text-orange-700 dark:text-orange-300 font-medium">
            &#64;{currentUser.handle}
          </div>

          {#if postMetaData.content}
            <div class="prose dark:prose-invert pt-4 pb-2 pr-4">
              {@html contentHtml}
            </div>
          {/if}

          {#if postMetaData.media?.length > 0}
            {@const media = postMetaData.media[0]}

            {#if media.item && media.type?.startsWith('image')}

              <div class="w-full lg:w-4/5 max-h-96 pt-4 pb-2">
                {#if imageLoading}
                  <div class="h-full aspect-square flex justify-center items-center bg-gray-300 dark:bg-gray-700
                       border-gray-300 dark:border-gray-600 rounded-lg">
                    <LoadingSpinner/>
                  </div>
                {/if}
                <a href={ipfsUrlToGatewayUrl(media.item)} target="_blank" rel="noreferrer">
                  <img src={ipfsUrlToGatewayUrl(media.item)} alt={media.altTag ?? 'Image attachment'}
                       on:load={() => imageLoading = false}
                       class="max-h-full rounded-lg">
                </a>
              </div>

            {:else if media.type?.startsWith('video')}

              <video src={ipfsUrlToGatewayUrl(media.item)} type={media.type} poster={ipfsUrlToGatewayUrl(media.cover)}
                     class="w-full lg:w-2/3 aspect-video rounded-lg bg-black mt-4 mb-2" crossorigin
                     preload="metadata" controls controlslist="nodownload"></video>

            {:else if media.type?.startsWith('audio')}

              <div class="w-full flex mt-4 mb-2 bg-gray-100 dark:bg-gray-700 rounded-xl">

                <div class="w-full flex items-center">
                  {#if cover}
                    <img src={ipfsUrlToGatewayUrl(cover)} alt={media.altTag}
                         class="object-cover h-36 w-36 rounded-l-xl">
                  {/if}

                  <div class="w-full flex flex-col w-full truncate">
                    <div class="px-6 pt-4 text-xl font-semibold truncate">
                      {postMetaData.name}
                    </div>

                    <div class="px-6 text-base opacity-80 truncate">
                      {artist}
                    </div>

                    <audio src={ipfsUrlToGatewayUrl(media.item)} type={media.type} crossorigin
                           class="w-full px-1" preload="metadata" controls controlslist="nodownload"></audio>
                  </div>
                </div>

              </div>

            {/if}

          {/if}

          <div class="text-sm opacity-60 font-medium py-2">
            {now.toLocaleString(DateTime.TIME_SIMPLE)} · {now.toLocaleString(DateTime.DATE_MED)} · Posted via Focalize
          </div>

        </div>

      </div>

    </div>

  </div>

{/if}

<style global>
  audio::-webkit-media-controls-panel, audio::-webkit-media-controls-enclosure {
    background-color: transparent;
  }

  .dark audio::-webkit-media-controls-time-remaining-display,
  .dark audio::-webkit-media-controls-current-time-display {
    color: white;
    text-shadow: none;
  }

  .dark audio::-webkit-media-controls-timeline {
    border-color: white;
  }

  .dark audio::-webkit-media-controls-volume-slider {
    border-color: white;
  }

  .prose a {
    color: #DB4700;
    text-decoration: none;
  }

  .prose a:hover {
    color: #A33500;
    text-decoration: underline;
  }
</style>