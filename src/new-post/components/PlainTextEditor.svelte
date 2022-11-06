<script lang="ts">
    import Tribute from "tributejs";
    import {buildLoadingItemTemplate, buildTributeUsernameMenuTemplate, searchHandles} from "../../lib/lens-search";
    import {sleep} from "../../lib/utils";

    import {onMount} from "svelte";

    import {content, profile} from "../../lib/state";

    export let placeholder: string;
    export let disabled: boolean;
    export let rows: number;

    function updateInputHeight(view) {
        view.style.height = 'inherit';
        view.style.height = `${view.scrollHeight}px`;
    }

    const handleInputEvent = (e) => {
        updateInputHeight(e.target);
    }

    onMount(async () => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchHandles(text, cb),
            menuItemTemplate: (item) => buildTributeUsernameMenuTemplate(item),
            loadingItemTemplate: buildLoadingItemTemplate(),
            fillAttr: 'handle',
            lookup: 'handle',
        })

        const plainTextInput = document.getElementById('plainTextInput');
        if (plainTextInput) {
            plainTextTribute.attach(plainTextInput);
        }

        await sleep(1000);
        updateInputHeight(plainTextInput);

        const padding = window.outerHeight - document.body.offsetHeight;
        window.resizeTo(window.outerWidth, document.body.scrollHeight + padding)
    });
</script>

<div class="flex w-full">

  {#if $profile}
    <img src={$profile.picture.original.url} alt="Profile avatar"
         class="w-14 h-14 object-cover rounded-full mx-4 mt-3">
  {/if}

  <textarea id="plainTextInput" {rows} {disabled} {placeholder}
            bind:value={$content} on:input={handleInputEvent}
            class="w-full text-xl my-3 mr-3 border-none focus:ring-0 resize-none overflow-hidden bg-transparent
            text-black dark:text-gray-100"></textarea>
</div>
