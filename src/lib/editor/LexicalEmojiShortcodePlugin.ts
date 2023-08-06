/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import type {TextNode} from 'lexical';
import {createEmojiNode, EmojiNode} from './EmojiNode';

import emojis from './emoji-shortcodes.json';
import {registerLexicalTextEntity} from '@lexical/text';

const emojiMap: Map<string, string> = new Map(Object.entries(emojis));

// Matches :shortcode: with leading and trailing whitespace or punctuation.
// (full match), (leading whitespace), (shortcode), (trailing whitespace/punctuation)
const SHORTCODE_REGEX = /(^|\s):([a-zA-Z0-9_+-]+):(?=[\s.,+*?$@&|#{}()^\-\[\]\\/!%'"~=<>_:;]|$)/g;

const createEmojiNodeFromShortcode = (textNode: TextNode): EmojiNode => {
    const textContent: string = textNode.getTextContent().trim().replace(/:/g, '');
    const emoji: string | undefined = emojiMap.get(textContent);
    return createEmojiNode(emoji ?? textNode.getTextContent());
};

const getEmojiMatch = (text: string) => {
    const matchArrays: RegExpMatchArray[] = [...text.matchAll(SHORTCODE_REGEX)];
    for (const matchArray of matchArrays) {
        if (!matchArray.index) {
            continue;
        }

        const match: string = matchArray[2];
        const emoji: string | undefined = emojiMap.get(match);
        if (!emoji) {
            continue;
        }

        const emojiLength: number = match.length + 2;
        const startOffset: number = matchArray.index + matchArray[1].length;
        const endOffset: number = startOffset + emojiLength;

        return {
            end: endOffset,
            start: startOffset,
        };
    }

    return null;
};

export const registerEmojiShortcodePlugin = (editor: LexicalEditor) => {
    if (!editor.hasNodes([EmojiNode])) {
        throw new Error('EmojiNode is not registered on editor');
    }

    return registerLexicalTextEntity<EmojiNode>(
        editor,
        getEmojiMatch,
        EmojiNode,
        createEmojiNodeFromShortcode,
    );
};