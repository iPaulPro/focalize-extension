<script lang="ts">
    //@ts-ignore
    import InlineSVG from 'svelte-inline-svg';
    import toast from 'svelte-french-toast';

    import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';
    import imageExternal from '../../assets/ic_external.svg';

    import { getCidFromIpfsUrl, unpin, uploadAndPin, type Web3File } from '../../lib/ipfs-service';
    import { IMAGE_TYPES, imageMimeTypesJoined, isThreeDFile, MAX_FILE_SIZE } from '../../lib/utils/file-utils';
    import {
        album,
        audio,
        author, collectSettings,
        cover, date,
        description,
        file,
        image,
        threeDAsset,
        title,
        video,
    } from '../../lib/stores/state-store';

    import * as id3 from 'id3js';
    import { INFURA_GATEWAY_URL } from '../../config';
    import type { ID3Tag, ID3TagV2 } from 'id3js/lib/id3Tag';
    import { type AnyMedia, MediaAudioKind, type ThreeDAsset, ThreeDFormat, toUri } from '@lens-protocol/metadata';
    import { getMediaImageMimeType } from '../../lib/utils/lens-utils';
    import { getMediaAudioMimeType, getMediaVideoMimeType } from '../../lib/utils/lens-utils.js';
    import '@google/model-viewer';
    import { type MetadataAttribute, MetadataAttributeType } from '@lens-protocol/metadata';
    import { DateTime } from 'luxon';

    export let disabled: boolean = false;
    export let isCollectable: boolean;

    const getMediaCid = (media: AnyMedia | undefined) =>
        media?.item.startsWith('ipfs://') ? getCidFromIpfsUrl(media.item) : undefined

    const getThreeDAssetCid = (threeDAsset: ThreeDAsset | undefined) =>
        threeDAsset?.uri?.startsWith('ipfs://') ? getCidFromIpfsUrl(threeDAsset.uri) : undefined

    $: attachedMedia = $audio || $image || $video;
    $: attachmentCid = getMediaCid($image) || getMediaCid($audio) || getMediaCid($video) || getThreeDAssetCid($threeDAsset);
    $: attachmentPath = attachmentCid ? `${INFURA_GATEWAY_URL}${attachmentCid}` : (attachedMedia?.item || $threeDAsset?.uri);

    $: coverPath = $cover ? `${INFURA_GATEWAY_URL}${getCidFromIpfsUrl($cover)}` : undefined;

    let coverInput: HTMLInputElement;
    let loading = false;
    let coverLoading = false;
    let uploadedPct = 0;
    let isFileDragged = false;

    const isID3TagV2 = (tag: ID3Tag): tag is ID3TagV2 => {
        return (tag as ID3TagV2).kind === 'v2';
    };

    const getDurationFromFile = async (file: File): Promise<number> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const audioContext = new AudioContext();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                resolve(audioBuffer.duration); // duration in seconds
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });

    const processId3Tags = async (file: File) => {
        const tag: ID3Tag | null = await id3.fromFile(file);
        console.log('processId3Tags: got tags from file', tag)
        if (!tag || !$audio) return;

        // If there are ID3 tags, we assume it's a music file
        $audio.kind = MediaAudioKind.MUSIC;

        if (tag.title) {
            title.set(tag.title);
        } else if (file.name) {
            title.set(file.name.replace(/\.[^/.]+$/, ""));
        }

        if (tag.artist) {
            author.set(tag.artist);
            $audio.artist = tag.artist;
        }

        if ('genre' in tag && tag.genre) {
            $audio.genre = tag.genre as string;
        }

        if ('comments' in tag && tag.comments) {
            description.set(tag.comments as string);
        }

        const attributes: MetadataAttribute[] = [];

        if ('album' in tag && tag.album) {
            album.set(tag.album as string)
        }

        if ('year' in tag && tag.year) {
            try {
                const year = Number(tag.year);
                const iso = DateTime.fromObject({ year }).toISODate();
                if (iso) {
                    date.set(iso)
                }
            } catch (e) {
                console.warn('processId3Tags: Error parsing year', tag.year);
            }
        }

        if (attributes.length) {
            $audio.attributes = attributes;
        }

        if (isID3TagV2(tag) && tag.images.length) {
            const imageBuffer = tag.images[0].data;
            if (!imageBuffer) return;
            const id3Cover = new File([imageBuffer], 'cover.jpeg', {type: tag.images[0].mime ?? undefined});
            await upload(id3Cover, true);
        }
    };

    const upload = async (fileToUpload: File, isCover: boolean = false) => {
        console.log('upload: ', fileToUpload.name);
        if (isCover) {
            coverLoading = true;
        } else {
            loading = true;
        }

        let web3File: Web3File = fileToUpload as Web3File
        try {
            web3File.cid = await uploadAndPin(fileToUpload, (progress: number) => {
                console.log('upload: Uploading...', progress.toFixed(2))
                uploadedPct = progress;
            });
        } catch (e) {
            console.error(e)

            if (isCover) {
                cover.set(undefined);
                coverLoading = false;
            } else {
                $image = undefined;
                $audio = undefined;
                $video = undefined;
                $threeDAsset = undefined;
                loading = false;
            }

            uploadedPct = 0;
            $file = undefined;

            toast.error('upload: Error uploading file', {duration: 5000});

            return;
        }

        console.log('upload: Uploaded file at', web3File.cid);

        if (isCover) {
            cover.set(`ipfs://${web3File.cid}`);
            return;
        }

        const item = toUri(`ipfs://${web3File.cid}`);

        if (fileToUpload.type.startsWith('image/')) {
            $image = {
                item,
                type: getMediaImageMimeType(fileToUpload.type),
            };
        } else if (fileToUpload.type.startsWith('audio/')) {
            $audio =  {
                item,
                type: getMediaAudioMimeType(fileToUpload.type),
            };
        } else if (fileToUpload.type.startsWith('video/')) {
            $video = {
                item,
                type: getMediaVideoMimeType(fileToUpload.type),
            };
        } else if (isThreeDFile(fileToUpload)) {
            $threeDAsset = {
                uri: item,
                format: ThreeDFormat.GLTF,
                playerUrl: toUri('https://modelviewer.dev/editor/'),
            };
        }

        console.log('upload: created attachment', web3File.cid);

        if ($audio) {
            try {
                const duration = await getDurationFromFile(fileToUpload);
                console.log('upload: audio duration', duration, 'seconds');
                $audio.duration = Math.round(duration);
                await processId3Tags(fileToUpload);
                console.log('upload: audio ID3 tag metadata loaded', $audio);
            } catch (e) {
                console.warn('upload: Error loading audio ID3 tag metadata');
            }
        }

        $file = undefined;
    };

    const onFileSelected = async (e: Event, isCover: boolean = false) => {
        if (!e.target) return;
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        const maxSize = isCover ? MAX_FILE_SIZE / 10 : MAX_FILE_SIZE;

        if (!file || file.size > maxSize) {
            toast.error(`File too large. Max ${maxSize}MB`, {duration: 5000});
            return;
        }
        console.log('File selected', file);

        await upload(file, isCover);
    };

    const onDeleteCover = async () => {
        if (!$cover) return;

        if ($cover) {
            try {
                await unpin(getCidFromIpfsUrl($cover));
            } catch (e) {
                console.warn('Unable to unpin cid', $cover)
            }
        }

        cover.set(undefined);
        coverLoading = false;
    };

    const deleteAttachment = async () => {
        if (attachmentCid) {
            try {
                await unpin(attachmentCid);
            } catch (e) {
                console.warn('Unable to unpin cid', attachmentCid)
            }
        }

        $image = undefined;
        $audio = undefined;
        $video = undefined;
        $threeDAsset = undefined;
        loading = false;

        if (!$collectSettings.isCollectible) {
            $title = undefined;
            $description = undefined;
            $author = undefined;
        }
    }

    const onDeleteMedia = async () => {
        await deleteAttachment();
        await onDeleteCover();
        uploadedPct = 0;
    };

    const onCoverFileDropped = async (ev: DragEvent) => {
        const dt = ev.dataTransfer;
        if (!dt) return;
        const file: File = dt.files[0];
        console.log('Cover file dropped', file);

        if (!file.type ||
            !IMAGE_TYPES.includes(file.type) ||
            file.size > (MAX_FILE_SIZE / 10)
        ) {
            toast.error('File not supported', {duration: 5000});
            isFileDragged = false;
            return;
        }

        isFileDragged = false;

        await onDeleteCover();
        await upload(file, true);
    };

    const onAttachmentLoaded = () => {
        loading = false
    };

    $: if ($file && !$file.cid) {
        console.log('reactive: file=',$file);

        onDeleteMedia().catch();
        upload($file).catch();
    }
