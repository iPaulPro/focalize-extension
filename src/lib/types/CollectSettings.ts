import type { Recipient } from '../stores/state-store';
import type { DateTime, Erc20, NativeToken } from '@lens-protocol/client';

export interface CollectSettings {
    isCollectible?: boolean;
    price?: number;
    token?: Erc20 | NativeToken;
    limit?: number;
    referralFee?: number;
    followerOnly?: boolean;
    timed?: boolean;
    durationInHours?: number;
    endDate?: DateTime;
    recipients?: Recipient[];
}
