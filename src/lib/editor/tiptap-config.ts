import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Code } from '@tiptap/extension-code';
import { CodeBlock } from '@tiptap/extension-code-block';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Typography } from '@tiptap/extension-typography';
import { LensTag } from './extensions/LensTag';
import { Markdown } from 'tiptap-markdown';

const PLACEHOLDER = "What's happening?";

export const extensions = [
    StarterKit,
    Placeholder.configure({
        placeholder: PLACEHOLDER,
    }),
    Link.configure({
        protocols: ['ipfs', 'ar'],
        openOnClick: false,
        HTMLAttributes: {
            class: 'editor-link',
        },
    }),
    Code.configure({
        HTMLAttributes: {
            class: 'editor-text-code',
        },
    }),
    CodeBlock.configure({
        HTMLAttributes: {
            class: 'editor-code',
        },
    }),
    BulletList.configure({
        HTMLAttributes: {
            class: 'list-disc pl-6',
        },
    }),
    OrderedList.configure({
        HTMLAttributes: {
            class: 'list-decimal pl-6',
        },
    }),
    Blockquote.configure({
        HTMLAttributes: {
            class: 'editor-quote',
        },
    }),
    Typography,
    LensTag.configure({
        HTMLAttributes: {
            class: 'editor-link',
        },
    }),
    Markdown.configure({
        transformPastedText: true,
    }),
];
