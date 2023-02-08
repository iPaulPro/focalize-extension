<script lang="ts">
    import {defaultValueCtx, Editor, EditorStatus, rootCtx, ThemeColor} from "@milkdown/core";
    import {clipboard} from '@milkdown/plugin-clipboard';
    import {history} from '@milkdown/plugin-history';
    import {menu} from '@milkdown/plugin-menu';
    import {tooltip} from '@milkdown/plugin-tooltip';
    import {gfm} from "@milkdown/preset-gfm";
    import {nordDark, nordLight} from "@milkdown/theme-nord";
    import {insert, replaceAll, switchTheme} from '@milkdown/utils';
    import {listener, listenerCtx} from '@milkdown/plugin-listener';
    import {placeholderCtx} from 'milkdown-plugin-placeholder';
    import {placeholder as placeholderPlugin} from 'milkdown-plugin-placeholder';
    import { trailing } from '@milkdown/plugin-trailing';

    import {article} from "../../lib/store/state-store";
    import {darkMode} from "../../lib/store/preferences-store";

    import {onDestroy} from "svelte";

    export let defaultValue: string;
    export let placeholder: string = 'Markdown supported...';
    export let showMenu = true;

    let editor: Editor;

    export const insertText = (text: string) => editor.action(insert(text));

    $: {
        if (editor) {
            const theme = $darkMode ? nordDark : nordLight;
            theme.override((emotion, manager) => {
                manager.set(ThemeColor, ([key, opacity]) => {
                    switch (key) {
                        // The primary color. Used in large color blocks.
                        case 'primary':
                            return `rgba(255, 96, 20, ${opacity})`;
                        // The secondary color. Used in tips area.
                        case 'secondary':
                            return $darkMode ? `rgba(255, 151, 102, ${opacity})` : `rgba(107, 35, 0, ${opacity})`;
                        // The color of text.
                        case 'neutral':
                            return $darkMode ? `rgba(238, 238, 238, ${opacity})` : `rgba(17, 17, 17, ${opacity})`;
                        // The color of widgets, such as buttons.
                        case 'solid':
                            return $darkMode ? `rgba(238, 238, 238, ${opacity})` : `rgba(17, 17, 17, ${opacity})`;
                        // // The foreground color.
                        case 'surface':
                            return $darkMode ? `rgb(31 41 55)` : `rgb(255 255 255)`;
                        default:
                            return $darkMode ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
                    }
                });
            });
            editor.action(switchTheme(theme));
        }
    }

    const makeEditor = async dom => {
        const builder = Editor.make()
            .config(ctx => {
                ctx.set(rootCtx, dom);
                if (defaultValue) {
                    ctx.set(defaultValueCtx, defaultValue);
                }

                ctx.set(placeholderCtx, placeholder);

                ctx.get(listenerCtx).markdownUpdated((ctx, md) => {
                    $article = md;
                });
            })
            .use(listener)
            .use(placeholderPlugin)
            .use(trailing)
            .use(gfm)
            .use(tooltip)
            .use(history)
            .use(clipboard)
            .use($darkMode ? nordDark : nordLight);

        if (showMenu) {
            builder.use(menu);
        }

        editor = await builder.create();
    };

    const update = (value?: string) => {
        if (!editor) {
            defaultValue = value;
            return;
        }

        if (editor.status === EditorStatus.Created) {
            editor?.action(replaceAll(value));
        }
    }

    const unsubscribe = article.subscribe(update);
    onDestroy(unsubscribe);
</script>

<div id="editor" use:makeEditor></div>

<style global>
  .ProseMirror[data-placeholder]::before {
    color: #a9a9a9;
    position: absolute;
    content: attr(data-placeholder);
    pointer-events: none;
    font-size: 1.25em;
    line-height: 1.5;
    padding-top: 0.6rem;
    padding-left: 0.1rem;
  }
</style>