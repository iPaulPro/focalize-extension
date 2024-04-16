import { mergeAttributes, Node } from '@tiptap/core';

export type LensTagOptions = {
    HTMLAttributes: Record<string, any>;
};

export const LensTag = Node.create<LensTagOptions>({
    name: 'lensTag',
    group: 'inline',
    inline: true,
    // selectable: false,
    atom: true,

    addAttributes() {
        return {
            trigger: {
                default: null,
                parseHTML: (element) => element.getAttribute('trigger'),
                renderHTML: (attributes) => {
                    if (!attributes.trigger) {
                        return {};
                    }

                    return {
                        'data-trigger': attributes.trigger,
                    };
                },
            },
            match: {
                default: null,
                parseHTML: (element) => element.getAttribute('match'),
                renderHTML: (attributes) => {
                    if (!attributes.match) {
                        return {};
                    }

                    return {
                        'data-match': attributes.match,
                    };
                },
            },
        };
    },

    addOptions() {
        return {
            HTMLAttributes: {
                class: {},
            },
        };
    },

    parseHTML() {
        return [{ tag: `span[data-type="${this.name}"]` }];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                { 'data-type': this.name },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            `${node.attrs.trigger}${node.attrs.match}`,
        ];
    },

    renderText({ node }) {
        return `@lens/${node.attrs.match}`;
    },

    addStorage() {
        return {
            markdown: {
                // @ts-ignore
                serialize(state, node) {
                    state.write(
                        node.attrs.trigger === '@'
                            ? `@lens/${node.attrs.match}`
                            : node.attrs.match
                    );
                },
                parse: {
                    updateDOM(element: HTMLBodyElement) {
                        const pattern = /(@lens\/)([a-zA-Z0-9_]+)/g;
                        // const pattern = /(@lens\/|#|\$)([a-zA-Z0-9_]+)/g;

                        element.innerHTML = element.innerHTML.replace(
                            pattern,
                            (
                                match: string,
                                type: string,
                                handleOrTag: string
                            ): string => {
                                const isMention = type === '@lens/';
                                const text = isMention
                                    ? `@${handleOrTag}`
                                    : match;
                                return `
                                    <span class="editor-link" 
                                          data-type="lensTag" 
                                          trigger="${isMention ? '@' : type}" 
                                          match="${handleOrTag}">
                                        ${text}
                                    </span>
                                `;
                            }
                        );
                    },
                },
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            Backspace: () =>
                this.editor.commands.command(({ tr, state }) => {
                    let isMention = false;
                    const { selection } = state;
                    const { empty, anchor } = selection;
                    console.log('on Backspace: empty', empty, 'anchor', anchor);
                    if (!empty) {
                        return false;
                    }

                    state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
                        console.log('nodesBetween: node', node);
                        if (node.type.name === this.name) {
                            isMention = true;
                            tr.insertText('', pos, pos + node.nodeSize);

                            return false;
                        }
                    });

                    return isMention;
                }),
        };
    },
});
