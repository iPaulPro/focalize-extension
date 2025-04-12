import { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { type Group, mainnet, PageSize, PublicClient, staging } from '@lens-protocol/client';
import GroupAutocompleteList from '@/lib/components/GroupAutocompleteList.svelte';
import tippy, { type Instance } from 'tippy.js';
import BuiltInMention, { MentionOptions } from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';
import { getCached, KEY_GROUPS_CACHE, saveToCache } from '@/lib/stores/cache-store';
import { fetchGroups } from '@lens-protocol/client/actions';
import { isMainnet } from '@/lib/config';

const PLUGIN_NAME = 'group-mention';

const GroupMentionPluginKey = new PluginKey(PLUGIN_NAME);

const client = PublicClient.create({
    environment: isMainnet ? mainnet : staging,
});

const suggestion = {
    char: '#',
    pluginKey: GroupMentionPluginKey,
    items: async ({ query }: { query: string }): Promise<Group[]> => {
        if (query.length < 2 || query.startsWith('0x')) return [];

        const groups = await fetchGroups(client, {
            filter: {
                searchQuery: query,
            },
            pageSize: PageSize.Ten,
        });
        if (groups.isOk()) {
            return [...groups.value.items].toSpliced(0, 4);
        }

        return [];
    },
    command: async ({ editor, range, props }: { editor: any; range: any; props: any }) => {
        // increase range.to by one when the next node is of type "text"
        // and starts with a space character
        const nodeAfter = editor.view.state.selection.$to.nodeAfter;
        const overrideSpace = nodeAfter?.text?.startsWith(' ');

        if (overrideSpace) {
            range.to += 1;
        }

        editor
            .chain()
            .focus()
            .insertContentAt(range, [
                {
                    type: PLUGIN_NAME,
                    attrs: props,
                },
                {
                    type: 'text',
                    text: ' ',
                },
            ])
            .run();

        // get reference to `window` object from editor element, to support cross-frame JS usage
        editor.view.dom.ownerDocument.defaultView?.getSelection()?.collapseToEnd();

        let groupCache = await getCached<any>(KEY_GROUPS_CACHE);
        if (!groupCache) {
            groupCache = {};
        }
        groupCache[props.id] = props.label;
        await saveToCache(KEY_GROUPS_CACHE, groupCache);
    },
    render: () => {
        const container = document.createElement('div');
        let component: GroupAutocompleteList | undefined;
        let popup: Instance[];

        return {
            onStart: (props: SuggestionProps<Group, any>) => {
                component = new GroupAutocompleteList({
                    target: container,
                    props,
                });

                const getPropRect = (): DOMRect => {
                    const rect = props.clientRect?.();
                    return rect ?? new DOMRect();
                };

                popup = tippy('body', {
                    getReferenceClientRect: getPropRect,
                    allowHTML: true,
                    content: container,
                    interactive: true,
                    showOnCreate: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                    arrow: false,
                    theme: 'mentions',
                });
            },

            onUpdate(props: SuggestionProps<Group, any>) {
                component?.$set(props);

                const getPropRect = (): DOMRect => {
                    const rect = props.clientRect?.();
                    return rect ?? new DOMRect();
                };

                popup[0].setProps({
                    getReferenceClientRect: getPropRect,
                });
            },

            onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();

                    return true;
                }

                return component?.onKeyDown(props.event) ?? false;
            },

            onExit() {
                popup[0].destroy();
                component?.$destroy();
            },
        };
    },
};

interface GroupMentionOptions extends MentionOptions {
    groups: Map<string, string>;
}

export const GroupMention = BuiltInMention.extend<GroupMentionOptions>({
    name: PLUGIN_NAME,
    addOptions() {
        return {
            ...this.parent?.(),
            groups: new Map<string, string>(),
        };
    },
    addStorage() {
        let groups = this.options.groups;
        if (!(groups instanceof Map)) {
            groups = new Map(Object.entries(groups));
        }
        return {
            markdown: {
                serialize(state: any, node: any) {
                    state.write(`#${node.attrs.id}`);
                },
                parse: {
                    updateDOM(element: HTMLBodyElement) {
                        const pattern = /#(0x[a-fA-F0-9]{40})/g;
                        element.innerHTML = element.innerHTML.replace(
                            pattern,
                            (match: string, address: string): string => {
                                const groupName = groups.get(address);
                                if (!groupName) return match;
                                return `
                                    <span class="editor-link" 
                                          data-type="group-mention"
                                          data-id="${address}"
                                          data-label="${groupName}">
                                        #${groupName}
                                    </span>
                                `;
                            },
                        );
                    },
                },
            },
        };
    },
}).configure({
    HTMLAttributes: {
        class: 'editor-link',
    },
    suggestion,
});
