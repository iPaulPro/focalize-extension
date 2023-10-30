import type { Recipient } from '../stores/state-store';
import type { Erc20Fragment } from '@lens-protocol/client';

export interface CollectSettings {
    isCollectible?: boolean;
    price?: number;
    token?: Erc20Fragment;
    limit?: number;
    referralFee?: number;
    followerOnly?: boolean;
    timed?: boolean;
    durationInHours?: number;
    endDate?: string;
    recipients?: Recipient[];
}
