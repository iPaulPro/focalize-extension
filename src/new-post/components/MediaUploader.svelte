<script lang="ts">
    import toast from 'svelte-french-toast';

    import {uploadFileWithProgress} from "../../lib/ipfs-service";
    import LoadingSpinner from './LoadingSpinner.svelte'
    import {MAX_FILE_SIZE, supportedMimeTypesJoined} from '../../lib/file-utils.js'

    import {attachment, content, title} from "../../lib/state";
    import type {Web3File} from "web3.storage";

    export let disabled: boolean;

    $: filePath = $attachment?.cid ? `https://${$attachment?.cid}.ipfs.nftstorage.link/` : null;
    $: fileType = $attachment?.type;

    let fileInput;
    let loading = false;
    let uploadedPct = 0;

    const uploadFile = async (file: Web3File) => {
        console.log('uploadFile', file);
        loading = true;

        file.cid = await uploadFileWithProgress(file, pct => {
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
            await uploadFile(file);
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
            uploadFile(file)
                .catch(e => {
                    console.error(e);
                    toast.error('Error uploading file');
                });
        }
    }
</script>

<div class="min-h-48 w-full flex flex-col justify-center items-center gap-4 py-8 px-4">

  {#if filePath && fileType}

    <div class="flex flex-col w-full items-center">

      {#if fileType.startsWith('image/')}

        {#if loading}
          <LoadingSpinner message="Processing..."/>
        {/if}

        <div class="relative">
          <img src={filePath} alt="Uploaded file" class="max-w-full max-h-96"
               on:load={() => loading = false}>

          <div class="absolute flex justify-end items-start top-0 left-0 z-10 w-full h-full group">
            <button class="mt-2 mr-2 hidden group-hover:block" on:click={onDeleteMedia}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" class="w-8 h-8 text-white drop-shadow-dark">
                <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
                <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/>
              </svg>
            </button>
          </div>

        </div>

      {:else}

        <video src={filePath} type={fileType}
               on:load={() => loading = false}
               preload="metadata" controls></video>

      {/if}


      {#if $attachment?.cid}
        <div class="text-xs text-gray-400 pt-4 flex gap-6">

          <div class="flex">
            <span class="font-semibold">IPFS CID:</span>

            <a href={filePath} class="hover:text-gray-600 truncate w-48 ml-1" target="_blank"
               referrerpolicy="no-referrer">
              {$attachment?.cid}
            </a>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-3 h-3 inline ml-1 mt-0.5"
                 fill="currentColor">
              <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. -->
              <path
                  d="M288 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h50.7L169.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L384 141.3V192c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H288zM80 64C35.8 64 0 99.8 0 144V400c0 44.2 35.8 80 80 80H336c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v80c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16h80c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z"/>
            </svg>
          </div>

          <button class="text-red-700 opacity-60 hover:opacity-100"
                  on:click={onDeleteMedia}>
            Remove
          </button>

        </div>
      {/if}


      <div class="w-full grow flex flex-col gap-6 pt-8">

        <input type="text" placeholder="Title (optional)"
               class="w-full rounded-lg border-gray-300 text-lg placeholder-gray-400 focus:outline-none focus:ring-2
                 focus:ring-orange-200 focus:border-transparent"
               bind:value={$title} disabled={disabled}>

        <textarea placeholder="(optional)" rows="5"
                  class="grow rounded-lg border-gray-300 placeholder-gray-400  focus:outline-none focus:ring-2
                    focus:ring-orange-200 focus:border-transparent"
                  bind:value={$content} disabled={disabled}></textarea>

      </div>

    </div>

  {:else if loading && uploadedPct === 0}

    <LoadingSpinner/>

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

    <div class="text-lg h-32 flex justify-center items-center">

      <div>
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