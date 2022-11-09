<script lang="ts">
    import toast from 'svelte-french-toast';

    import PlainTextEditor from '../components/PlainTextEditor.svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';

    import imageExternal from '../../assets/ic_external.svg';

    import {uploadAndPin, unpin} from "../../lib/ipfs-service";
    import {
        IMAGE_TYPES,
        imageMimeTypesJoined,
        MAX_FILE_SIZE,
        supportedMimeTypesJoined
    } from '../../lib/file-utils.js'
    import {attachment, author, cover, description, gifAttachment, title} from "../../lib/state";

    import * as id3 from "id3js";
    import type {Web3File} from "web3.storage";
    import InlineSVG from "svelte-inline-svg";

    export let disabled: boolean;
    export let isCollectable: boolean;
    export let collectPrice: string;

    const IPFS_GATEWAY = import.meta.env.VITE_INFURA_GATEWAY_URL;

    $: filePath = $attachment?.cid ? `${IPFS_GATEWAY}${$attachment?.cid}` : $gifAttachment ? $gifAttachment.item : null;
    $: fileType = $attachment?.type || $gifAttachment?.type;

    $: coverPath = $cover?.cid ? `${IPFS_GATEWAY}${$cover?.cid}` : $gifAttachment ? $gifAttachment.item : null;
    $: coverType = $cover?.type;

    $: isAttachmentImage = fileType?.startsWith('image/');
    $: isAttachmentAudio = fileType?.startsWith('audio/');
    $: isAttachmentVideo = fileType?.startsWith('video/');

    let fileInput;
    let coverInput;
    let loading = false;
    let coverLoading = false;
    let uploadedPct = 0;
    let useContentAsDescription = true;
    let isFileDragged = false;

    const processId3Tags = async (file: File) => {
        const tags = await id3.fromFile(file);
        if (!tags) return;

        console.log('processId3Tags: got tags from file', tags)
        if (tags.title) {
            title.set(tags.title);
        } else if (file.name) {
            title.set(file.name.replace(/\.[^/.]+$/, ""));
        }

        if (tags.artist) {
            author.set(tags.artist);
        }

        if (tags.images) {
            const imageBuffer = tags.images[0].data;
            const id3Cover = new File([imageBuffer], 'cover.jpeg', {type: tags.images[0].mime});
            await upload(id3Cover, true);
        }
    };

    const upload = async (file: Web3File, isCover: boolean = false) => {
        console.log('uploadFile: ', file.name);
        if (isCover) {
            coverLoading = true;
        } else {
            loading = true;
        }

        try {
            file.cid = await uploadAndPin(file, pct => {
                console.log('Uploading...', pct.toFixed(2))
                uploadedPct = pct;
            });
        } catch (e) {
            console.error(e)

            if (isCover) {
                cover.set(null);
                coverLoading = false;
            } else {
                attachment.set(null);
                loading = false;
            }
            uploadedPct = 0;

            toast.error('Error uploading file');

            return;
        }

        console.log('Uploaded file at', file.cid);

        if (isCover) {
            cover.set(file);
            return;
        }

        attachment.set(file);

        if (file.type.startsWith('audio/')) {
            try {
                await processId3Tags(file);
            } catch (e) {
                console.warn('Error loading audio ID3 tag metadata');
            }
        }
    };

    const onFileSelected = async (e, isCover: boolean = false) => {
        const file = e.target.files[0];
        const maxSize = isCover ? MAX_FILE_SIZE / 10 : MAX_FILE_SIZE;

        if (!file || file.size > maxSize) {
            toast.error(`File too large. Max ${maxSize}MB`);
            return;
        }
        console.log('File selected', file);

        await upload(file, isCover);
    };

    const onDeleteCover = async () => {
        if (!$cover) return;

        if ($cover.cid) {
            try {
                await unpin($cover.cid);
            } catch (e) {
                console.warn('Unable to unpin cid', $cover.cid)
            }
        }

        cover.set(null);
        coverLoading = false;
    };

    const onDeleteAttachment = async () => {
        if ($gifAttachment) {
            gifAttachment.set(null);
            return;
        }

        if (!$attachment) return;

        if ($attachment.cid) {
            try {
                await unpin($attachment.cid);
            } catch (e) {
                console.warn('Unable to unpin cid', $attachment.cid)
            }
        }

        attachment.set(null);
        loading = false;
    }

    const onDeleteMedia = async () => {
        await onDeleteAttachment();
        await onDeleteCover();
        uploadedPct = 0;
    };

    const onCoverFileDropped = async (ev) => {
        const dt = ev.dataTransfer;
        const file: File = dt.files[0];
        console.log('Cover file dropped', file);

        if (!file.type ||
            !IMAGE_TYPES.includes(file.type) ||
            file.size > (MAX_FILE_SIZE / 10)
        ) {
            toast.error('File not supported');
            isFileDragged = false;
            return;
        }

        cover.set(file);
        isFileDragged = false;

        await onDeleteCover();
        await upload(file, true);
    };

    $: {
        const file = $attachment;
        if (file && !file.cid) {
            onDeleteMedia().catch();
            upload(file).catch();
        }
    }
