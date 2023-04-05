<script lang="ts">
    //@ts-ignore
    import tippy from "sveltejs-tippy";
    import tooltip from "svelte-ktippy"
    import Tribute from "tributejs";
    import {EmojiButton} from "@joeattardi/emoji-button";
    import InlineSVG from "svelte-inline-svg";
    import ImageAvatar from '../../assets/ic_avatar.svg';

    import AccountChooser from "../../lib/components/AccountChooser.svelte";
    import ConfirmLogoutDialog from '../../lib/components/ConfirmLogoutDialog.svelte'

    import {createEventDispatcher, onDestroy, onMount} from "svelte";

    import {buildLoadingItemTemplate, buildTributeUsernameMenuTemplate, searchHandles} from "../../lib/lens-search";
    import {content} from "../../lib/stores/state-store";
    import {currentUser} from "../../lib/stores/user-store";
    import {darkMode} from "../../lib/stores/preferences-store";
    import {supportedMimeTypesJoined} from '../../lib/file-utils'

    import MediumEditor from 'medium-editor';
    import TurndownService from "turndown";

    import 'font-awesome/css/font-awesome.css';
    import 'medium-editor/dist/css/medium-editor.css';
    import 'medium-editor/dist/css/themes/tim.css';
    import {htmlFromMarkdown} from "../../lib/utils";
    import DialogOuter from "../../lib/components/DialogOuter.svelte";

    export let disabled: boolean = false;
    export let isCompact: boolean;

    let editor: MediumEditor;
    let fileInput;
    let textInput: HTMLElement;
    let emojiPickerTrigger;
    let inputSelection: Selection, selectionRange: Range;
    let avatarError;
    let logoutDialog: HTMLDialogElement;

    const dispatch = createEventDispatcher();

    const emojiPicker = new EmojiButton();

    const fromHtml = new TurndownService({
        preformattedCode: true
    });

    $: {
        emojiPicker.setTheme($darkMode ? 'dark' : 'light');
    }

    const saveSelection = () => {
        inputSelection = window.getSelection();
        if (inputSelection.getRangeAt && inputSelection.rangeCount) {
            selectionRange = inputSelection.getRangeAt(0);
        }
    };

    const insertTextAtCaret = text => {
        if (selectionRange) {
            selectionRange.deleteContents();
            const node = document.createTextNode(text);
            selectionRange.insertNode(node);
            selectionRange.setStartAfter(node)
            inputSelection.removeAllRanges();
            inputSelection.addRange(selectionRange)
        }
        inputSelection = null;
        selectionRange = null;
    };

    emojiPicker.on('emoji', (selection) => {
        insertTextAtCaret(selection.emoji);
        // editor.selectElement(textInput);
        // textInput.focus();
    });

    $: {
        if ($content && editor && textInput) {
            const existing = fromHtml.turndown(textInput.innerHTML)
            if (existing !== $content) {
                const html = htmlFromMarkdown($content);
                editor.setContent(html);
            }
        }
    }

    const makeEditor = async (element) => {
        editor = new MediumEditor(element, {
            toolbar: {
                buttons: ['bold', 'italic', 'anchor', 'quote', 'pre']
            },
            placeholder: {
                text: 'What\'s happening?',
                hideOnClick: false
            },
            extensions: {
                'imageDragging': {}
            },
            buttonLabels: 'fontawesome',
            delay: 500,
            autoLink: true,
            targetBlank: true,
        });
        editor.subscribe('editableInput', async (event, editable: HTMLElement) => {
            $content = fromHtml.turndown(editable);
        });
    };

    const tribute = async (node) => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchHandles(text, isCompact ? 4 : 5, cb),
            menuItemTemplate: (item) => buildTributeUsernameMenuTemplate(item),
            loadingItemTemplate: buildLoadingItemTemplate(),
            fillAttr: 'handle',
            lookup: 'handle',
        })

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            }
        }
    };

    const showLogoutDialog = () => {
        logoutDialog.showModal();
    };

    onDestroy(() => {
        editor?.destroy();
        emojiPicker?.destroyPicker();
    })
</script>

