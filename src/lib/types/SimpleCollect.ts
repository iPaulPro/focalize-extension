import { DateTime, EvmAddress } from '@lens-protocol/client';

export type Erc20Input = {
    value: string;
    currency: EvmAddress;
};

export type Recipient = {
    percent: number;
    address: EvmAddress;
};

export type SimpleCollect = {
    isImmutable?: boolean | null | undefined;
    endsAt?: DateTime | null | undefined;
    followerOnGraph?:
        | {
              globalGraph: true;
          }
        | {
              graph: EvmAddress;
          }
        | null
        | undefined;
    collectLimit?: number | null | undefined;
    payToCollect?: {
        referralShare?: number | null | undefined;
        recipients: Recipient[];
        erc20?: Erc20Input;
        native?: string;
    };
};