</script>

<div class="min-h-48 w-full flex flex-col justify-center items-center gap-4 pb-2">

  {#if filePath && fileType}

    <PlainTextEditor placeholder="Comment (optional)" rows={3}/>

    <div class="flex w-full justify-center bg-gray-100 dark:bg-gray-700 px-4 pt-6 pb-4 rounded-xl">

      <div class="flex flex-col items-center justify-center {isCollectable ? 'w-5/12' : 'w-full'} ">
        {#if isAttachmentImage}

          {#if loading}
            <LoadingSpinner message="Processing..."/>
          {/if}

          <div class="relative">
            <img src={filePath} alt="Uploaded file" class="max-w-full max-h-96 rounded-xl"
                 on:load={() => loading = false}>

            <div class="absolute flex justify-end items-start top-0 left-0 z-10 w-full h-full group">
              <button class="mt-2 mr-2 hidden group-hover:block" on:click={onDeleteMedia}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
                     class="w-8 h-8 text-white drop-shadow-dark">
                  <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                  <path
                      d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/>
                </svg>
              </button>
            </div>

          </div>

        {:else}

          <div class="flex flex-col items-center">

            <div class="w-full mb-4 rounded-xl {isAttachmentVideo ? 'p-0' : 'p-1'}
                 {isFileDragged ? 'bg-orange-50 dark:bg-gray-800' : 'bg-none'}"
                 on:drop|preventDefault|stopPropagation={onCoverFileDropped}
                 on:dragenter|preventDefault|stopPropagation={() => isFileDragged = true}
                 on:dragover|preventDefault|stopPropagation={() => isFileDragged = true}
                 on:dragleave|preventDefault|stopPropagation={() => isFileDragged = false}>

              {#if coverPath}

                <div class="w-full relative bg-gray-200 rounded-xl {isAttachmentVideo ? 'aspect-video' : ''}">
                  <img src={coverPath} alt="Cover"
                       class="max-w-full max-h-full w-auto h-auto mx-auto rounded-xl
                             {isFileDragged ? 'border border-orange-500' : 'border-none'}"
                       on:load={() => coverLoading = false}>

                  <div class="absolute flex justify-end items-start top-0 left-0 z-10 w-full h-full group">
                    <button class="mt-2 mr-2 hidden group-hover:block" on:click={onDeleteCover}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
                           class="w-8 h-8 text-white drop-shadow-dark">
                        <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                        <path
                            d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/>
                      </svg>
                    </button>
                  </div>

                </div>

              {:else if coverLoading}

                <div class="{isAttachmentVideo ? 'aspect-video' : 'aspect-square'} flex flex-col items-center justify-center">
                  <LoadingSpinner />
                </div>

              {:else}

                <input type="file" class="hidden"
                       accept={imageMimeTypesJoined()}
                       on:change={e => onFileSelected(e, true)}
                       bind:this={coverInput}/>

                <div class="{isAttachmentVideo ? 'aspect-video' : 'aspect-square'} flex flex-col items-center
                            justify-center border border-gray-300 dark:border-gray-500 text-gray-300 dark:text-gray-300
                            rounded-xl cursor-pointer hover:bg-orange-50"
                     on:click={()=>{coverInput.click();}} disabled={coverLoading}>

                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 text-gray-400"
                       stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M20.4 14.5L16 10 4 20"/>
                  </svg>

                  <span class="pt-3 text-base">Add a cover image</span>

                </div>

              {/if}

            </div>

            {#if isAttachmentAudio}
              <audio src={filePath} type={fileType} class="border border-gray-300 rounded-full"
                     on:load={() => loading = false}
                     preload="metadata" controls controlslist="nodownload"></audio>
            {:else if isAttachmentVideo}
              <!-- svelte-ignore a11y-media-has-caption -->
              <video src={filePath} type={fileType} class="rounded-xl"
                     on:load={() => loading = false}
                     preload="metadata" controls controlslist="nodownload"></video>
            {/if}
          </div>

        {/if}


        {#if $attachment?.cid}
          <div class="w-full text-xs text-gray-400 pt-4 px-1 flex gap-6 truncate justify-center">

            <div class="flex truncate">

              <span class="font-semibold">IPFS:</span>

              <div class="flex truncate pl-1">
                <a href={filePath} class="max-w-[10rem] hover:text-gray-600 grow truncate flex" target="_blank"
                   rel="noreferrer">
                  <div class="truncate">{$attachment?.cid}</div>
                  <InlineSVG src={imageExternal} class="w-3 h-3 flex-shrink-0 inline mt-[0.1rem]"/>
                </a>
              </div>

            </div>

            <button class="text-red-700 dark:text-white opacity-60 hover:opacity-100"
                    on:click={onDeleteMedia}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>

          </div>
        {/if}
      </div>

      {#if isCollectable}

        <div class="flex flex-col grow gap-3 pl-6">

          {#if collectPrice}

            <div class="flex flex-col">
              <div class="text-2xl font-semibold dark:text-gray-100">
                {collectPrice}
              </div>

              <div class="text-sm text-gray-400">
                PRICE
              </div>
            </div>

          {/if}

          <input type="text" placeholder="Title"
                 class="w-full rounded-lg border-gray-200 text-lg placeholder-gray-400 focus:outline-none focus:ring-2
                 focus:ring-orange-200 focus:border-transparent mt-2 disabled:opacity-40
                 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100"
                 bind:value={$title} disabled={disabled}>

          {#if isAttachmentAudio}
            <input type="text" placeholder="Author"
                   class="w-full rounded-lg border-gray-200 text-lg placeholder-gray-400 focus:outline-none focus:ring-2
                   focus:ring-orange-200 focus:border-transparent mt-2 disabled:opacity-40
                   dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100"
                   bind:value={$author} disabled={disabled}>
          {/if}

          <textarea placeholder="Description (optional)" rows={useContentAsDescription ? '3' : '5'}
                    class="mt-1 rounded-lg border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2
                    focus:ring-orange-200 focus:border-transparent disabled:opacity-40 resize-none
                    dark:bg-gray-600 dark:border-gray-600 dark:text-gray-100"
                    bind:value={$description} disabled={disabled || useContentAsDescription}></textarea>

          <div class="flex items-center px-3">
            <input id="desc-toggle" name="desc-toggle" type="checkbox"
                   class="w-4 h-4 text-orange-600 dark:text-orange-500 border-gray-200 rounded focus:ring-orange-500"
                   bind:checked={useContentAsDescription} disabled={disabled}>
            <label for="desc-toggle" class="block ml-2 text-sm text-gray-600 dark:text-gray-300"> Use comment as description </label>
          </div>

          <div class="text-xs text-gray-400 px-3">
            Title{isAttachmentAudio ? ', artist, ' : ' '}and description are used on NFT marketplaces but
            may not be shown on all Lens apps.
          </div>

        </div>

      {/if}

    </div>

  {:else if loading && uploadedPct === 0}

    <div class="py-4">
      <LoadingSpinner/>
    </div>

  {:else if uploadedPct > 0 && uploadedPct < 100}

    <div class="flex flex-col gap-2 justify-center items-center">

      <div class="w-72 p-4 m-auto">

        <div class="w-full h-4 bg-gray-400 rounded-full mt-3">
          <div class="h-full text-center text-xs text-white bg-green-500 rounded-full"
               style="width: {uploadedPct}%">
          </div>
        </div>

      </div>

      <div>Uploading...</div>

    </div>

  {:else}

    <div class="h-48 flex justify-center items-center">

      <div class="text-lg pt-4 dark:text-gray-100">
        Drag and drop media or

        <input type="file" class="hidden"
               accept={supportedMimeTypesJoined()}
               on:change={(e)=>onFileSelected(e)}
               bind:this={fileInput}/>

        <button class="text-base font-semibold text-orange-700 border border-gray-300 rounded-full px-4 py-2 ml-2
                       hover:bg-orange-600 hover:text-white hover:border-transparent dark:text-orange-100 dark:border-gray-600"
                on:click={()=>{fileInput.click();}}>
          Choose a file
        </button>
      </div>

    </div>

  {/if}

</div>