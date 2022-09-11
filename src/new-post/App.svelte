<script lang="ts">
    import Editor from '../lib/Editor.svelte'

    // chrome.runtime.onMessage.addListener(
    //     function(request, sender, sendResponse) {
    //         console.log(sender.tab ?
    //             "from a content script:" + sender.tab.url :
    //             "from the extension");
    //         if (request.greeting === "hello")
    //             sendResponse({farewell: "goodbye"});
    //     }
    // );

    let markdown

    const submit = () => {
        chrome.runtime.sendMessage(chrome.runtime.id, {markdown}, response => {
            console.log(`Page got response`, response)
        });
    }

</script>

<main>
  <Editor defaultValue="# Milkdown 💗 Svelte" bind:markdown />
  <button on:click={submit}>Submit</button>
</main>

<style>

</style>