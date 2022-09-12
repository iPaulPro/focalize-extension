<script lang="ts">
    import Editor from '../lib/Editor.svelte';

    let getMarkdown: () => string;
    let defaultValue: string;

    const submit = () => {
        const markdown = getMarkdown();
        console.log(`Sending ${markdown}`);
        chrome.runtime.sendMessage(chrome.runtime.id, {markdown}, response => {
            console.log(`Page got response`, response);
        });
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const url = urlParams.get('url');
    const title = urlParams.get('title');
    const desc = urlParams.get('desc');
    console.log(url, title, desc);

    defaultValue = `
**${title}**\n
> ${desc}\n
<${url}>
`
</script>

<main class="w-full h-full">
  <div class="container mx-auto">

    <div class="flex flex-col">

      <Editor bind:getMarkdown {defaultValue} />

    </div>

    <button on:click={submit}>Submit</button>

  </div><!-- container -->
</main>

<style>

</style>