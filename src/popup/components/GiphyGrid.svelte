<script lang="ts">
    import {throttle} from "throttle-debounce";
    import {GiphyFetch} from "@giphy/js-fetch-api";
    import {renderGrid} from "@giphy/js-components";
    import type {IGif} from "@giphy/js-types";
    import {attachments} from "../../lib/stores/state-store";
    import {createEventDispatcher} from "svelte";

    export let searchQuery: string;

    let content;

    const dispatch = createEventDispatcher();

    const giphy = (node: HTMLElement, params: any) => {
        const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_KEY);

        const onClick = (gif: IGif) => {
            console.log('GiphyGrid: on gif click', gif);
            if (!$attachments) {
                $attachments = [];
            }

            $attachments[0] = {
                item: gif.images.original.url,
                type: 'image/gif',
                altTag: gif.title
            }
            dispatch('gifSelected');
        }

        const render = (node: HTMLElement, query?: string) => {
            const grid = document.createElement('div');
            node.appendChild(grid);

            const width = node.offsetWidth;
            const fetchGifs = (offset: number) =>
               query ? gf.search(query, {offset, limit: 10}) : gf.trending({offset, limit: 10});
            renderGrid(
                {
                    width,
                    fetchGifs,
                    columns: 2,
                    noLink: true,
                    borderRadius: '8',
                    onGifClick: onClick
                },
                grid
            )
        }

        const resizeRender = throttle(500, () => render(node, params));
        window.addEventListener('resize', resizeRender, false);

        render(node, params);

        return {
            update(params) {
                throttle(200, () => {
                    while (node.firstChild) {
                        node.removeChild(node.firstChild);
                    }
                    render(node, params);
                }).call();
            }
        }
    };
</script>

<div use:giphy={searchQuery}></div>