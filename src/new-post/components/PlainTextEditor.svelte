<script lang="ts">
    import Tribute from "tributejs";
    import {buildLoadingItemTemplate, buildTributeUsernameMenuTemplate, searchHandles} from "../../lib/lens-search";
    import {sleep} from "../../lib/utils";

    import {onMount} from "svelte";

    import {content} from "../../lib/state";

    import {PublicationMainFocus} from "../../graph/lens-service";

    let placeholder: string;

    export let postType: PublicationMainFocus;

    export let disabled: boolean;

    if (postType === PublicationMainFocus.Link) {
        placeholder = "Text (optional)";
    } else {
        placeholder = "What's happening?";
    }

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

<textarea id="plainTextInput" bind:value={$content} placeholder={placeholder} on:input={handleInputEvent}
          rows={postType === PublicationMainFocus.Link ? 4 : 5} disabled={disabled}
          class="w-full text-xl my-3 mr-3 border-none focus:ring-0 resize-none overflow-hidden bg-transparent"></textarea>