<div class="flex w-full {isCompact ? 'pb-2' : 'pb-4'}">

  <div class="w-20 h-20 px-3 pt-3 cursor-pointer tooltip shrink-0"
       use:tooltip={{
           component: AccountChooser,
           props: {},
           trigger: 'click',
           interactive: true,
           placement: 'bottom-start'
         }}
       on:logout={showLogoutDialog}>

      {#if avatarError || !$currentUser?.avatarUrl}
        <InlineSVG src={ImageAvatar}
                   class="w-full aspect-square rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300" />
      {:else if $currentUser}
        <img src={$currentUser.avatarUrl} alt="Profile avatar"
             class="w-full aspect-square object-contain rounded-full border-2 border-transparent hover:border-orange"
             on:error={() => {avatarError = true}}>
      {/if}

  </div>

  <div class="flex flex-col w-full pr-2 pl-1.5 shrink">

    <!-- Medium Editor gets messed up with there are reactive style declarations, so we do it this way -->
    {#if isCompact}
      <div contenteditable="plaintext-only" tabindex="0" data-disable-editing={disabled} role="textbox"
           use:makeEditor use:tribute bind:this={textInput} on:blur={() => saveSelection()}
           class="w-full text-lg pt-4 pr-3 pl-2 text-black dark:text-gray-100 min-h-[8rem] focus:outline-none
           break-keep ![overflow-wrap:anywhere]">
      </div>
    {:else}
      <div contenteditable="plaintext-only" tabindex="0" data-disable-editing={disabled} role="textbox"
           use:makeEditor use:tribute bind:this={textInput} on:blur={() => saveSelection()}
           class="w-full text-xl pt-4 pr-3 pl-2 text-black dark:text-gray-100 min-h-[8rem] focus:outline-none
           break-keep ![overflow-wrap:anywhere]">
      </div>
    {/if}

    <div class="flex gap-3 {isCompact ? '' : 'pt-1'}">

      <input type="file" class="hidden"
             accept={supportedMimeTypesJoined()}
             on:change={(e) => dispatch('fileSelected', e.target.files[0])}
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

  </div>

</div>

<dialog id="logoutDialog" bind:this={logoutDialog}
        on:click={(event) => {if (event.target.id === 'logoutDialog') logoutDialog?.close()}}
        class="rounded-2xl shadow-2xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-0">
  <DialogOuter title="Log out" {isCompact}>
    <ConfirmLogoutDialog />
  </DialogOuter>
</dialog>

<style global>
  .emoji-picker {
    border: 1px solid rgb(229 231 235);
    border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    --category-button-active-color: #FF6014;
  }

  /* width */
  .emoji-picker ::-webkit-scrollbar {
    width: 10px;
  }

  /* Track */
  .emoji-picker ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 9999px;
  }

  /* Track */
  .emoji-picker.dark ::-webkit-scrollbar-track {
    background: transparent;
  }

  /* Track */
  .emoji-picker ::-webkit-scrollbar-track:hover {
    background: #f1f1f1;
  }

  /* Track */
  .emoji-picker.dark ::-webkit-scrollbar-track:hover {
    background: #374151;
  }

  /* Handle */
  .emoji-picker ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 9999px;
  }

  /* Handle on hover */
  .emoji-picker ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .emoji-picker.dark {
    background-color: #374151 !important;
    border: 1px solid rgb(75 85 99) !important;
  }

  .emoji-picker__search-container {
    height: 2.5em;
    margin: 0.8rem;
  }

  .emoji-picker__search {
    padding: 1em 2.25em 1em 1em;
  }

  .emoji-picker .emoji-picker__search {
    border-radius: 1rem;
  }

  .emoji-picker.dark .emoji-picker__search {
    background-color: #4B596A;
    border: none;
  }

  .emoji-picker__emoji {
    border-radius: 9999px;
  }

  .medium-editor-placeholder:after {
    margin: 0;
    font-style: normal !important;
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 300;
    color: rgb(107 114 128);
  }

  .compact .medium-editor-placeholder:after {
    font-size: 1.25rem;
    line-height: 1.5rem;
  }

  .dark .medium-editor-placeholder:after {
    color: rgb(156 163 175);
  }

  .medium-editor-element blockquote {
    padding-left: 1rem;
    line-height: 28px;
    border-left: 4px solid rgba(255, 96, 20, 1);
  }

  .medium-editor-element>* {
    margin-bottom: 1.75rem;
  }

  .compact .medium-editor-element>* {
    margin-bottom: 1.25rem;
  }

  .medium-editor-element a {
    color: rgba(107, 35, 0, 1);
  }

  .dark .medium-editor-element a {
    color: rgba(255, 179, 142, 1);
  }

  .medium-editor-element blockquote {
    font-size: 1.125rem; /* 18px */
    line-height: 1.5rem; /* 28px */
  }
</style>