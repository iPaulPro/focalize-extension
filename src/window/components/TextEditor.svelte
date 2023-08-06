<script lang="ts">
    import {
        $createParagraphNode as createParagraphNode,
        $getRoot as getRoot,
        $getSelection as getSelection,
        $isRangeSelection as isRangeSelection,
        createEditor,
        LineBreakNode,
        ParagraphNode,
        TextNode,
        COMMAND_PRIORITY_CRITICAL,
        COMMAND_PRIORITY_NORMAL,
        FORMAT_TEXT_COMMAND,
        KEY_MODIFIER_COMMAND,
        REDO_COMMAND,
        SELECTION_CHANGE_COMMAND,
        UNDO_COMMAND,
        type CreateEditorArgs,
        type GridSelection,
        type LexicalEditor,
        type NodeSelection,
        type RangeSelection,
        type EditorState,
    } from 'lexical';
    import {
        $convertFromMarkdownString as convertFromMarkdownString,
        $convertToMarkdownString as convertToMarkdownString,
        registerMarkdownShortcuts,
        CODE,
        QUOTE,
        TEXT_FORMAT_TRANSFORMERS,
        TEXT_MATCH_TRANSFORMERS,
    } from '@lexical/markdown';
    import {$createQuoteNode as createQuoteNode, QuoteNode, registerRichText} from '@lexical/rich-text';
    import {AutoLinkNode, LinkNode} from '@lexical/link';
    import {CodeNode} from '@lexical/code';
    import {$setBlocksType as setBlocksType} from '@lexical/selection';
    import {createEmptyHistoryState, registerHistory} from '@lexical/history';
    import {$canShowPlaceholder as canShowPlaceholder} from '@lexical/text';

    import {onMount} from 'svelte';

    import type {UpdateListener} from 'lexical/LexicalEditor';
    import type {Writable} from 'svelte/store';

    import FloatingEditorToolbar from './FloatingEditorToolbar.svelte';
    import {isSelectionLinkNode, isSelectionQuoteNode, isTextFormatType} from '../../lib/utils/lexical-utils';
    import LexicalTheme from '../../lib/editor/LexicalTheme';
    import FloatingLinkEditor from './FloatingLinkEditor.svelte';
    import Tribute, {type TributeItem} from 'tributejs';
    import {searchHandles} from '../../lib/user/search-handles';
    import {buildTributeUsernameMenuTemplate} from '../../lib/user/tribute-username-template';
    import {registerAutoLink} from '../../lib/editor/LexicalAutoLinkPlugin';
    import {HashtagNode} from '../../lib/editor/HashtagNode';
    import {registerHashtagPlugin} from '../../lib/editor/LexicalHashtagPlugin';
    import {MentionNode} from '../../lib/editor/MentionNode';
    import type {TextFormatType} from 'lexical/nodes/LexicalTextNode';
    import type {Profile} from '../../lib/graph/lens-service';
    import type {Action} from 'svelte/action';
    import {registerMentionPlugin} from '../../lib/editor/LexicalMentionPlugin';
    import {registerEmojiShortcodePlugin} from '../../lib/editor/LexicalEmojiShortcodePlugin';
    import {EmojiNode} from '../../lib/editor/EmojiNode';

    export let content: Writable<string | undefined>;
    export let disabled: boolean = false;
    export let isCompact: boolean;

    export const insertAtSelection = (text: string) => {
        editor.update(() => {
            const selection = getSelection();
            if (isRangeSelection(selection)) {
                selection.insertText(text);
            } else if (!selection) {
                const root = getRoot();
                const paragraphNode = createParagraphNode();
                const textNode = new TextNode(text);
                paragraphNode.append(textNode);
                root.append(paragraphNode);
            }
        });
    };

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
            HashtagNode,
            MentionNode,
            EmojiNode
        ]
    };

    const MARKDOWN_TRANSFORMERS = [CODE, QUOTE, ...TEXT_FORMAT_TRANSFORMERS, ...TEXT_MATCH_TRANSFORMERS];

    let editor: LexicalEditor;
    let editorElement: HTMLDivElement;
    let toolbarVisible = false;
    let linkEditorVisible = false;
    let selectionAnchor: DOMRect | undefined;
    let editorSelection: RangeSelection | undefined | null;
    let selectedBlockType: string | undefined;
    let showPlaceholder = true;

    const onCommand = (command: TextFormatType | string) => {
        editor.update(() => {
            const selection = getSelection();
            if (!selection || !isRangeSelection(selection)) {
                return;
            }

            if (isTextFormatType(command)) {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, command);
                return;
            }

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
                    throw new Error(`Unknown command: ${command}`);
            }

            editorSelection = selection;
        });
    };

    const onSelectionChange = (): boolean => {
        const selection: RangeSelection | NodeSelection | GridSelection | null = getSelection();

        const hideToolbarAndClearSelection = () => {
            toolbarVisible = false;
            editorSelection = undefined;
            selectedBlockType = undefined;
            linkEditorVisible = false;
        };

        if (!isRangeSelection(selection)) {
            hideToolbarAndClearSelection();
            return false;
        }

        editorSelection = selection;

        if (selection.isCollapsed()) {
            hideToolbarAndClearSelection();
        } else {
            const nativeSelection = window.getSelection();
            const activeElement = document.activeElement;
            if (nativeSelection?.anchorNode && nativeSelection?.focusNode && activeElement === editorElement) {
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

        return false;
    };

    $: if ($content) {
        editor.update(() => {
            const markdown = convertToMarkdownString(MARKDOWN_TRANSFORMERS);
            if ($content && $content !== markdown) {
                convertFromMarkdownString($content, MARKDOWN_TRANSFORMERS);
            }
        });
    }

    const registerHistoryKeyboardShortcuts = () => {
        editor.registerCommand(KEY_MODIFIER_COMMAND, (payload: KeyboardEvent) => {
            const event: KeyboardEvent = payload;
            const {code, ctrlKey, metaKey, shiftKey} = event;
            if (code === 'KeyZ' && (ctrlKey || metaKey)) {
                event.preventDefault();
                if (shiftKey) {
                    editor.dispatchCommand(REDO_COMMAND, undefined);
                } else {
                    editor.dispatchCommand(UNDO_COMMAND, undefined);
                }
            } else if (code === 'KeyY' && (ctrlKey || metaKey)) {
                event.preventDefault();
                editor.dispatchCommand(REDO_COMMAND, undefined);
            }
            return false;
        }, COMMAND_PRIORITY_NORMAL);
    };

    const tribute: Action = (node: HTMLElement) => {
        const plainTextTribute = new Tribute<Profile>({
            values: (text, cb) => searchHandles(text, isCompact ? 4 : 5, cb),
            menuItemTemplate: (item: TributeItem<Profile>) => buildTributeUsernameMenuTemplate(item),
            fillAttr: 'handle',
            lookup: 'handle',
        });

        plainTextTribute.attach(node);

        return {
            destroy() {
                plainTextTribute.detach(node);
            }
        }
    };

    const onEditorStateUpdate = ({editorState}: {editorState: EditorState}): UpdateListener => {
        editorState.read(() => {
            $content = convertToMarkdownString(MARKDOWN_TRANSFORMERS);
            showPlaceholder = canShowPlaceholder(editor.isComposing());
        });
        return () => {};
    }

    onMount(() => {
        editor = createEditor(config);

        editor.registerCommand(SELECTION_CHANGE_COMMAND, onSelectionChange, COMMAND_PRIORITY_CRITICAL);
        editor.setRootElement(editorElement);
        registerAutoLink(editor);
        registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
        registerRichText(editor);
        registerHashtagPlugin(editor)
        registerHistory(editor, createEmptyHistoryState(), 1000);
        registerMentionPlugin(editor);
        registerEmojiShortcodePlugin(editor);
        registerHistoryKeyboardShortcuts();

        return editor.registerUpdateListener(onEditorStateUpdate);
    });
</script>

<div class="w-full relative {isCompact ? 'text-lg' : 'text-xl'}">
  <div bind:this={editorElement}
       contenteditable="true" role="textbox"
       class="text-editor">
  </div>

  {#if showPlaceholder}
    <div class="absolute top-0 text-gray-400 dark:text-gray-500 pointer-events-none">
      What's happening...
    </div>
  {/if}
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
    @apply w-full min-h-[10rem] bg-transparent
    overflow-hidden break-keep [overflow-wrap:anywhere]
    border-none resize-none focus:outline-none focus:ring-0 focus:border-none
  }

  .text-editor > * {
    margin-bottom: 1.75rem;
  }

  .compact .text-editor > * {
    margin-bottom: 1.25rem;
  }
</style>