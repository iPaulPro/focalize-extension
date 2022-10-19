<script lang="ts">
    import {Editor, rootCtx, defaultValueCtx, ThemeColor} from "@milkdown/core";
    import {clipboard} from '@milkdown/plugin-clipboard';
    import {history} from '@milkdown/plugin-history';
    import {menu} from '@milkdown/plugin-menu';
    import {tooltip} from '@milkdown/plugin-tooltip';
    import {commonmark} from "@milkdown/preset-commonmark";
    import {nord} from "@milkdown/theme-nord";
    import { insert, getMarkdown } from '@milkdown/utils';

    export let defaultValue;

    export let isRichText = true;

    let editor;

    export const getText = (): string => editor.action(getMarkdown());

    export const insertText = (text: string) => editor.action(insert(text));

    const makeEditor = async dom => {
        nord.override((emotion, manager) => {
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
                        return `rgba(17, 17, 17, ${opacity})`;
                    // The color of widgets, such as buttons.
                    case 'solid':
                        return `rgba(17, 17, 17, ${opacity})`;
                    // The color of box shadow.
                    case 'shadow':
                        return `rgba(17, 17, 17, ${opacity})`;
                    // The color of line, such as border.
                    case 'line':
                        return `rgba(204, 204, 204, ${opacity})`;
                    // The foreground color.
                    case 'surface':
                        return `rgba(255, 255, 255, ${opacity})`;
                    // The background color.
                    case 'background':
                        return `rgba(238, 238, 238, ${opacity})`;
                    default:
                        return `rgba(0, 0, 0, ${opacity})`;
                }
            });
        });

        const builder = Editor.make()
            .config(ctx => {
                ctx.set(rootCtx, dom);
                if (defaultValue) {
                    ctx.set(defaultValueCtx, defaultValue);
                }
            })
            .use(nord);

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