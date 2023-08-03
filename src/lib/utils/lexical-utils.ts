import {type RangeSelection, $isRangeSelection as isRangeSelection} from 'lexical';
import {getSelectedNode} from './get-selected-node';
import {$isQuoteNode as isQuoteNode} from '@lexical/rich-text';
import {$isLinkNode as isLinkMode} from '@lexical/link';
import type {TextFormatType} from 'lexical/nodes/LexicalTextNode';

export const isSelectionQuoteNode = (selection: RangeSelection): boolean => {
    if (selection && isRangeSelection(selection)) {
        const node = getSelectedNode(selection);
        if (!node) return false;

        const parent = node.getParent();
        return isQuoteNode(parent) || isQuoteNode(node);
    }

    return false;
};

export const isSelectionLinkNode = (selection: RangeSelection): boolean => {
    if (selection && isRangeSelection(selection)) {
        const node = getSelectedNode(selection);
        if (!node) return false;

        const parent = node.getParent();
        return isLinkMode(parent) || isLinkMode(node);
    }

    return false;
};

export const isTextFormatType = (value: string): value is TextFormatType =>
    ['bold', 'underline', 'strikethrough', 'italic', 'highlight', 'code', 'subscript', 'superscript'].includes(value);