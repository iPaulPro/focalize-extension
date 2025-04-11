import type { Recipient } from '../stores/state-store';
import type { DateTime, Erc20 } from '@lens-protocol/client';

export interface CollectSettings {
    isCollectible?: boolean;
    price?: number;
    token?: Erc20;
    limit?: number;
    referralFee?: number;
    followerOnly?: boolean;
    timed?: boolean;
    durationInHours?: number;
    endDate?: DateTime;
    recipients?: Recipient[];
}
