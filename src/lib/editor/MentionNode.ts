/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Spread } from 'lexical';

import {
    type DOMConversionMap,
    type DOMConversionOutput,
    type DOMExportOutput,
    type EditorConfig,
    type LexicalNode,
    type NodeKey,
    type SerializedTextNode,
    TextNode,
} from 'lexical';
import type { TextMatchTransformer } from '@lexical/markdown/MarkdownTransformers';
import { formatHandleV1toV2 } from '../utils/lens-utils';

export type SerializedMentionNode = Spread<
    {
        mentionName: string;
        type: 'mention';
        version: 1;
    },
    SerializedTextNode
>;

export const createMentionNode = (mentionName: string): MentionNode => {
    const mentionNode = new MentionNode(mentionName);
    mentionNode.setMode('normal');
    return mentionNode;
};

const convertMentionElement = (
    domNode: HTMLElement
): DOMConversionOutput | null => {
    const textContent = domNode.textContent;

    if (textContent !== null) {
        const node = createMentionNode(textContent);
        return { node };
    }

    return null;
};

export const isMentionNode = (
    node: LexicalNode | null | undefined
): node is MentionNode => node instanceof MentionNode;

export class MentionNode extends TextNode {
    // tslint:disable-next-line:variable-name
    __mention: string;

    static getType(): string {
        return 'mention';
    }

    static clone(node: MentionNode): MentionNode {
        return new MentionNode(node.__mention, node.__text, node.__key);
    }

    static importJSON(serializedNode: SerializedMentionNode): MentionNode {
        const node = createMentionNode(serializedNode.mentionName);
        node.setTextContent(serializedNode.text);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    constructor(mentionName: string, text?: string, key?: NodeKey) {
        super(text ?? mentionName, key);
        this.__mention = mentionName;
    }

    exportJSON(): SerializedMentionNode {
        return {
            ...super.exportJSON(),
            mentionName: this.__mention,
            type: 'mention',
            version: 1,
        };
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config);
        dom.classList.add(config.theme.link!);
        return dom;
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span');
        element.setAttribute('data-lexical-mention', 'true');
        element.textContent = this.__text;
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            span: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-mention')) {
                    return null;
                }
                return {
                    conversion: convertMentionElement,
                    priority: 1,
                };
            },
        };
    }

    canInsertTextBefore(): boolean {
        return false;
    }

    canInsertTextAfter(): boolean {
        return true;
    }

    isTextEntity(): true {
        return true;
    }
}

export const MENTION: TextMatchTransformer = {
    dependencies: [MentionNode],
    export: (node) => {
        if (!isMentionNode(node)) {
            return null;
        }
        const text = node.getTextContent();
        return '@' + formatHandleV1toV2(text.slice(1));
    },
    importRegExp:
        /(^|\s)@(([a-zA-Z0-9_]+)\/([a-zA-Z0-9_]+))(?=[\s.,+*?$@&|#{}()^\-\[\]\\/!%'"~=<>_:;]|)/,
    regExp: /(^|\s)@(([a-zA-Z0-9_]+)\/([a-zA-Z0-9_]+))(?=[\s.,+*?$@&|#{}()^\-\[\]\\/!%'"~=<>_:;]|$)/,
    replace: (textNode: TextNode, match: RegExpMatchArray) => {
        const [, leadingWhiteSpace, , domain, localName] = match;
        const handle = `${leadingWhiteSpace}@${localName}.${domain}`;
        const mentionNode = createMentionNode(handle);
        mentionNode.setFormat(textNode.getFormat());
        textNode.replace(mentionNode);
    },
    type: 'text-match',
    trigger: '@',
};
