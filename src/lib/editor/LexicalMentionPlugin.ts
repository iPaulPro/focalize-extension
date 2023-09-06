import type { LexicalEditor, TextNode } from 'lexical';
import { MentionNode, createMentionNode } from './MentionNode';
import { registerLexicalTextEntity } from '@lexical/text';

// Matches @ mentions with domains and leading  and trailing whitespace or punctuation.
// (full match), (leading whitespace), (name), (trailing whitespace/punctuation)
const MENTION_REGEX =
    /(^|\s)@([a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*)(?=[\s.,+*?$@&|#{}()^\-\[\]\\/!%'"~=<>_:;]|$)/;

const createMentionNodeFromTextNode = (textNode: TextNode): MentionNode =>
    createMentionNode(textNode.getTextContent());

const getMentionMatch = (text: string) => {
    const matchArr = MENTION_REGEX.exec(text);

    if (matchArr === null) {
        return null;
    }

    const mentionLength = matchArr[2].length + 1;
    const startOffset = matchArr.index + matchArr[1].length;
    const endOffset = startOffset + mentionLength;

    return {
        end: endOffset,
        start: startOffset,
    };
};

export const registerMentionPlugin = (editor: LexicalEditor) => {
    if (!editor.hasNodes([MentionNode])) {
        throw new Error('MentionNode is not registered on editor');
    }

    return registerLexicalTextEntity<MentionNode>(
        editor,
        getMentionMatch,
        MentionNode,
        createMentionNodeFromTextNode
    );
};
