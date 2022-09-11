<script lang="ts">
    import {Editor, rootCtx, defaultValueCtx} from "@milkdown/core";
    import {listener, listenerCtx} from '@milkdown/plugin-listener';
    import {commonmark} from "@milkdown/preset-commonmark";
    import {tooltip} from '@milkdown/plugin-tooltip';
    import {nord} from "@milkdown/theme-nord";
    import {history} from '@milkdown/plugin-history';
    import {clipboard} from '@milkdown/plugin-clipboard';

    // import { emoji } from "@milkdown/plugin-emoji";

    export let defaultValue;

    export let markdown: string;

    function editor(dom) {
        Editor.make()
            .config(ctx => {
                ctx.set(rootCtx, dom);
                ctx.set(defaultValueCtx, defaultValue);

                ctx.get(listenerCtx).markdownUpdated((ctx, newMarkdown) => {
                    markdown = newMarkdown;
                });
            })
            .use(nord)
            // .use(emoji)
            .use(commonmark)
            .use(tooltip)
            .use(history)
            .use(clipboard)
            .use(listener)
            .create();
    }
</script>

<style>
</style>

<div use:editor></div>