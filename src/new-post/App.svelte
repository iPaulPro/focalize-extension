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

        let value = '';

        if (urlParams.has('title')) {
            const title = urlParams.get('title');
            value += `**${title}**\n`
        }

        if (urlParams.has('desc')) {
            const desc = urlParams.get('desc').replaceAll('\n', '\n> ');
            value += `> ${desc}\n\n`
        }

        if (urlParams.has('url')) {
            const url = urlParams.get('url');
            value += `<${url}>`
        }

        defaultValue = value
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