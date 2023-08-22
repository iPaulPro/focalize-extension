<script lang="ts">
    //@ts-ignore
    import tippy from 'sveltejs-tippy';
    import {supportedMimeTypesJoined} from '../../utils/file-utils';
    import {createEventDispatcher} from 'svelte';
    import {EmojiButton} from '@joeattardi/emoji-button';
    import {darkMode} from '../../stores/preferences-store';

    export let disabled: boolean = false;
    export let isCompact: boolean;

    const dispatch = createEventDispatcher();

    let fileInput: HTMLInputElement;
    let emojiPickerTrigger: HTMLButtonElement;
    let emojiPicker: EmojiButton;

    const onFileSelected = (e: Event) => {
        const files = (e.target as HTMLInputElement)?.files;
        if (files?.length) {
            dispatch('fileSelected', files[0]);
        }
    }

    $: {
        emojiPicker = new EmojiButton({
            rows: isCompact ? 4 : 5,
            emojiSize: isCompact? '24px' : '32px',
            showPreview: !isCompact,
        });

        emojiPicker.on('emoji', (selection) => {
            dispatch('emojiSelected', selection.emoji);
        });

        emojiPicker?.setTheme($darkMode ? 'dark' : 'light');
    }
</script>

<div class="flex gap-3 {isCompact ? '' : 'pt-1'}">

  <input type="file" class="hidden"
         accept={supportedMimeTypesJoined()}
         on:change={onFileSelected}
         bind:this={fileInput}/>

  <button type="button" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 group" {disabled}
          use:tippy={({content: 'Media'})} on:click={()=>{fileInput.click();}}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round"
         class="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-orange transition-none event select-none">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M20.4 14.5L16 10 4 20"/>
    </svg>
  </button>

  <button type="button" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 group" {disabled}
          use:tippy={({content: 'GIF'})} on:click={() => dispatch('selectGif')}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
         class="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-orange transition-none">
      <path
          d="M19 10.5V8.8h-4.4v6.4h1.7v-2h2v-1.7h-2v-1H19zm-7.3-1.7h1.7v6.4h-1.7V8.8zm-3.6 1.6c.4 0 .9.2 1.2.5l1.2-1C9.9 9.2 9 8.8 8.1 8.8c-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2c1 0 1.8-.4 2.4-1.1v-2.5H7.7v1.2h1.2v.6c-.2.1-.5.2-.8.2-.9 0-1.6-.7-1.6-1.6 0-.8.7-1.6 1.6-1.6z"></path>
      <path
          d="M20.5 2.02h-17c-1.24 0-2.25 1.007-2.25 2.247v15.507c0 1.238 1.01 2.246 2.25 2.246h17c1.24 0 2.25-1.008 2.25-2.246V4.267c0-1.24-1.01-2.247-2.25-2.247zm.75 17.754c0 .41-.336.746-.75.746h-17c-.414 0-.75-.336-.75-.746V4.267c0-.412.336-.747.75-.747h17c.414 0 .75.335.75.747v15.507z"></path>
    </svg>
  </button>

  <button type="button" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 group" {disabled}
          use:tippy={({content: 'Emoji'})} bind:this={emojiPickerTrigger}
          on:click={() => emojiPicker.togglePicker(emojiPickerTrigger)}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
         class="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-orange transition-none p-[0.075rem]">
      <!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc.-->
      <path
          d="M256 352c37.2 0 63.2-17.5 78.4-33.9 8.9-9.7 24.1-10.4 33.9-1.4 9.7 9 10.3 24.2 1.3 33.9C347.7 374.5 309.7 400 256 400c-53.7 0-91.7-25.5-113.6-49.4-9-9.7-9.3-24.9 1.3-33.9 9.8-9 25-8.3 33.9 1.4 15.2 16.4 41.2 33.9 78.4 33.9zm-47.6-144c0 17.7-14.4 32-32 32-17.7 0-32-14.3-32-32s14.3-32 32-32c17.6 0 32 14.3 32 32zm96 0c0-17.7 14.3-32 32-32 17.6 0 32 14.3 32 32s-14.4 32-32 32c-17.7 0-32-14.3-32-32zM512 256c0 141.4-114.6 256-256 256S0 397.4 0 256 114.6 0 256 0s256 114.6 256 256zM256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48z"/>
    </svg>
  </button>

</div>

<style>
</style>