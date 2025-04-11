import { DateTime } from 'luxon';
import type { CollectSettings } from '../types/CollectSettings';
import { bigDecimal, DateTime as LensDateTime, evmAddress } from '@lens-protocol/client';
import type { AmountInput, Recipient, SimpleCollect } from '@/lib/types/SimpleCollect';
import { ContentWarning } from '@lens-protocol/metadata';

export type SelectOption<Type> = {
    value: Type;
    label: string;
    summary?: string;
    icon?: string;
};

export const REFERENCE_ITEMS: SelectOption<boolean | undefined>[] = [
    {
        value: false,
        label: 'Everyone can reply',
        summary: 'Any Lens user can comment and share',
        icon: 'earth',
    },
    {
        value: true,
        label: 'Followers only',
        summary: 'Only your followers can comment and share',
        icon: 'followers',
    },
];

export const CONTENT_WARNING_ITEMS: SelectOption<ContentWarning | null>[] = [
    { value: null, label: 'No content warning' },
    { value: ContentWarning.NSFW, label: 'NSFW' },
    { value: ContentWarning.SPOILER, label: 'Spoiler' },
    { value: ContentWarning.SENSITIVE, label: 'Sensitive' },
];

export const COLLECT_DURATION_ITEMS: SelectOption<number>[] = [
    { value: 0, label: 'Custom' },
    { value: 1, label: '1 hour' },
    { value: 6, label: '6 hours' },
    { value: 24, label: '1 day' },
    { value: 72, label: '3 days' },
    { value: 168, label: '1 week' },
];

export const collectSettingsToModuleInput = (
    address: string,
    collectSettings: CollectSettings,
): SimpleCollect | null => {
    if (!address) {
        throw new Error('Address must be provided');
    }

    if (collectSettings.price && !collectSettings.token) {
        throw new Error('Token must be provided with price');
    }

    if (!collectSettings.isCollectible) {
        return null;
    }

    const getEndTimestamp = (): LensDateTime | null => {
        if (collectSettings.durationInHours && collectSettings.durationInHours > 0) {
            return DateTime.utc()
                .plus({ hours: collectSettings.durationInHours })
                .toISO() as LensDateTime;
        } else if (collectSettings.endDate && DateTime.fromISO(collectSettings.endDate).isValid) {
            return collectSettings.endDate;
        }
        return null;
    };

    let amount: AmountInput | null = null;
    if (collectSettings.price && collectSettings.token) {
        amount = {
            currency: collectSettings.token.contract.address,
            value: bigDecimal(String(collectSettings.price)),
        };
    }

    const recipients: Recipient[] = [];
    if (collectSettings.recipients?.length) {
        if (collectSettings.recipients?.length) {
            collectSettings.recipients.forEach((recipient) => {
                recipients.push({
                    address: recipient.address,
                    percent: recipient.split,
                } as Recipient);
            });
        }
        const totalSplit: number = recipients.reduce(
            (acc: number, recipient: Recipient) => acc + recipient.percent,
            0,
        );
        if (totalSplit !== 100) {
            throw new Error('Total revenue split must equal 100%');
        }
    }

    if (amount && recipients.length > 0) {
        const input: SimpleCollect = {
            payToCollect: {
                amount,
                recipients,
            },
            ...(collectSettings.followerOnly && {
                followerOnGraph: {
                    globalGraph: true,
                },
            }),
        };
        if (input.payToCollect && collectSettings.referralFee) {
            input.payToCollect.referralShare = collectSettings.referralFee;
        }
        if (collectSettings.limit) {
            input.collectLimit = collectSettings.limit;
        }
        if (collectSettings.timed) {
            input.endsAt = getEndTimestamp();
        }
        return input;
    }

    const input: SimpleCollect = {
        ...(collectSettings.followerOnly && {
            followerOnGraph: {
                globalGraph: true,
            },
        }),
    };
    if (amount) {
        input.payToCollect = {
            amount,
            recipients: [
                {
                    percent: 100,
                    address: evmAddress(address),
                },
            ],
        };
    }
    if (collectSettings.limit) {
        input.collectLimit = collectSettings.limit;
    }
    if (collectSettings.timed) {
        input.endsAt = getEndTimestamp();
    }
    return input;
};
