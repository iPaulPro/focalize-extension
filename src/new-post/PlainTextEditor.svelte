<script lang="ts">
    import Tribute from "tributejs";
    import {buildLoadingItemTemplate, buildTributeUsernameMenuTemplate, searchHandles} from "../lib/lens-search";
    import {onMount} from "svelte";

    import type {PublicationMainFocus} from "../graph/lens-service";
    import {PublicationMainFocus} from "../graph/lens-service";

    export let plainText: string;
    export let postType: PublicationMainFocus;

    let placeholder: string;

    if (postType === PublicationMainFocus.Link) {
        placeholder = "Text (optional)";
    } else {
        placeholder = "What's happening?";
    }

    onMount(() => {
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
    });
</script>

<textarea id="plainTextInput" bind:value={plainText} placeholder={placeholder}
          rows={postType === PublicationMainFocus.Link ? 3 : 6}
          class="w-full text-xl my-3 mr-3 border-none focus:ring-0"></textarea>