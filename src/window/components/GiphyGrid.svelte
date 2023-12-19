<script lang="ts">
    import { throttle } from 'throttle-debounce';
    import { GiphyFetch } from '@giphy/js-fetch-api';
    import { renderGrid } from '@giphy/js-components';
    import type { IGif } from '@giphy/js-types';
    import { createEventDispatcher } from 'svelte';
    import { GIPHY_KEY } from '../../config';
    import { image } from '../../lib/stores/state-store';
    import { MediaImageMimeType, toUri } from '@lens-protocol/metadata';

    export let searchQuery: string;

    let content;

    const dispatch = createEventDispatcher();

    const giphy = (node: HTMLElement, params: any) => {
        const gf = new GiphyFetch(GIPHY_KEY);

        const onClick = (gif: IGif) => {
            console.log('GiphyGrid: on gif click', gif);
            $image = {
                item: toUri(gif.images.original.url),
                type: MediaImageMimeType.GIF,
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
                    borderRadius: 8,
                    onGifClick: onClick,
                    gutter: 6,
                },
                grid
            )
        }

        const resizeRender = throttle(500, () => render(node, params));
        window.addEventListener('resize', resizeRender, false);

        render(node, params);

        return {
            update(query: string) {
                throttle(200, () => {
                    while (node.firstChild) {
                        node.removeChild(node.firstChild);
                    }
                    render(node, query);
                }).call(params);
            }
        }
    };
</script>

<div class="overflow-y-auto overflow-x-hidden max-h-48 md:max-h-96" use:giphy={searchQuery}></div>