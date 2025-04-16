import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';

import { readable } from 'svelte/store';
import type { PostDraft } from '../types/PostDraft';

export const KEY_POST_DRAFTS = 'postDrafts';

export const getDrafts = async (): Promise<Map<string, PostDraft> | undefined> => {
    const storage = await browser.storage.local.get(KEY_POST_DRAFTS);
    if (storage.postDrafts) {
        return new Map(JSON.parse(storage.postDrafts));
    }
    return undefined;
};

export const postDrafts = readable<Map<string, PostDraft>>(new Map(), (set) => {
    const listener = (changes: { [p: string]: chrome.storage.StorageChange }) => {
        if (changes.postDrafts) {
            set(new Map(JSON.parse(changes.postDrafts.newValue)));
        }
    };

    browser.storage.onChanged.addListener(listener);

    getDrafts().then((drafts) => {
        if (drafts) set(drafts);
    });

    return () => {
        browser.storage.onChanged.removeListener(listener);
    };
});

export const getDraft = async (id: string): Promise<PostDraft | undefined> => {
    const drafts = await getDrafts();
    return drafts?.get(id);
};

export const saveDraft = async (draft: PostDraft) => {
    const drafts: Map<string, PostDraft> = (await getDrafts()) ?? new Map();

    if (!draft.id) {
        draft.id = uuid();
    }

    draft.timestamp = DateTime.now().toMillis();

    drafts.set(draft.id, draft);

    await browser.storage.local.set({ [KEY_POST_DRAFTS]: JSON.stringify([...drafts]) });

    return draft;
};

export const deleteDraft = async (id: string) => {
    const drafts: Map<string, PostDraft> | undefined = await getDrafts();
    if (!drafts) return;

    drafts.delete(id);

    await browser.storage.local.set({ [KEY_POST_DRAFTS]: JSON.stringify([...drafts]) });
};
