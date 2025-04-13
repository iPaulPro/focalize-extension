import { MetadataAttribute } from '@lens-protocol/metadata';

export type EditAccountInput = {
    bio: string | undefined;
    coverPicture: string | undefined;
    name: string | undefined;
    picture: string | undefined;
    attributes: MetadataAttribute[] | undefined;
};
