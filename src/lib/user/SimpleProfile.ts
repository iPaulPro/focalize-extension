import type { ProfileFragment } from '@lens-protocol/client';

export type SimpleProfile = {
    id: string;
    ownedBy: string;
    ens?: string | null;
    handle?: string;
    displayName?: string | null;
};

export const toSimpleProfile = (profile: ProfileFragment): SimpleProfile => ({
    id: profile.id,
    ownedBy: profile.ownedBy.address,
    ens: profile.onchainIdentity?.ens?.name,
    handle: profile.handle?.fullHandle,
    displayName: profile.metadata?.displayName,
});
