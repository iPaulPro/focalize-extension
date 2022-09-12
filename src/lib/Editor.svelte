<script lang="ts">
    import {
        Editor,
        rootCtx,
        defaultValueCtx,
        editorViewCtx,
        serializerCtx
    } from "@milkdown/core";
    import {clipboard} from '@milkdown/plugin-clipboard';
    import { emoji } from "@milkdown/plugin-emoji";
    import {history} from '@milkdown/plugin-history';
    import {listener, listenerCtx} from '@milkdown/plugin-listener';
    import {menu} from '@milkdown/plugin-menu';
    import {tooltip} from '@milkdown/plugin-tooltip';
    import {commonmark} from "@milkdown/preset-commonmark";
    import {nord} from "@milkdown/theme-nord";
    import { insert } from '@milkdown/utils';

    export let defaultValue;

    let editor;

    export const getMarkdown = (): string =>
        editor.action((ctx) => {
            const editorView = ctx.get(editorViewCtx);
            const serializer = ctx.get(serializerCtx);
            return serializer(editorView.state.doc);
        });

    export const insertText = (text: string) => {
        editor.action(insert(text));
    };

    const makeEditor = async dom => {
        editor = await Editor.make()
            .config(ctx => {
                ctx.set(rootCtx, dom);
                ctx.set(defaultValueCtx, defaultValue);
            })
            .use(nord)
            .use(emoji)
            .use(commonmark)
            .use(tooltip)
            .use(history)
            .use(clipboard)
            .use(menu)
            .use(listener)
            .create();
    };
</script>

<style>
</style>

<div use:makeEditor></div>