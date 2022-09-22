<script lang="ts">
    import {decodeJwt} from 'jose'

    import {submitPost} from '../lib/lens-post.js'
    import {refreshAccessToken} from "../lib/lens-auth";

    import Editor from './Editor.svelte';
    import Button from '@smui/button';
    import {Label} from '@smui/common';
    import {onMount} from "svelte";

    /**
     * Bound to the editor
     */
    let getMarkdown: () => string;

    /**
     * Editor prop
     */
    let defaultValue: string;

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

    onMount(async () => {
        chrome.storage.local.get(['accessToken', 'refreshToken'], async result => {
            console.log('Got saved tokens', result);
            const accessToken = decodeJwt(result.accessToken);
            const accessTokenExpiration = accessToken.exp * 1000; // convert to ms

            const now = Date.now();
            if (accessTokenExpiration < now) {
                console.log('Access token is expired.');
                const refreshToken = decodeJwt(result.refreshToken);
                const refreshTokenExpiration = refreshToken.exp * 1000; // convert to ms

                if (refreshTokenExpiration > now) {
                    await refreshAccessToken(result.refreshToken);
                } else {
                    console.log('Refresh token is expired')
                }
            }
        });
    });

    const onSubmitClick = async () => {
        const markdown = getMarkdown();
        await submitPost(markdown);
    }

    // const updateProfile = async () => {
    //     const uri = `ipfs://QmNxPXa4DYEoqGhFVfHArUi2uhWyDVQBmrnA4rZ18rRLvF`
    //     const profile = await getProfile();
    //     Lens.
    // }
</script>

<main class="w-full h-full">

  <div class="container max-w-screen-lg mx-auto">

    <div class="flex flex-col mt-6">
      <Editor bind:getMarkdown {defaultValue}/>
    </div>

    <div class="flex justify-end">

      <Button on:click={onSubmitClick} variant="raised" class="mt-6">
        <Label>Submit</Label>
      </Button>

    </div>

  </div><!-- container -->

</main>

<style>

</style>