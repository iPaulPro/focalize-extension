import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Typography } from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';

const PLACEHOLDER = "What's happening?";

export const extensions = [
    StarterKit.configure({
        blockquote: {
            HTMLAttributes: {
                class: 'editor-quote',
            },
        },
        bulletList: {
            HTMLAttributes: {
                class: 'list-disc pl-6',
            },
        },
        code: {
            HTMLAttributes: {
                class: 'editor-text-code',
            },
        },
        codeBlock: {
            HTMLAttributes: {
                class: 'editor-code',
            },
        },
        orderedList: {
            HTMLAttributes: {
                class: 'list-decimal pl-6',
            },
        },
    }),
    Placeholder.configure({
        placeholder: PLACEHOLDER,
    }),
    Link.configure({
        protocols: ['ipfs', 'ar', 'lens'],
        openOnClick: false,
        HTMLAttributes: {
            class: 'editor-link',
        },
    }),
    Typography,
    Markdown.configure({
        transformPastedText: true,
    }),
];
