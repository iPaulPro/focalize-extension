import type {Erc20} from '../graph/lens-service';
import type {Recipient} from '../stores/state-store';

export interface CollectSettings {
    isCollectible?: boolean;
    price?: number;
    token?: Erc20;
    limit?: number;
    referralFee?: number;
    followerOnly?: boolean;
    timed?: boolean;
    durationInHours?: number;
    endDate?: string;
    recipients?: Recipient[];
}