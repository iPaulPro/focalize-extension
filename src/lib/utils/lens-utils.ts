import type {
    AnyPublicationFragment,
    ArticleMetadataV3Fragment,
    AudioMetadataV3Fragment,
    CheckingInMetadataV3Fragment,
    CommentFragment,
    EmbedMetadataV3Fragment,
    EventMetadataV3Fragment,
    ImageMetadataV3Fragment,
    LinkMetadataV3Fragment,
    LiveStreamMetadataV3Fragment,
    MintMetadataV3Fragment,
    NotificationFragment,
    PostFragment,
    QuoteFragment,
    SpaceMetadataV3Fragment,
    StoryMetadataV3Fragment,
    TextOnlyMetadataV3Fragment,
    ThreeDMetadataV3Fragment,
    TransactionMetadataV3Fragment,
    VideoMetadataV3Fragment,
    AnyPublicationMetadataFragment,
} from '@lens-protocol/client';
import {
    type AnyMedia,
    type MediaAudio,
    type MediaImage,
    type MediaVideo,
    type PublicationMetadata,
    type EncryptableURI,
    MediaAudioMimeType,
    MediaImageMimeType,
    MediaVideoMimeType,
    PublicationSchemaId,
} from '@lens-protocol/metadata';
import { MENTION_REGEX } from '../editor/LexicalMentionPlugin';

export const hasMetadata = (
    publication: AnyPublicationFragment
): publication is
    | (CommentFragment & { metadata: AnyPublicationMetadataFragment })
    | (PostFragment & { metadata: AnyPublicationMetadataFragment })
    | (QuoteFragment & { metadata: AnyPublicationMetadataFragment }) => {
    if ('metadata' in publication) {
        return publication.metadata !== undefined;
    }
    return false;
};

const isPublicationWithMetadata = (
    publication: CommentFragment | PostFragment | QuoteFragment,
    metadataType: string
): boolean => publication.metadata.__typename === metadataType;

export const isArticlePublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: ArticleMetadataV3Fragment })
    | (PostFragment & { metadata: ArticleMetadataV3Fragment })
    | (QuoteFragment & { metadata: ArticleMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'ArticleMetadataV3');

export const isAudioPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: AudioMetadataV3Fragment })
    | (PostFragment & { metadata: AudioMetadataV3Fragment })
    | (QuoteFragment & { metadata: AudioMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'AudioMetadataV3');

export const isCheckingInPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: CheckingInMetadataV3Fragment })
    | (PostFragment & { metadata: CheckingInMetadataV3Fragment })
    | (QuoteFragment & { metadata: CheckingInMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'CheckingInMetadataV3');

export const isEmbedPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: EmbedMetadataV3Fragment })
    | (PostFragment & { metadata: EmbedMetadataV3Fragment })
    | (QuoteFragment & { metadata: EmbedMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'EmbedMetadataV3');

export const isEventPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: EventMetadataV3Fragment })
    | (PostFragment & { metadata: EventMetadataV3Fragment })
    | (QuoteFragment & { metadata: EventMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'EventMetadataV3');

export const isImagePublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: ImageMetadataV3Fragment })
    | (PostFragment & { metadata: ImageMetadataV3Fragment })
    | (QuoteFragment & { metadata: ImageMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'ImageMetadataV3');

export const isLinkPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: LinkMetadataV3Fragment })
    | (PostFragment & { metadata: LinkMetadataV3Fragment })
    | (QuoteFragment & { metadata: LinkMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'LinkMetadataV3');

export const isLiveStreamPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: LiveStreamMetadataV3Fragment })
    | (PostFragment & { metadata: LiveStreamMetadataV3Fragment })
    | (QuoteFragment & { metadata: LiveStreamMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'LiveStreamMetadataV3');

export const isMintPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: MintMetadataV3Fragment })
    | (PostFragment & { metadata: MintMetadataV3Fragment })
    | (QuoteFragment & { metadata: MintMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'MintMetadataV3');

export const isSpacePublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: SpaceMetadataV3Fragment })
    | (PostFragment & { metadata: SpaceMetadataV3Fragment })
    | (QuoteFragment & { metadata: SpaceMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'SpaceMetadataV3');

export const isStoryPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: StoryMetadataV3Fragment })
    | (PostFragment & { metadata: StoryMetadataV3Fragment })
    | (QuoteFragment & { metadata: StoryMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'StoryMetadataV3');

export const isTextOnlyPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: TextOnlyMetadataV3Fragment })
    | (PostFragment & { metadata: TextOnlyMetadataV3Fragment })
    | (QuoteFragment & { metadata: TextOnlyMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'TextOnlyMetadataV3');

export const isThreeDPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: ThreeDMetadataV3Fragment })
    | (PostFragment & { metadata: ThreeDMetadataV3Fragment })
    | (QuoteFragment & { metadata: ThreeDMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'ThreeDMetadataV3');

export const isTransactionPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: TransactionMetadataV3Fragment })
    | (PostFragment & { metadata: TransactionMetadataV3Fragment })
    | (QuoteFragment & { metadata: TransactionMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'TransactionMetadataV3');

export const isVideoPublication = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: VideoMetadataV3Fragment })
    | (PostFragment & { metadata: VideoMetadataV3Fragment })
    | (QuoteFragment & { metadata: VideoMetadataV3Fragment }) =>
    isPublicationWithMetadata(publication, 'VideoMetadataV3');