</script>

<div class="w-full h-full flex flex-col justify-center items-center gap-4 pb-2">

  {#if attachmentPath}

    <div class="flex flex-col w-full items-center justify-center pt-1 rounded-xl">

      {#if $image}

        {#if loading}
          <LoadingSpinner message="Processing..."/>
        {/if}

        <div class="relative">
          <img src={attachmentPath} alt="Uploaded file" class="max-w-full max-h-96 rounded-xl"
               on:load={onAttachmentLoaded}>

          <div class="absolute flex justify-end items-start top-0 left-0 z-10 w-full h-full group">
            <button type="button" class="mt-2 mr-2 hidden group-hover:block" on:click={onDeleteMedia}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
                   class="w-8 h-8 text-white drop-shadow-darker">
                <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                <path
                    d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/>
              </svg>
            </button>
          </div>

        </div>

      {:else}

        <div class="w-full flex flex-col items-center">

          <div class:p-0={$video}
               class:px-2={$audio}
               class:p-1={!$video && !$audio}
               on:drop|preventDefault|stopPropagation={onCoverFileDropped}
               on:dragenter|preventDefault|stopPropagation={() => isFileDragged = true}
               on:dragover|preventDefault|stopPropagation={() => isFileDragged = true}
               on:dragleave|preventDefault|stopPropagation={() => isFileDragged = false}
               class="{isCollectable || $audio ? 'w-full' : 'w-3/5'} mb-4 rounded-xl
                      {$video || $audio ? 'p-0' : 'p-1'}
                      {isFileDragged ? 'bg-orange-50 dark:bg-gray-800' : 'bg-none'}">

            {#if coverPath}

              <div class="w-full relative flex justify-center items-center
                     {$video ? 'aspect-video' : 'aspect-square'}">
                <img src={coverPath} alt="Cover"
                     class="w-full h-full object-cover rounded-xl bg-gray-200
                           {isFileDragged ? 'border border-orange-500' : 'border-none'}"
                     on:load={() => coverLoading = false}>

                <div class="absolute flex justify-end items-start top-0 left-0 z-10 w-full h-full group">
                  <button type="button" class="mt-2 mr-2 hidden group-hover:block" on:click={onDeleteCover}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
                         class="w-8 h-8 text-white drop-shadow-darker">
                      <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                      <path
                          d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/>
                    </svg>
                  </button>
                </div>

              </div>

            {:else if coverLoading}

              <div class="{$video ? 'aspect-video' : 'aspect-square'} flex flex-col items-center justify-center">
                <LoadingSpinner />
              </div>

            {:else}

              <input type="file" class="hidden"
                     accept={imageMimeTypesJoined()}
                     on:change={e => onFileSelected(e, true)}
                     bind:this={coverInput}/>

              <button type="button" disabled={coverLoading}
                      on:click={()=>{coverInput.click();}}
                      class="w-full aspect-square
                            p-4 flex flex-col flex-shrink-0 items-center justify-center cursor-pointer
                            hover:bg-gray-200 dark:hover:bg-gray-500
                            border border-gray-300 dark:border-gray-600 rounded-xl
                            text-gray-600 dark:text-gray-300">

                <svg viewBox="0 0 24 24" fill="none" class="w-10 text-gray-500 dark:text-gray-200"
                     stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M20.4 14.5L16 10 4 20"/>
                </svg>

                <span class="pt-2 text-base font-semibold">Add a cover image</span>

              </button>

            {/if}

          </div>

          {#if $audio}
            <audio src={attachmentPath} preload="metadata" controls controlslist="nodownload"
                   on:load={() => loading = false}
                   class="w-full border border-gray-300 dark:border-gray-500 dark:bg-gray-600 rounded-full"></audio>
          {:else if $video}
            <!-- svelte-ignore a11y-media-has-caption -->
            <video src={attachmentPath}
                   on:load={() => loading = false} preload="metadata" controls controlslist="nodownload"
                   class="rounded-xl {isCollectable ? 'w-full' : 'w-3/5'} aspect-video bg-black" ></video>
          {:else if $threeDAsset}
              <div class='w-full aspect-square'>
                  <model-viewer src={attachmentPath} camera-controls interaction-prompt='none' auto-rotate shadow-intensity="1"
                                class="w-full h-full border border-gray-300 dark:border-gray-600 rounded-xl
                                focus-visible:outline-orange focus-visible:ring-orange" />
              </div>
          {/if}
        </div>

      {/if}

      {#if attachmentCid}

        <div class="w-full text-xs text-gray-400 pt-4 px-1 flex gap-6 truncate justify-center">

          <div class="flex truncate">

            <span class="font-semibold">IPFS:</span>

            <div class="flex truncate pl-1">
              <a href={attachmentPath} class="max-w-[8rem] hover:text-gray-600 grow truncate flex" target="_blank"
                 rel="noreferrer">
                <div class="truncate">{attachmentCid}</div>
                <InlineSVG src={imageExternal} class="w-3 h-3 flex-shrink-0 inline mt-[0.1rem]"/>
              </a>
            </div>

          </div>

          <button type="button" class="text-red-700 dark:text-white opacity-60 hover:opacity-100"
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

  {/if}

</div>