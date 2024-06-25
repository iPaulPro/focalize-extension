import { DateTime } from 'luxon';
import type { CollectSettings } from './CollectSettings';
import type {
    Erc20Fragment,
    RecipientDataInput,
    ReferenceModuleInput,
} from '@lens-protocol/client';
import { enabledModuleCurrencies } from '../lens-service';
import type {
    AmountInput,
    CollectActionModuleInput,
    MultirecipientFeeCollectModuleInput,
    SimpleCollectOpenActionModuleInput,
} from '@lens-protocol/client';

export type SelectOption<Type> = {
    value: Type;
    label: string;
    summary?: string;
    icon?: string;
};

export const REFERENCE_ITEMS: SelectOption<ReferenceModuleInput | undefined>[] =
    [
        {
            value: undefined,
            label: 'Everyone can reply',
            summary: 'Any Lens user can comment and share',
            icon: 'earth',
        },
        {
            value: {
                followerOnlyReferenceModule: true,
            } satisfies ReferenceModuleInput,
            label: 'Followers only',
            summary: 'Only your followers can comment and share',
            icon: 'followers',
        },
        {
            value: {
                degreesOfSeparationReferenceModule: {
                    commentsRestricted: true,
                    mirrorsRestricted: true,
                    quotesRestricted: true,
                    degreesOfSeparation: 1,
                },
            } satisfies ReferenceModuleInput,
            label: 'Friends only',
            summary: 'Only profiles that you follow can comment and share',
            icon: 'friends',
        },
        {
            value: {
                degreesOfSeparationReferenceModule: {
                    commentsRestricted: true,
                    mirrorsRestricted: true,
                    quotesRestricted: true,
                    degreesOfSeparation: 2,
                },
            } satisfies ReferenceModuleInput,
            label: 'Friends of friends',
            summary:
                'Only profiles that you follow, and the profiles they\nfollow, can comment and share',
            icon: 'friends_of_friends',
        },
        {
            value: {
                degreesOfSeparationReferenceModule: {
                    commentsRestricted: true,
                    mirrorsRestricted: false,
                    quotesRestricted: false,
                    degreesOfSeparation: 0,
                },
            } satisfies ReferenceModuleInput,
            label: 'No comments',
            summary: 'No one can comment or share, including you',
            icon: 'lock',
        },
    ];

// export const CONTENT_WARNING_ITEMS: SelectOption<PublicationContentWarning | null>[] =
//     [
//         { value: null, label: 'No content warning' },
//         { value: PublicationContentWarning.Nsfw, label: 'NSFW' },
//         { value: PublicationContentWarning.Spoiler, label: 'Spoiler' },
//         { value: PublicationContentWarning.Sensitive, label: 'Sensitive' },
//     ];

export const COLLECT_DURATION_ITEMS: SelectOption<number>[] = [
    { value: 0, label: 'Custom' },
    { value: 1, label: '1 hour' },
    { value: 6, label: '6 hours' },
    { value: 24, label: '1 day' },
    { value: 72, label: '3 days' },
    { value: 168, label: '1 week' },
];

export const getEnabledModuleCurrencies = async (): Promise<
    Erc20Fragment[]
> => {
    const currencies = await enabledModuleCurrencies();
    return currencies.items;
};

export const collectSettingsToModuleInput = (
    address: string,
    collectSettings: CollectSettings
): CollectActionModuleInput | null => {
    if (!address) {
        throw new Error('Address must be provided');
    }

    if (collectSettings.price && !collectSettings.token) {
        throw new Error('Token must be provided with price');
    }

    if (!collectSettings.isCollectible) {
        return null;
    }

    const getEndTimestamp = (): string | null => {
        if (
            collectSettings.durationInHours &&
            collectSettings.durationInHours > 0
        ) {
            return DateTime.utc()
                .plus({ hours: collectSettings.durationInHours })
                .toISO();
        } else if (
            collectSettings.endDate &&
            DateTime.fromISO(collectSettings.endDate).isValid
        ) {
            return collectSettings.endDate;
        }
        return null;
    };

    let amount: AmountInput | null = null;
    if (collectSettings.price && collectSettings.token) {
        amount = {
            currency: collectSettings.token.contract.address,
            value: collectSettings.price.toString(),
        };
    }

    const recipients: RecipientDataInput[] = [];
    if (collectSettings.recipients?.length) {
        if (collectSettings.recipients?.length) {
            collectSettings.recipients.forEach((recipient) => {
                recipients.push({
                    recipient: recipient.address,
                    split: recipient.split,
                } as RecipientDataInput);
            });
        }
        const totalSplit: number = recipients.reduce(
            (acc: number, recipient: RecipientDataInput) =>
                acc + recipient.split,
            0
        );
        if (totalSplit !== 100) {
            throw new Error('Total revenue split must equal 100%');
        }
    }

    if (amount && recipients.length > 0) {
        const input: MultirecipientFeeCollectModuleInput = {
            amount,
            recipients,
            followerOnly: collectSettings.followerOnly ?? false,
        };
        if (collectSettings.referralFee) {
            input.referralFee = collectSettings.referralFee;
        }
        if (collectSettings.limit) {
            input.collectLimit = collectSettings.limit.toString();
        }
        if (collectSettings.timed) {
            input.endsAt = getEndTimestamp();
        }
        return { multirecipientCollectOpenAction: input };
    }

    const input: SimpleCollectOpenActionModuleInput = {
        recipient: address,
        followerOnly: collectSettings.followerOnly ?? false,
    };
    if (amount) {
        input.amount = amount;
    }
    if (collectSettings.limit) {
        input.collectLimit = collectSettings.limit.toString();
    }
    if (collectSettings.timed) {
        input.endsAt = getEndTimestamp();
    }
    return { simpleCollectOpenAction: input };
};
