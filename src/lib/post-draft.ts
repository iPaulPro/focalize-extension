import type {PublicationMetadataMediaInput} from './graph/lens-service';
import type {CollectSettings} from './collect-settings';

export type PostDraft = {
    id?: string,
    title?: string,
    content?: string,
    description?: string,
    attachments?: PublicationMetadataMediaInput[],
    author?: string,
    collectFee?: CollectSettings,
    timestamp?: number,
};