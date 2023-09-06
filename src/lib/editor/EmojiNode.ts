/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
    type EditorConfig,
    type LexicalNode,
    type SerializedTextNode,
    type Spread,
    TextNode,
} from 'lexical';

export type SerializedEmojiNode = Spread<
    {
        type: 'emoji';
        version: 1;
    },
    SerializedTextNode
>;

export const createEmojiNode = (emojiText: string): EmojiNode =>
    new EmojiNode(emojiText).setMode('token');

export const isEmojiNode = (
    node: LexicalNode | null | undefined
): node is EmojiNode => node instanceof EmojiNode;

export class EmojiNode extends TextNode {
    static getType(): string {
        return 'emoji';
    }

    static clone(node: EmojiNode): EmojiNode {
        return new EmojiNode(node.__text, node.__key);
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config);
        dom.classList.add('editor-text-emoji');
        return dom;
    }

    static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
        const node = createEmojiNode(serializedNode.text);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON(): SerializedEmojiNode {
        return {
            ...super.exportJSON(),
            type: 'emoji',
            version: 1,
        };
    }
}
