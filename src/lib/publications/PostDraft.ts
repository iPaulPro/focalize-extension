import type { CollectSettings } from './CollectSettings';
import type { AnyMedia } from '@lens-protocol/metadata';

export type PostDraft = {
    id: string;
    title?: string;
    content?: string;
    description?: string;
    attachments?: AnyMedia[];
    author?: string;
    collectFee?: CollectSettings;
    timestamp?: number;
    tags?: string[];
    sharingLink?: string | null;
    // contentWarning?: PublicationContentWarning;
};
