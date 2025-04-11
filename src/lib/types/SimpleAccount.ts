import type { Account } from '@lens-protocol/client';

export type SimpleAccount = {
    address: string;
    ownedBy: string;
    ens?: string | null;
    username?: string;
    displayName?: string | null;
};

export const toSimpleAccount = (account: Account): SimpleAccount => ({
    address: account.address,
    ownedBy: account.owner,
    // ens: account.owner.ens?.name,
    username: account.username?.value,
    displayName: account.metadata?.name,
});
