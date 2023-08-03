import type {
    CollectModuleParams,
    Erc20,
    ReferenceModuleParams,
    SimpleCollectModuleParams,
    MultirecipientFeeCollectModuleParams,
    ModuleFeeAmountParams, RecipientDataInput,
} from '../graph/lens-service';

import {PublicationContentWarning} from "../graph/lens-service";

import lensApi from "../lens-api";
import {DateTime} from "luxon";

import type {CollectSettings} from './CollectSettings';

export type SelectOption<Type> = {
    value: Type,
    label: string,
    summary?: string,
    icon?: string
};

export const REFERENCE_ITEMS: SelectOption<ReferenceModuleParams>[] = [
    {
        value: {
            followerOnlyReferenceModule: false
        },
        label: 'Everyone can reply',
        summary: 'Any Lens user can add a comment',
        icon: 'earth'
    },
    {
        value: {
            followerOnlyReferenceModule: true
        },
        label: 'Followers only',
        summary: 'Only your followers can comment',
        icon: 'followers'
    },
    {
        value: {
            degreesOfSeparationReferenceModule: {
            "commentsRestricted": true,
            "mirrorsRestricted": false,
            "degreesOfSeparation": 0
            }
        },
        label: 'No comments',
        summary: 'No one can comment, including you',
        icon: 'lock'
    },
    {
        value: {
            degreesOfSeparationReferenceModule: {
                "commentsRestricted": true,
                "mirrorsRestricted": false,
                "degreesOfSeparation": 1
            }
        },
        label: 'Friends only',
        summary: 'Only profiles that you follow can comment',
        icon: 'friends'
    },
    {
        value: {
            degreesOfSeparationReferenceModule: {
                "commentsRestricted": true,
                "mirrorsRestricted": false,
                "degreesOfSeparation": 2
            }
        },
        label: 'Friends of friends',
        summary: 'Only profiles that you follow, and the profiles they\nfollow, can comment',
        icon: 'friends_of_friends'
    },
];

export const CONTENT_WARNING_ITEMS: SelectOption<PublicationContentWarning | null>[] = [
    {value: null, label: 'No content warning'},
    {value: PublicationContentWarning.Nsfw, label: 'NSFW'},
    {value: PublicationContentWarning.Spoiler, label: 'Spoiler'},
    {value: PublicationContentWarning.Sensitive, label: 'Sensitive'},
];

export const COLLECT_DURATION_ITEMS: SelectOption<number>[] = [
    {value: 0, label: 'Custom'},
    {value: 1, label: '1 hour'},
    {value: 6, label: '6 hours'},
    {value: 24, label: '1 day'},
    {value: 72, label: '3 days'},
    {value: 168, label: '1 week'},
];

export const REVERT_COLLECT_MODULE: CollectModuleParams = {revertCollectModule: true};

export const DEFAULT_REFERENCE_MODULE: ReferenceModuleParams = {followerOnlyReferenceModule: false}

export const getEnabledModuleCurrencies = async (): Promise<Erc20[]> => {
    const {enabledModuleCurrencies} = await lensApi.enabledModuleCurrencies();
    return enabledModuleCurrencies;
};

export const collectSettingsToModuleParams = (
    address: string,
    collectSettings: CollectSettings,
): CollectModuleParams => {
    if (!address) {
        throw new Error('Address must be provided');
    }

    if (collectSettings.price && !collectSettings.token) {
        throw new Error('Token must be provided with price');
    }

    if (!collectSettings.isCollectible) {
        return REVERT_COLLECT_MODULE;
    }

    const getEndTimestamp = (): string | null => {
        if (collectSettings.durationInHours && collectSettings.durationInHours > 0) {
            return DateTime.utc().plus({hours: collectSettings.durationInHours}).toISO();
        } else if (collectSettings.endDate && DateTime.fromISO(collectSettings.endDate).isValid) {
            return collectSettings.endDate;
        }
        return null;
    };

    if (collectSettings.price && collectSettings.token) {
        const amount: ModuleFeeAmountParams = {
            currency: collectSettings.token.address,
            value: collectSettings.price.toString()
        };

        const recipients: RecipientDataInput[] = [
            {
                recipient: "0x10E1DEB36F41b4Fad35d10d0aB870a4dc52Dbb2c", // focalize.eth
                split: 2
            }
        ];

        if (collectSettings.recipients?.length) {
            collectSettings.recipients.forEach((recipient) => {
                recipients.push( {
                    recipient: recipient.address,
                    split: recipient.split
                } as RecipientDataInput)
            });
        } else {
            recipients.push({
                recipient: address,
                split: 98
            })
        }

        const totalSplit: number = recipients.reduce(
            (acc: number, recipient: RecipientDataInput) => acc + recipient.split, 0
        );
        if (totalSplit !== 100) {
            throw new Error('Total revenue split must equal 100%');
        }

        const multirecipientFeeCollectModule: MultirecipientFeeCollectModuleParams = {
            amount,
            recipients,
            followerOnly: collectSettings.followerOnly ?? false,
        };

        if (collectSettings.referralFee) {
            multirecipientFeeCollectModule.referralFee = collectSettings.referralFee;
        }

        if (collectSettings.limit) {
            multirecipientFeeCollectModule.collectLimit = collectSettings.limit.toString();
        }

        if (collectSettings.timed) {
            multirecipientFeeCollectModule.endTimestamp = getEndTimestamp();
        }

        return {multirecipientFeeCollectModule};
    }

    const simpleCollectModule: SimpleCollectModuleParams = {
        followerOnly: collectSettings.followerOnly ?? false,
    }

    if (collectSettings.limit) {
        simpleCollectModule.collectLimit = collectSettings.limit.toString();
    }

    if (collectSettings.timed) {
        simpleCollectModule.endTimestamp = getEndTimestamp();
    }

    return {simpleCollectModule};
};