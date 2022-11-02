import {
    CollectModules, PublicationContentWarning, ReferenceModules,
    AsyncEnabledModuleCurrencies,
} from "../graph/lens-service";

import type {
    CollectModuleParams, DegreesOfSeparationReferenceModuleParams, EnabledModuleCurrenciesQuery, Erc20,
    FeeCollectModuleSettings, LimitedFeeCollectModuleSettings, LimitedTimedFeeCollectModuleSettings,
    ReferenceModuleParams, TimedFeeCollectModuleSettings,
} from "../graph/lens-service";

import type {ApolloQueryResult} from "@apollo/client";

export type ContentWarning = string | PublicationContentWarning.Nsfw | PublicationContentWarning.Spoiler | PublicationContentWarning.Sensitive;

export type PaidCollectModule = FeeCollectModuleSettings | LimitedFeeCollectModuleSettings | LimitedTimedFeeCollectModuleSettings | TimedFeeCollectModuleSettings;

export type SelectItem<Type> = {
    value: Type,
    label: string,
    summary?: string,
    icon?: string
};

export const REFERENCE_ITEMS: SelectItem<ReferenceModuleParams>[] = [
    {
        value: {
            followerOnlyReferenceModule: false
        },
        label: 'Everyone can engage',
        summary: 'Anyone can reply and repost',
        icon: 'earth'
    },
    {
        value: {
            followerOnlyReferenceModule: true
        },
        label: 'Followers only',
        summary: 'Only your followers can reply and repost',
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
        summary: 'No one can comment, including you. Anyone can repost.',
        icon: 'lock'
    },
    {
        value: {
            degreesOfSeparationReferenceModule: {
                "commentsRestricted": true,
                "mirrorsRestricted": true,
                "degreesOfSeparation": 1
            }
        },
        label: 'Friends only',
        summary: 'Only profiles that you follow can reply and repost.',
        icon: 'friends'
    },
    {
        value: {
            degreesOfSeparationReferenceModule: {
                "commentsRestricted": true,
                "mirrorsRestricted": true,
                "degreesOfSeparation": 2
            }
        },
        label: 'Friends of friends',
        summary: 'Only profiles that you follow, and the profiles they follow,\ncan reply and repost.',
        icon: 'friends_of_friends'
    },
];

export const COLLECT_ITEMS: SelectItem<CollectModules>[] = [
    {
        value: CollectModules.FreeCollectModule,
        label: 'Free to collect',
        summary: 'Post can be collected as an NFT for free',
        icon: 'collect_free'
    },
    {
        value: CollectModules.FeeCollectModule,
        label: 'Sell NFT',
        summary: 'Charge for NFT collection',
        icon: 'collect_paid'
    },
    {
        value: CollectModules.RevertCollectModule,
        label: 'Disable Collection',
        summary: 'Do not allow the post to be collected as an NFT',
        icon: 'collect_disabled'
    },
];

export const CONTENT_WARNING_ITEMS: SelectItem<ContentWarning>[] = [
    {value: '', label: 'No content warning'},
    {value: PublicationContentWarning.Nsfw, label: 'NSFW'},
    {value: PublicationContentWarning.Spoiler, label: 'Spoiler'},
    {value: PublicationContentWarning.Sensitive, label: 'Sensitive'},
];

export const FREE_COLLECT_MODULE = {freeCollectModule: {followerOnly: false}};

export const REVERT_COLLECT_MODULE: CollectModuleParams = {revertCollectModule: true};

export const DEFAULT_REFERENCE_MODULE: ReferenceModuleParams = {followerOnlyReferenceModule: false}

export const getEnabledModuleCurrencies = async (): Promise<Erc20[]> => {
    const res: ApolloQueryResult<EnabledModuleCurrenciesQuery> = await AsyncEnabledModuleCurrencies({})
    if (res.error) {
        return Promise.reject(res.error);
    }
    return Promise.resolve(res.data.enabledModuleCurrencies);
};

const getPaidCollectModuleParams = (module: PaidCollectModule): CollectModuleParams => {
    if (!module) {
        return {};
    }

    const baseModule =  {
        amount: {
            currency: module.amount.asset.address,
            value: module.amount.value
        },
        followerOnly: module.followerOnly,
        recipient: module.recipient,
        referralFee: 0
    }

    switch (module.__typename) {
        case 'LimitedTimedFeeCollectModuleSettings':
            return {
                limitedTimedFeeCollectModule: {
                    ...baseModule,
                    collectLimit: module.collectLimit.toString()
                }
            }
        case 'LimitedFeeCollectModuleSettings':
            return {
                limitedFeeCollectModule: {
                    ...baseModule,
                    collectLimit: module.collectLimit.toString()
                }
            }
        case 'TimedFeeCollectModuleSettings':
            return {
                timedFeeCollectModule: {
                    ...baseModule
                }
            }
    }

    return {
        feeCollectModule: {
            ...baseModule
        }
    }
};


export const getCollectModuleParams = (item: SelectItem<CollectModules>, feeCollectModule: PaidCollectModule): CollectModuleParams => {
    let collect: CollectModuleParams;
    switch (item.value) {
        case CollectModules.FreeCollectModule:
            // TODO set follower only from collect module
            collect = {freeCollectModule: {followerOnly: false}};
            break;
        case CollectModules.RevertCollectModule:
            collect = REVERT_COLLECT_MODULE;
            break;
        case CollectModules.FeeCollectModule:
            collect = getPaidCollectModuleParams(feeCollectModule);
            break;
    }
    console.log('getCollectModuleParams: returning', collect);
    return collect;
}

// export const geReferenceModuleParams = (item: SelectItem<ReferenceModules>): ReferenceModuleParams => {
//     return refere
// }