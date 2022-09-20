<script lang="ts">
    import {Lens} from "lens-protocol";
    import {decodeJwt} from 'jose'

    import {getLensHub} from "../lens-hub";
    import {signedTypeData, splitSignature} from '../lib/ethers-service';
    import {getPublicationId, makeMetadataFile, FREE_COLLECT_MODULE, EMPTY_REFERENCE_MODULE} from "../lib/lens-post";
    import {getDefaultProfile, getOrRefreshAccessToken, refreshAccessToken} from "../lib/lens-auth";
    import {uploadFile} from "../lib/ipfs-service";
    import {PublicationMainFocus} from "../graph/lens-service";

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

    const submitPost = async () => {
        const markdown = getMarkdown();

        let accessToken = await getOrRefreshAccessToken();
        console.log('submitPost: access token', accessToken);

        const profile = await getDefaultProfile();
        console.log('submitPost: Lens profile', profile);

        const metadata: File = makeMetadataFile({
            name: `Post by @${profile.handle}`,
            content: markdown,
            mainContentFocus: PublicationMainFocus.TextOnly
        })
        console.log('submitPost: metadata file', metadata);
        const metadataCid = await uploadFile(metadata);
        console.log('submitPost: metadata CID', metadataCid);

        const postResult = await Lens.CreatePostTypedData(
            profile.id,
            `ipfs://${metadataCid}`,
            FREE_COLLECT_MODULE,
            EMPTY_REFERENCE_MODULE,
            accessToken
        )
        console.log('submitPost: CreatePostTypedData result', postResult)
        if (postResult.error) {
            // TODO
            console.error(postResult.error);
            return;
        }

        const typedData = postResult.data.createPostTypedData.typedData;
        console.log('submitPost: typedData', typedData)

        const signature = await signedTypeData(typedData.domain, typedData.types, typedData.value);
        console.log('submitPost: signature', signature);
        const { v, r, s } = splitSignature(signature);
        console.log('submitPost: split signature', v, r, s);

        const lensHub = getLensHub();
        const tx = await lensHub.postWithSig({
            profileId: typedData.value.profileId,
            contentURI: typedData.value.contentURI,
            collectModule: typedData.value.collectModule,
            collectModuleInitData: typedData.value.collectModuleInitData,
            referenceModule: typedData.value.referenceModule,
            referenceModuleData: typedData.value.referenceModuleInitData,
            sig: {
                v,
                r,
                s,
                deadline: typedData.value.deadline,
            },
        });
        console.log('submitPost: submitted transaction', tx);

        const publicationId = await getPublicationId(tx);

        console.log('submitPost: post has been indexed', postResult.data);
        console.log(`submitPost: internal publication id ${profile.id} - ${publicationId}`);
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

    // const updateProfile = async () => {
    //     const uri = `ipfs://QmNxPXa4DYEoqGhFVfHArUi2uhWyDVQBmrnA4rZ18rRLvF`
    //     const profile = await getProfile();
    //     Lens.
    // }
</script>

<main class="w-full h-full">

  <div class="container mx-auto">

    <div class="flex flex-col mt-6">
      <Editor bind:getMarkdown {defaultValue}/>
    </div>

    <div class="flex justify-end">

      <Button on:click={submitPost} variant="raised" class="mt-6">
        <Label>Submit</Label>
      </Button>

    </div>

  </div><!-- container -->

</main>

<style>

</style>