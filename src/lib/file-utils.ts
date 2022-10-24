export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const SUPPORTED_MIME_TYPES = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/tiff',
    'image/webp',
    'image/x-ms-bmp',
    'video/ogg',
    'video/ogv',
    'video/mp4',
    'video/webm',
    'video/x-m4v'
]

export const supportedMimeTypesJoined = () => {
    return SUPPORTED_MIME_TYPES.join(',');
}