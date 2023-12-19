export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const IMAGE_TYPES = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/tiff',
    'image/webp',
    'image/x-ms-bmp',
];

export const AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/ogg'];

export const VIDEO_TYPES = [
    'video/ogg',
    'video/ogv',
    'video/mp4',
    'video/webm',
    'video/x-m4v',
];

export const THREE_D_TYPES = [
    'model/gltf+json',
    'model/gltf-binary',
    // 'text/plain' could be used for OBJ, but it's very generic
];

export const SUPPORTED_MIME_TYPES = [
    ...AUDIO_TYPES,
    ...VIDEO_TYPES,
    ...IMAGE_TYPES,
    ...THREE_D_TYPES,
];

export const supportedMimeTypesJoined = () => {
    return SUPPORTED_MIME_TYPES.join(',');
};

export const imageMimeTypesJoined = () => {
    return IMAGE_TYPES.join(',');
};

export const isThreeDFile = (file: File): boolean => {
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    return fileExtension === 'gltf' || fileExtension === 'glb';
};

export const isUnsupportedTreeDFile = (file: File): boolean => {
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    return (
        fileExtension === 'obj' ||
        fileExtension === 'fbx' ||
        fileExtension === 'vrm'
    );
};
