<script lang="ts">
    import { toast } from 'svelte-sonner';

    import LoadingSpinner from '@/lib/components/LoadingSpinner.svelte';
    import imageExternal from '~/assets/ic_external.svg';

    import {
        IMAGE_TYPES,
        imageMimeTypesJoined,
        isThreeDFile,
        MAX_FILE_SIZE,
    } from '@/lib/utils/file-utils';
    import {
        album,
        audio,
        author,
        collectSettings,
        cover,
        date,
        description,
        file,
        image,
        threeDAsset,
        title,
        video,
    } from '@/lib/stores/state-store';

    import * as id3 from 'id3js';
    import type { ID3Tag, ID3TagV2 } from 'id3js/lib/id3Tag';
    import {
        type AnyMedia,
        MediaAudioKind,
        type ThreeDAsset,
        ThreeDFormat,
        type URI,
    } from '@lens-protocol/metadata';
    import { getKeyFromLensUrl, getMediaImageMimeType } from '@/lib/utils/lens-utils';
    import { getMediaAudioMimeType, getMediaVideoMimeType } from '@/lib/utils/lens-utils.js';
    import '@google/model-viewer';
    import { type MetadataAttribute } from '@lens-protocol/metadata';
    import { DateTime } from 'luxon';
    import {
        GROVE_GATEWAY_URL,
        type GroveFile,
        deleteFile,
        uploadMutableFile,
    } from '@/lib/grove-service';
    import { getSigner } from '@/lib/evm/ethers-service';
    import { onDestroy } from 'svelte';

    export let disabled: boolean = false;
    export let isCollectable: boolean;

    let coverInput: HTMLInputElement;
    let loading = false;
    let coverLoading = false;
    let uploadedPct = 0;
    let isFileDragged = false;
    let attachmentCid: string | undefined = undefined;

    $: attachedMedia = $audio || $image || $video;
    $: attachmentPath = attachmentCid
        ? `${GROVE_GATEWAY_URL}${attachmentCid}`
        : attachedMedia?.item || $threeDAsset?.uri;

    $: coverPath = $cover ? `${GROVE_GATEWAY_URL}${getKeyFromLensUrl($cover)}` : undefined;

    const getMediaCid = (media: AnyMedia | undefined | null): string | undefined =>
        media?.item.startsWith('lens://') ? getKeyFromLensUrl(media.item) : undefined;

    const getThreeDAssetCid = (threeDAsset: ThreeDAsset | undefined | null): string | undefined =>
        threeDAsset?.uri.startsWith('lens://') ? getKeyFromLensUrl(threeDAsset.uri) : undefined;

    $: if ($audio) {
        attachmentCid = getMediaCid($audio);
    } else if ($image) {
        attachmentCid = getMediaCid($image);
    } else if ($video) {
        attachmentCid = getMediaCid($video);
    } else if ($threeDAsset) {
        attachmentCid = getThreeDAssetCid($threeDAsset);
    }

    const isID3TagV2 = (tag: ID3Tag): tag is ID3TagV2 => {
        return (tag as ID3TagV2).kind === 'v2';
    };

    const getDurationFromFile = async (file: File): Promise<number> =>
        new Promise((resolve, reject) => {
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
        console.log('processId3Tags: got tags from file', tag);
        if (!tag || !$audio) return;

        // If there are ID3 tags, we assume it's a music file
        $audio.kind = MediaAudioKind.MUSIC;

        if (tag.title) {
            title.set(tag.title);
        } else if (file.name) {
            title.set(file.name.replace(/\.[^/.]+$/, ''));
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
            album.set(tag.album as string);
        }

        if ('year' in tag && tag.year) {
            try {
                const year = Number(tag.year);
                const iso = DateTime.fromObject({ year }).toISODate();
                if (iso) {
                    date.set(iso);
                }
            } catch {
                console.warn('processId3Tags: Error parsing year', tag.year);
            }
        }

        if (attributes.length) {
            $audio.attributes = attributes;
        }

        if (isID3TagV2(tag) && tag.images.length) {
            const imageBuffer = tag.images[0].data;
            if (!imageBuffer) return;
            const id3Cover = new File([imageBuffer], 'cover.jpeg', {
                type: tag.images[0].mime ?? undefined,
            });
            await upload(id3Cover, true);
        }
    };

    export const upload = async (fileToUpload: File, isCover: boolean = false) => {
        if (loading || coverLoading) return;

        console.log('upload: ', fileToUpload.name);
        if (isCover) {
            coverLoading = true;
        } else {
            loading = true;
        }

        let web3File: GroveFile = fileToUpload as GroveFile;
        try {
            const signer = await getSigner();

            web3File.key = await uploadMutableFile(
                fileToUpload,
                signer.address,
                (progress: number) => {
                    console.log('upload: Uploading...', progress.toFixed(2));
                    uploadedPct = progress;
                },
            );
        } catch (e) {
            console.error(e);

            if (isCover) {
                $cover = null;
                coverLoading = false;
            } else {
                $image = null;
                $audio = null;
                $video = null;
                $threeDAsset = null;
                loading = false;
            }

            uploadedPct = 0;
            $file = undefined;

            toast.error('upload: Error uploading file', { duration: 5000 });

            return;
        }

        console.log('upload: Uploaded file at', web3File.key);

        if (isCover) {
            cover.set(`lens://${web3File.key}`);
            return;
        }

        const item = `lens://${web3File.key}` as URI;

        if (fileToUpload.type.startsWith('image/')) {
            $image = {
                item,
                type: getMediaImageMimeType(fileToUpload.type),
            };
        } else if (fileToUpload.type.startsWith('audio/')) {
            $audio = {
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
                playerUrl: 'https://modelviewer.dev/editor/' as URI,
            };
        }

        console.log('upload: created attachment', web3File.key);

        if ($audio) {
            try {
                const duration = await getDurationFromFile(fileToUpload);
                console.log('upload: audio duration', duration, 'seconds');
                $audio.duration = Math.round(duration);
                await processId3Tags(fileToUpload);
                console.log('upload: audio ID3 tag metadata loaded', $audio);
            } catch {
                console.warn('upload: Error loading audio ID3 tag metadata');
            }
        }

        $file = undefined;
    };

    const onCoverFileSelected = async (e: Event) => {
        if (!e.target) return;
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file || file.size > MAX_FILE_SIZE) {
            toast.error(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`, { duration: 5000 });
            return;
        }
        console.log('File selected', file);

        await onDeleteCover();
        await upload(file, true);
    };

    const onDeleteCover = async () => {
        if (!$cover) return;

        if ($cover) {
            try {
                const signer = await getSigner();
                await deleteFile(getKeyFromLensUrl($cover), signer);
            } catch {
                console.warn('Unable to unpin cid', $cover);
            }
        }

        cover.set(undefined);
        coverLoading = false;
    };

    const deleteAttachment = async (clearFile = true) => {
        if (!$image && !$audio && !$video && !$threeDAsset) {
            loading = false;
            return;
        }

        if (attachmentCid) {
            try {
                const signer = await getSigner();
                await deleteFile(attachmentCid, signer);
            } catch {
                console.warn('Unable to unpin cid', attachmentCid);
            }
        }

        $image = null;
        $audio = null;
        $video = null;
        $threeDAsset = null;
        attachmentCid = undefined;
        loading = false;

        if (clearFile) {
            $file = undefined;
        }

        if (!$collectSettings.isCollectible) {
            $title = null;
            $description = null;
            $author = null;
        }
    };

    const onDeleteMedia = async (clearFile = true) => {
        await deleteAttachment(clearFile);
        await onDeleteCover();
        uploadedPct = 0;
    };

    const onCoverFileDropped = async (ev: DragEvent) => {
        const dt = ev.dataTransfer;
        if (!dt) return;
        const file: File = dt.files[0];
        console.log('Cover file dropped', file);

        if (!file.type || !IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE / 10) {
            toast.error('File not supported', { duration: 5000 });
            isFileDragged = false;
            return;
        }

        isFileDragged = false;

        await onDeleteCover();
        await upload(file, true);
    };

    const onAttachmentLoaded = () => {
        loading = false;
    };

    const unsubscribeToFile = file.subscribe((value) => {
        if (value && !value.key) {
            console.log('reactive: file=', value);

            onDeleteMedia().catch();
            upload(value).catch();
        }
    });

    onDestroy(unsubscribeToFile);
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 pb-2">
    {#if attachmentPath}
        <div class="flex w-full flex-col items-center justify-center rounded-xl pt-1">
            {#if $image}
                {#if loading}
                    <LoadingSpinner message="Processing..." />
                {/if}

                <div class="relative">
                    <img
                        src={attachmentPath}
                        alt="Uploaded file"
                        class="max-h-96 max-w-full rounded-xl"
                        on:load={onAttachmentLoaded}
                    />

                    <div
                        class="group absolute left-0 top-0 z-10 flex h-full w-full items-start justify-end"
                    >
                        <button
                            type="button"
                            class="mr-2 mt-2 hidden group-hover:block"
                            on:click={() => onDeleteMedia()}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                fill="currentColor"
                                class="h-8 w-8 text-white drop-shadow-darker"
                            >
                                <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                                <path
                                    d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            {:else}
                <div class="flex w-full flex-col items-center">
                    <div
                        class:p-0={$video}
                        class:px-2={$audio}
                        class:p-1={!$video && !$audio}
                        on:drop|preventDefault|stopPropagation={onCoverFileDropped}
                        on:dragenter|preventDefault|stopPropagation={() => (isFileDragged = true)}
                        on:dragover|preventDefault|stopPropagation={() => (isFileDragged = true)}
                        on:dragleave|preventDefault|stopPropagation={() => (isFileDragged = false)}
                        class="{isCollectable || $audio ? 'w-full' : 'w-3/5'} mb-4 rounded-xl
                      {$video || $audio ? 'p-0' : 'p-1'}
                      {isFileDragged ? 'bg-orange-50 dark:bg-gray-800' : 'bg-none'}"
                    >
                        {#if coverPath}
                            <div
                                class="relative flex w-full items-center justify-center
                     {$video ? 'aspect-video' : 'aspect-square'}"
                            >
                                <img
                                    src={coverPath}
                                    alt="Cover"
                                    class="h-full w-full rounded-xl bg-gray-200 object-cover
                           {isFileDragged ? 'border border-orange-500' : 'border-none'}"
                                    on:load={() => (coverLoading = false)}
                                />

                                <div
                                    class="group absolute left-0 top-0 z-10 flex h-full w-full items-start justify-end"
                                >
                                    <button
                                        type="button"
                                        class="mr-2 mt-2 hidden group-hover:block"
                                        on:click={onDeleteCover}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 512 512"
                                            fill="currentColor"
                                            class="h-8 w-8 text-white drop-shadow-darker"
                                        >
                                            <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                                            <path
                                                d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        {:else if coverLoading}
                            <div
                                class="flex flex-col items-center justify-center {$video
                                    ? 'aspect-video'
                                    : 'aspect-square'}"
                            >
                                <LoadingSpinner />
                            </div>
                        {:else}
                            <input
                                type="file"
                                class="hidden"
                                accept={imageMimeTypesJoined()}
                                on:change={onCoverFileSelected}
                                bind:this={coverInput}
                            />

                            <button
                                type="button"
                                disabled={coverLoading}
                                on:click={() => {
                                    coverInput.click();
                                }}
                                class="flex {$video ? 'aspect-video' : 'aspect-square'}
                                    w-full flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl
                                    border border-gray-300
                                    p-4 text-gray-600 hover:bg-gray-200 dark:border-gray-600
                                    dark:text-gray-300 dark:hover:bg-gray-500"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    class="w-10 text-gray-500 dark:text-gray-200"
                                    stroke="currentColor"
                                    stroke-width="1"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M20.4 14.5L16 10 4 20" />
                                </svg>

                                <span class="pt-2 text-base font-semibold">Add a cover image</span>
                            </button>
                        {/if}
                    </div>

                    {#if $audio}
                        <audio
                            src={attachmentPath}
                            preload="metadata"
                            controls
                            controlslist="nodownload"
                            on:load={() => (loading = false)}
                            class="w-full rounded-full border border-gray-300 dark:border-gray-500 dark:bg-gray-600"
                        ></audio>
                    {:else if $video}
                        <!-- svelte-ignore a11y-media-has-caption -->
                        <video
                            src={attachmentPath}
                            on:load={() => (loading = false)}
                            preload="metadata"
                            controls
                            controlslist="nodownload"
                            class="rounded-xl {isCollectable
                                ? 'w-full'
                                : 'w-3/5'} aspect-video bg-black"
                        ></video>
                    {:else if $threeDAsset}
                        <div class="aspect-square w-full">
                            <model-viewer
                                src={attachmentPath}
                                camera-controls
                                interaction-prompt="none"
                                auto-rotate
                                shadow-intensity="1"
                                class="h-full w-full rounded-xl border border-gray-300 focus-visible:outline-orange
                                focus-visible:ring-orange dark:border-gray-600"
                            />
                        </div>
                    {/if}
                </div>
            {/if}

            {#if attachmentCid}
                <div
                    class="flex w-full justify-center gap-6 truncate px-1 pt-4 text-xs text-gray-400"
                >
                    <div class="flex truncate">
                        <span class="font-semibold">Grove:</span>

                        <div class="flex truncate pl-1">
                            <a
                                href={attachmentPath}
                                class="flex max-w-[8rem] grow truncate hover:text-gray-600"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <div class="truncate">{attachmentCid}</div>
                                <img
                                    src={imageExternal}
                                    class="mt-[0.1rem] inline h-3 w-3 flex-shrink-0"
                                />
                            </a>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="text-red-700 opacity-60 hover:opacity-100 dark:text-white"
                        on:click={() => onDeleteMedia()}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path
                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                            ></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            {/if}
        </div>
    {:else if loading && uploadedPct === 0}
        <div class="py-4">
            <LoadingSpinner />
        </div>
    {:else if uploadedPct > 0 && uploadedPct < 100}
        <div class="flex flex-col items-center justify-center gap-2">
            <div class="m-auto w-72 p-4">
                <div class="mt-3 h-4 w-full rounded-full bg-gray-400">
                    <div
                        class="h-full rounded-full bg-green-500 text-center text-xs text-white"
                        style="width: {uploadedPct}%"
                    ></div>
                </div>
            </div>

            <div>Uploading...</div>
        </div>
    {/if}
</div>
