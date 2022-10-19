export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const SUPPORTED_MIME_TYPES = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/ogg',
    'video/mp4',
    'video/webm'
]

export const supportedMimeTypesJoined = () => {
    return SUPPORTED_MIME_TYPES.join(',');
}