import { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { type Account, mainnet, PageSize, PublicClient, staging } from '@lens-protocol/client';
import { fetchAccounts } from '@lens-protocol/client/actions';
import AccountAutocompleteList from '@/lib/components/AccountAutocompleteList.svelte';
import tippy, { type Instance } from 'tippy.js';
import BuiltInMention from '@tiptap/extension-mention';
import { isMainnet } from '@/lib/config';

const client = PublicClient.create({
    environment: isMainnet ? mainnet : staging,
});

const suggestion = {
    items: async ({ query }: { query: string }): Promise<Account[]> => {
        if (query.length < 2) return [];

        const accounts = await fetchAccounts(client, {
            filter: {
                searchBy: {
                    localNameQuery: query,
                },
            },
            pageSize: PageSize.Ten,
        });
        if (accounts.isOk()) {
            return [...accounts.value.items].splice(0, 4);
        }

        return [];
    },
    render: () => {
        const container = document.createElement('div');
        let component: AccountAutocompleteList | undefined;
        let popup: Instance[];

        return {
            onStart: (props: SuggestionProps<Account, any>) => {
                component = new AccountAutocompleteList({
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

            onUpdate(props: SuggestionProps<Account, any>) {
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

export const AccountMention = BuiltInMention.extend({
    addStorage() {
        return {
            markdown: {
                serialize(state: any, node: any) {
                    state.write(`@${node.attrs.id}`);
                },
                parse: {
                    updateDOM(element: HTMLBodyElement) {
                        const pattern = /@(lens\/([a-zA-Z0-9_]+))/g;
                        element.innerHTML = element.innerHTML.replace(
                            pattern,
                            (match: string, full: string, username: string): string => {
                                return `
                                    <span class="editor-link" 
                                          data-type="mention"
                                          data-id="${full}"
                                          data-label="${username}">
                                        @${username}
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
