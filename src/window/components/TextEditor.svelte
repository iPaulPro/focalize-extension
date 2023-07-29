<script lang="ts">
    import {
        type CreateEditorArgs,
        LexicalEditor, RangeSelection, NodeSelection, GridSelection, LineBreakNode, ParagraphNode, TextNode,
        createEditor, $getSelection as getSelection, $isRangeSelection as isRangeSelection,
        $createParagraphNode as createParagraphNode,
        SELECTION_CHANGE_COMMAND, FORMAT_TEXT_COMMAND, COMMAND_PRIORITY_CRITICAL, COMMAND_PRIORITY_NORMAL,
        KEY_MODIFIER_COMMAND, UNDO_COMMAND, REDO_COMMAND
    } from 'lexical';
    import {
        $convertFromMarkdownString as convertFromMarkdownString, $convertToMarkdownString as convertToMarkdownString,
        registerMarkdownShortcuts,
        TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS, CODE, QUOTE,
    } from '@lexical/markdown';
    import {
        QuoteNode,
        registerRichText, $createQuoteNode as createQuoteNode
    } from '@lexical/rich-text';
    import {LinkNode, AutoLinkNode} from '@lexical/link';
    import {CodeNode} from '@lexical/code';
    import {$setBlocksType as setBlocksType} from '@lexical/selection';
    import {createEmptyHistoryState, registerHistory} from '@lexical/history';

    import {onMount} from 'svelte';

    import type {UpdateListener} from 'lexical/LexicalEditor';
    import type {Writable} from 'svelte/store';

    import FloatingEditorToolbar from './FloatingEditorToolbar.svelte';
    import {isSelectionLinkNode, isSelectionQuoteNode} from '../../lib/utils/lexical-utils';
    import LexicalTheme from './LexicalTheme';
    import FloatingLinkEditor from './FloatingLinkEditor.svelte';
    import {getSelectedNode} from '../../lib/utils/get-selected-node';
    import Tribute from 'tributejs';
    import {searchHandles} from '../../lib/user/search-handles';
    import {buildTributeUsernameMenuTemplate} from '../../lib/user/tribute-username-template';
    import {buildLoadingItemTemplate} from '../../lib/user/tribute-loading-template';

    export let content: Writable<string>;
    export let disabled: boolean = false;
    export let isCompact: boolean;

    const config: CreateEditorArgs = {
        namespace: 'Focalize',
        theme: LexicalTheme,
        onError: console.error,
        nodes: [
            LineBreakNode,
            ParagraphNode,
            TextNode,
            LinkNode,
            QuoteNode,
            CodeNode,
            AutoLinkNode,
        ]
    };

    const MARKDOWN_TRANSFORMERS = [CODE, QUOTE, ...TEXT_FORMAT_TRANSFORMERS, ...TEXT_MATCH_TRANSFORMERS];

    let editor: LexicalEditor;
    let editorElement: HTMLDivElement;
    let removeUpdateListener: UpdateListener;
    let toolbarVisible = false;
    let linkEditorVisible = false;
    let selectionAnchor: DOMRect | undefined;
    let editorSelection: RangeSelection | undefined;
    let selectedBlockType: string;
    let selectedNode: TextNode | undefined;

    const onCommand = (command: string) => {
        editor.update(() => {
            const selection = getSelection();

            switch (command) {
                case 'quote':
                    if (isSelectionQuoteNode(selection)) {
                        setBlocksType(selection, () => createParagraphNode());
                    } else {
                        setBlocksType(selection, () => createQuoteNode());
                    }
                    break;

                case 'link':
                    linkEditorVisible = true;
                    toolbarVisible = false;
                    break;

                default:
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, command);
            }

            editorSelection = selection;
        });
    };

    const onSelectionChange = () => {
        const selection: RangeSelection | NodeSelection | GridSelection = getSelection(editor);

        const hideToolbarAndClearSelection = () => {
            toolbarVisible = false;
            editorSelection = undefined;
            selectedBlockType = undefined;
            linkEditorVisible = false;
        };

        if (!isRangeSelection(selection)) {
            hideToolbarAndClearSelection();
            return;
        }

        editorSelection = selection;
        selectedNode = getSelectedNode(selection);

        if (selection.isCollapsed()) {
            hideToolbarAndClearSelection();
        } else {
            const nativeSelection = window.getSelection();
            const activeElement = document.activeElement;
            if (activeElement === editorElement) {
                const range = document.createRange();
                range.setStart(nativeSelection.anchorNode, nativeSelection.anchorOffset);
                range.setEnd(nativeSelection.focusNode, nativeSelection.focusOffset);
                const rects: DOMRectList = range.getClientRects();
                selectionAnchor = rects[0];

                if (isSelectionLinkNode(selection)) {
                    linkEditorVisible = true;
                    toolbarVisible = false;
                } else {
                    toolbarVisible = true;
                }
            }
        }

        if (isSelectionQuoteNode(selection)) {
            selectedBlockType = 'quote';
        } else if (isSelectionLinkNode(selection)) {
            selectedBlockType = 'link';
        } else {
            selectedBlockType = 'paragraph';
        }
    };

    $: if ($content) {
        editor.update(() => {
            const markdown = convertToMarkdownString(MARKDOWN_TRANSFORMERS);
            if ($content !== markdown) {
                convertFromMarkdownString($content, MARKDOWN_TRANSFORMERS);
                console.log('content updated');
            }
        });
    }

    const registerHistoryKeyboardShortcuts = () => {
        editor.registerCommand(KEY_MODIFIER_COMMAND, (payload) => {
            const event: KeyboardEvent = payload;
            const {code, ctrlKey, metaKey, shiftKey} = event;
            if (code === 'KeyZ' && (ctrlKey || metaKey)) {
                event.preventDefault();
                if (shiftKey) {
                    editor.dispatchCommand(REDO_COMMAND);
                } else {
                    editor.dispatchCommand(UNDO_COMMAND);
                }
            } else if (code === 'KeyY' && (ctrlKey || metaKey)) {
                event.preventDefault();
                editor.dispatchCommand(REDO_COMMAND);
            }
        }, COMMAND_PRIORITY_NORMAL);
    };

    const tribute = async (node) => {
        const plainTextTribute = new Tribute({
            values: (text, cb) => searchHandles(text, isCompact ? 4 : 5, cb),
            menuItemTemplate: (item) => buildTributeUsernameMenuTemplate(item),
            loadingItemTemplate: buildLoadingItemTemplate(),
            fillAttr: 'handle',
            lookup: 'handle',

        })

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            }
        }
    };

    onMount(() => {
        editor = createEditor(config);

        removeUpdateListener = editor.registerUpdateListener(({editorState}) => {
            editorState.read(() => {
                const markdown = convertToMarkdownString(MARKDOWN_TRANSFORMERS);
                if (markdown && content) {
                    $content = markdown;
                }
            });
        });

        editor.registerCommand(SELECTION_CHANGE_COMMAND, onSelectionChange, COMMAND_PRIORITY_CRITICAL);
        editor.setRootElement(editorElement);
        registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
        registerRichText(editor);
        registerHistory(editor, createEmptyHistoryState(), 1000);
        registerHistoryKeyboardShortcuts();

        return {
            destroy() {
                removeUpdateListener?.();
            }
        };
    });
</script>

<div bind:this={editorElement}
     contenteditable="true" role="textbox"
     use:tribute
     class="text-editor">
</div>

<FloatingEditorToolbar
    isVisible={toolbarVisible}
    anchor={selectionAnchor}
    selection={editorSelection}
    blockType={selectedBlockType}
    on:command={(e) => onCommand(e.detail)}/>

<FloatingLinkEditor
    {editor}
    isVisible={linkEditorVisible}
    anchor={selectionAnchor}/>

<style global>
  .text-editor {
    @apply w-full min-h-[10rem] bg-transparent pt-4 pr-3 pl-2
    overflow-hidden break-keep [overflow-wrap:anywhere]
    text-black dark:text-white text-lg
    border-none resize-none focus:outline-none focus:ring-0 focus:border-none
  }

  .text-editor > * {
    margin-bottom: 1.75rem;
  }

  .compact .text-editor > * {
    margin-bottom: 1.25rem;
  }
</style>