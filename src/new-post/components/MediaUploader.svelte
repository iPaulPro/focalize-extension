<script lang="ts">
    import toast from 'svelte-french-toast';

    import PlainTextEditor from '../components/PlainTextEditor.svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';

    import imageExternal from '../../assets/ic_external.svg';

    import {uploadFile} from "../../lib/ipfs-service";
    import {MAX_FILE_SIZE, supportedMimeTypesJoined} from '../../lib/file-utils.js'
    import {attachment, description, title} from "../../lib/state";

    import type {Web3File} from "web3.storage";
    import InlineSVG from "svelte-inline-svg";

    export let disabled: boolean;
    export let isCollectable: boolean;
    export let collectPrice: string;

    $: filePath = $attachment?.cid ? `${import.meta.env.VITE_INFURA_GATEWAY_URL}${$attachment?.cid}` : null;
    $: fileType = $attachment?.type;

    let fileInput;
    let loading = false;
    let uploadedPct = 0;
    let useContentAsDescription = true;

    const upload = async (file: Web3File) => {
        console.log('uploadFile', file);
        loading = true;

        file.cid = await uploadFile(file, pct => {
            console.log('Uploading...', pct.toFixed(2))
            uploadedPct = pct;
        });

        console.log('Uploaded file at', file.cid);

        attachment.set(file);
    };

    const onFileSelected = async (e) => {
        let file = e.target.files[0];
        if (!file || file.size > MAX_FILE_SIZE) {
            toast.error('File too large');
            return;
        }
        console.log('File selected', file);

        try {
            await upload(file);
        } catch (e) {
            console.error(e)
            toast.error('Error uploading file');
        }
    };

    const onDeleteMedia = () => {
        attachment.set(null);
        uploadedPct = 0;
        loading = false;
    };

    $: {
        const file = $attachment;
        if (file && !file.cid) {
            loading = true;
            onDeleteMedia();
            upload(file)
                .catch(e => {
                    console.error(e);
                    toast.error('Error uploading file');
                });
        }
    }
</script>

<div class="min-h-48 w-full flex flex-col justify-center items-center gap-4 pb-2">

{#if filePath && fileType}

    <PlainTextEditor placeholder="Comment (optional)" rows={3} />

    <div class="flex w-full justify-center bg-gray-100 px-4 pt-6 pb-4 rounded-xl">

      <div class="flex flex-col items-center justify-center {isCollectable ? 'w-5/12' : 'w-full'} ">
        {#if fileType.startsWith('image/')}

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

          <!-- svelte-ignore a11y-media-has-caption -->
          <video src={filePath} type={fileType}
                 on:load={() => loading = false}
                 preload="metadata" controls></video>

        {/if}


        {#if $attachment?.cid}
          <div class="w-full text-xs text-gray-400 pt-4 px-1 flex gap-6 truncate justify-center">

            <div class="flex truncate">

              <span class="font-semibold">IPFS:</span>

              <div class="flex truncate pl-1">
                <a href={filePath} class="max-w-[10rem] hover:text-gray-600 grow truncate flex" target="_blank" rel="noreferrer">
                  <div class="truncate">{$attachment?.cid}</div>
                  <InlineSVG src={imageExternal} class="w-3 h-3 flex-shrink-0 inline mt-[0.1rem]"/>
                </a>
              </div>

            </div>

            <button class="text-red-700 opacity-60 hover:opacity-100"
                    on:click={onDeleteMedia}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>

          </div>
        {/if}
      </div>

      {#if isCollectable}

        <div class="flex flex-col grow gap-3 pl-6">

          {#if collectPrice}

            <div class="flex flex-col">
              <div class="text-2xl font-semibold">
                {collectPrice}
              </div>

              <div class="text-sm text-gray-400">
                PRICE
              </div>
            </div>

          {/if}

          <input type="text" placeholder="Title (optional)"
                 class="w-full rounded-lg border-gray-200 text-lg placeholder-gray-400 focus:outline-none focus:ring-2
                 focus:ring-orange-200 focus:border-transparent mt-2 disabled:opacity-40"
                 bind:value={$title} disabled={disabled}>

          <textarea placeholder="Description (optional)" rows={useContentAsDescription ? '3' : '5'}
                    class="mt-1 rounded-lg border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2
                    focus:ring-orange-200 focus:border-transparent disabled:opacity-40 resize-none"
                    bind:value={$description} disabled={disabled || useContentAsDescription}></textarea>

          <div class="flex items-center px-3">
            <input id="desc-toggle" name="desc-toggle" type="checkbox"
                   class="w-4 h-4 text-orange-600 border-gray-200 rounded focus:ring-orange-500"
                   bind:checked={useContentAsDescription} disabled={disabled}>
            <label for="desc-toggle" class="block ml-2 text-sm text-neutral-600"> Use comment as description </label>
          </div>

          <div class="text-xs text-gray-400 px-3">
            Title and description are used on NFT marketplaces but may not be shown on all Lens dapps.
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

    <div class="text-lg h-40 flex justify-center items-center">

      <div class="pt-6">
        Drag and drop media or

        <input type="file" class="hidden"
               accept={supportedMimeTypesJoined()}
               on:change={(e)=>onFileSelected(e)}
               bind:this={fileInput}/>

        <button class="font-semibold text-orange"
                on:click={()=>{fileInput.click();}}>
          Upload
        </button>
      </div>

    </div>

  {/if}

</div>