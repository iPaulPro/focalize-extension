import type {
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
} from '@lens-protocol/client';

const hasMetadata = (
    publication: CommentFragment | PostFragment | QuoteFragment
): publication is
    | (CommentFragment & { metadata: any })
    | (PostFragment & { metadata: any })
    | (QuoteFragment & { metadata: any }) => publication.metadata !== undefined;

const isPublicationWithMetadata = (
    publication: CommentFragment | PostFragment | QuoteFragment,
    metadataType: string
) => publication.metadata.__typename === metadataType;

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
        isTextOnlyPublication(publication)
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
