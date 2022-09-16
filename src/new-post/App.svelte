<script lang="ts">
    import Editor from '../lib/Editor.svelte';
    import Button from '@smui/button';
    import {Label} from '@smui/common';
    import * as jose from 'jose'
    import {onMount} from "svelte";
    import {Lens} from "lens-protocol";

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

    onMount(async () => {
        chrome.storage.local.get(['accessToken', 'refreshToken'], async result => {
            console.log('Got saved tokens', result);
            const accessToken = jose.decodeJwt(result.accessToken);
            const accessTokenExpiration = accessToken.exp * 1000; // convert to ms

            const now = Date.now();
            if (accessTokenExpiration < now) {
                console.log('Access token is expired.');
                const refreshToken = jose.decodeJwt(result.refreshToken);
                const refreshTokenExpiration = refreshToken.exp * 1000; // convert to ms

                if (refreshTokenExpiration > now) {
                    console.log('Refreshing access token');
                    const res = await Lens.RefreshToken(result.refreshToken);
                    console.log('Refresh token response', res);
                    if (res.error) {
                        // TODO
                        return;
                    }

                    const accessToken = res.data?.refresh?.accessToken;
                    const refreshToken = res.data?.refresh?.refreshToken;
                    chrome.storage.local.set({accessToken, refreshToken}, function () {
                        console.log('Saved new auth token to local storage');
                    });
                } else {
                    console.log('Refresh token is expired')
                }
            }
        });
    });
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