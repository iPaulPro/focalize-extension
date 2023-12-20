import type { CollectSettings } from './CollectSettings';
import type {
    MediaAudio,
    MediaVideo,
    MediaImage,
    ThreeDAsset,
} from '@lens-protocol/metadata';

export type PostDraft = {
    id: string;
    title?: string;
    content?: string;
    description?: string;
    // attachments?: AnyMedia[];
    image: MediaImage;
    audio?: MediaAudio;
    video?: MediaVideo;
    threeDAsset?: ThreeDAsset;
    author?: string;
    album?: string;
    date?: string;
    collectFee?: CollectSettings;
    timestamp?: number;
    tags?: string[];
    sharingLink?: string | null;
    cover?: string;
    // contentWarning?: PublicationContentWarning;
};
