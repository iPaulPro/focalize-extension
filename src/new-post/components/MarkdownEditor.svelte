<script lang="ts">
    import {Editor, rootCtx, defaultValueCtx, ThemeColor} from "@milkdown/core";
    import {clipboard} from '@milkdown/plugin-clipboard';
    import {history} from '@milkdown/plugin-history';
    import {menu} from '@milkdown/plugin-menu';
    import {tooltip} from '@milkdown/plugin-tooltip';
    import {commonmark} from "@milkdown/preset-commonmark";
    import {nordDark, nordLight} from "@milkdown/theme-nord";
    import { insert, getMarkdown, switchTheme } from '@milkdown/utils';

    export let defaultValue;

    export let isRichText = true;

    export let darkMode;

    let editor: Editor;

    export const getText = (): string => editor.action(getMarkdown());

    export const insertText = (text: string) => editor.action(insert(text));

    $: {
        if (editor) {
            const theme = darkMode ? nordDark : nordLight;
            theme.override((emotion, manager) => {
                manager.set(ThemeColor, ([key, opacity]) => {
                    switch (key) {
                        // The primary color. Used in large color blocks.
                        case 'primary':
                            return `rgba(255, 96, 20, ${opacity})`;
                        // The secondary color. Used in tips area.
                        case 'secondary':
                            return `rgba(107, 35, 0, ${opacity})`;
                        // The color of text.
                        case 'neutral':
                            return darkMode ? `rgba(238, 238, 238, ${opacity})` : `rgba(17, 17, 17, ${opacity})`;
                        // The color of widgets, such as buttons.
                        case 'solid':
                            return darkMode ? `rgba(238, 238, 238, ${opacity})` : `rgba(17, 17, 17, ${opacity})`;
                        // // The foreground color.
                        case 'surface':
                            return `transparent`;
                        default:
                            return darkMode ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
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
            })
            .use(darkMode ? nordDark : nordLight);

        if (isRichText) {
            builder.use(menu)
                .use(commonmark)
                .use(tooltip)
                .use(history)
                .use(clipboard);
        }

        editor = await builder.create();
    };
</script>

<div use:makeEditor></div>