export const getMetadataContent = (
    publication: CommentFragment | PostFragment | QuoteFragment
): string | undefined => {
    if (
        isArticlePublication(publication) ||
        isAudioPublication(publication) ||
        isCheckingInPublication(publication) ||
        isEmbedPublication(publication) ||
        isLinkPublication(publication) ||
        isLiveStreamPublication(publication) ||
        isMintPublication(publication) ||
        isSpacePublication(publication) ||
        isStoryPublication(publication) ||
        isTextOnlyPublication(publication) ||
        isThreeDPublication(publication) ||
        isTransactionPublication(publication)
    ) {
        return publication.metadata.content;
    }

    return undefined;
};

export const getNotificationPublication = (
    notification: NotificationFragment
): CommentFragment | PostFragment | QuoteFragment | undefined => {
    switch (notification.__typename) {
        case 'CommentNotification':
            return notification.comment;
        case 'MentionNotification':
            return notification.publication;
        case 'MirrorNotification':
            return notification.publication;
        case 'QuoteNotification':
            return notification.quote;
        case 'ReactionNotification':
            return notification.publication;
    }
    return undefined;
};

export const getMediaImageMimeType = (mimeType: string): MediaImageMimeType => {
    switch (mimeType) {
        case 'image/bmp':
            return MediaImageMimeType.BMP;
        case 'image/gif':
            return MediaImageMimeType.GIF;
        case 'image/heic':
            return MediaImageMimeType.HEIC;
        case 'image/jpeg':
            return MediaImageMimeType.JPEG;
        case 'image/png':
            return MediaImageMimeType.PNG;
        case 'image/svg+xml':
            return MediaImageMimeType.SVG_XML;
        case 'image/webp':
            return MediaImageMimeType.WEBP;
        case 'image/x-ms-bmp':
            return MediaImageMimeType.X_MS_BMP;
        default:
            throw new Error(`Unsupported image mime type: ${mimeType}`);
    }
};

export const getMediaVideoMimeType = (mimeType: string): MediaVideoMimeType => {
    switch (mimeType) {
        case 'model/gltf+json':
            return MediaVideoMimeType.GLTF;
        case 'model/gltf-binary':
            return MediaVideoMimeType.GLTF_BINARY;
        case 'video/m4v':
            return MediaVideoMimeType.M4V;
        case 'video/mov':
            return MediaVideoMimeType.MOV;
        case 'video/mp4':
            return MediaVideoMimeType.MP4;
        case 'video/mpeg':
            return MediaVideoMimeType.MPEG;
        case 'video/ogg':
            return MediaVideoMimeType.OGG;
        case 'video/ogv':
            return MediaVideoMimeType.OGV;
        case 'video/quicktime':
            return MediaVideoMimeType.QUICKTIME;
        case 'video/webm':
            return MediaVideoMimeType.WEBM;
        default:
            throw new Error(`Unsupported video mime type: ${mimeType}`);
    }
};

export const isAudioMedia = (media: AnyMedia): media is MediaAudio =>
    Object.values(MediaAudioMimeType).includes(
        media.type as MediaAudioMimeType
    );

export const isVideoMedia = (media: AnyMedia): media is MediaVideo =>
    Object.values(MediaVideoMimeType).includes(
        media.type as MediaVideoMimeType
    );

export const isImageMedia = (media: AnyMedia): media is MediaImage =>
    Object.values(MediaImageMimeType).includes(
        media.type as MediaImageMimeType
    );

export const getCoverFromMetadata = (
    metadata: PublicationMetadata
): EncryptableURI | undefined => {
    switch (metadata.$schema) {
        case PublicationSchemaId.AUDIO_LATEST:
            return metadata.lens.audio.cover;
        case PublicationSchemaId.VIDEO_LATEST:
            return metadata.lens.video.cover;
    }
    return undefined;
};

/**
 * Format a handle from domain/local to local.domain
 * @param handle The handle to format
 */
export const formatHandleV2toV1 = (handle: string): string => {
    const handleParts = handle.split('/');
    if (handleParts.length === 2) {
        return `${handleParts[1]}.${handleParts[0]}`;
    }
    return handle;
};

/**
 * Format a handle from local.domain to domain/local
 * @param handle The handle to format
 */
export const formatHandleV1toV2 = (handle: string): string => {
    // format the handle from paulburke.lens to lens/paulburke
    const match = handle.match(MENTION_REGEX);
    if (!match) return handle;

    const [, , , localName, domain] = match;
    return `@${domain}/${localName}`;
};
