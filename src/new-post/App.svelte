<script lang="ts">
    import Editor from '../lib/Editor.svelte';
    import Button from '@smui/button';
    import {Label} from '@smui/common';

    /**
     * Bound to the editor
     */
    let getMarkdown: () => string;

    /**
     * Editor prop
     */
    let defaultValue: string;

    const submit = () => {
        const markdown = getMarkdown();
        console.log(`Sending ${markdown}`);
        chrome.runtime.sendMessage(chrome.runtime.id, {markdown}, response => {
            console.log(`Page got response`, response);
        });
    };

    const parseDefaultValue = () => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const url = urlParams.get('url');
        const title = urlParams.get('title');
        const desc = urlParams.get('desc');
        console.log(url, title, desc);

        defaultValue = `**${title}**\n> ${desc}\n\n <${url}>`
    };

    parseDefaultValue();
</script>

<main class="w-full h-full">

  <div class="container mx-auto">

    <div class="flex flex-col mt-6">
      <Editor bind:getMarkdown {defaultValue} />
    </div>

    <div class="flex justify-end">

      <Button on:click={submit} variant="raised" class="mt-6">
        <Label>Submit</Label>
      </Button>

    </div>

  </div><!-- container -->

</main>

<style>

</style>