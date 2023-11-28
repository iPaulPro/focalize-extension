import {
    development,
    production,
    LensClient,
    LimitType,
    LensTransactionStatusType,
    type NotificationFragment,
    type PaginatedResult,
    type ProfileFragment,
    type CreateOnchainPostBroadcastItemResultFragment,
    type OpenActionModuleInput,
    type ReferenceModuleInput,
    type RelayErrorFragment,
    type RelaySuccessFragment,
    type BroadcastRequest,
    type Erc20Fragment,
    type AnyPublicationFragment,
    isRelaySuccess,
} from '@lens-protocol/client';
import type {
    IObservableStorageProvider,
    StorageProviderSubscriber,
    StorageSubscription,
} from '@lens-protocol/storage';
import WalletConnection from './evm/WalletConnection';
import { clearNotificationCache } from './stores/cache-store';
import { isMainnet } from '../config';

export class NoProfileError extends Error {
    constructor() {
        super('No profile found');
        this.name = 'NoProfileError';
        Object.setPrototypeOf(this, NoProfileError.prototype);
    }
}

class ChromeStorageProvider implements IObservableStorageProvider {
    getItem(key: string): Promise<string | null> | string | null {
        return chrome.storage.local
            .get(key)
            .then((storage) => storage[key] ?? null);
    }

    setItem = (
        key: string,
        value: string
    ): Promise<string> | Promise<void> | void | string =>
        chrome.storage.local.set({ [key]: value });

    removeItem = (key: string): Promise<string> | Promise<void> | void =>
        chrome.storage.local.remove(key);

    subscribe = (
        key: string,
        subscriber: StorageProviderSubscriber
    ): StorageSubscription => {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && key in changes) {
                subscriber(changes[key].newValue, changes[key].oldValue);
            }
        });

        return {
            unsubscribe: () =>
                chrome.storage.onChanged.removeListener(() => {}),
        };
    };
}

const chromeStorage = new ChromeStorageProvider();

const lensClient: LensClient = new LensClient({
    environment: isMainnet ? production : development,
    storage: chromeStorage,
});

export const isAuthenticated = (): Promise<boolean> =>
    lensClient.authentication.isAuthenticated();

export const connectWalletAndGetProfiles = async (
    walletConnection: WalletConnection
): Promise<ProfileFragment[]> => {
    const { initEthers, getAccounts, clearProvider, ensureCorrectChain } =
        await import('./evm/ethers-service');

    let address: string | undefined;
    try {
        const accounts = await initEthers(walletConnection);
        address = accounts[0];
    } catch (e) {
        console.warn(
            'authenticateUser: Unable to get address from cached provider',
            e
        );
    }

    if (!address) {
        try {
            const accounts = await getAccounts();
            address = accounts[0];
        } catch (e) {
            await clearProvider();
            console.error(e);
        }
    }

    if (!address) throw new Error('No address found');
    console.log('authenticate: Authenticating with address', address);

    await ensureCorrectChain();

    const ownedBy = [address];
    const res = await getProfiles({ ownedBy });
    return res.items;
};

export const login = async (
    profile: ProfileFragment
): Promise<ProfileFragment> => {
    console.log('authenticate: Logging in with profile', profile);
    await clearNotificationCache();

    const { getSigner } = await import('./evm/ethers-service');

    const { id, text } = await lensClient.authentication.generateChallenge({
        for: profile.id,
        signedBy: profile.ownedBy.address,
    });
    console.log('authenticate: Lens challenge response', { id, text });

    const signer = await getSigner();
    const signature = await signer.signMessage(text);
    console.log('authenticate: Signed Lens challenge', signature);

    try {
        await lensClient.authentication.authenticate({ id, signature });
        console.log('authenticate: successfully authenticated');
    } catch (e) {
        console.error('authenticate: Lens auth error', e);
        throw e;
    }

    return profile;
};

export const logOut = async () => {
    await lensClient.authentication.logout();
    await chrome.storage.local.clear();
    await chrome.runtime.sendMessage({ type: 'loggedOut' });
    const { clearProvider } = await import('./evm/ethers-service');
    await clearProvider();
};

export const getProfile = async ({
    profileId,
    handle,
}: {
    profileId?: string;
    handle?: string;
}): Promise<ProfileFragment | null> =>
    lensClient.profile.fetch({ forProfileId: profileId, forHandle: handle });

export const getProfiles = async ({
    ownedBy,
    profileIds,
    cursor,
}: {
    ownedBy?: string[];
    profileIds?: string[];
    cursor?: any;
}): Promise<PaginatedResult<ProfileFragment>> =>
    lensClient.profile.fetchAll({
        where: { ownedBy, profileIds },
        limit: LimitType.Fifty,
        cursor,
    });

export const getAllProfiles = async ({
    ownedBy,
    profileIds,
}: {
    ownedBy?: string[];
    profileIds?: string[];
}): Promise<ProfileFragment[]> => {
    const chunkSize = 50;
    let profiles: ProfileFragment[] = [];
    let cursor: any = null;
    let hasMore = true;
    while (hasMore) {
        let currentPointers: string[] = [];

        if (profileIds) {
            currentPointers = profileIds.slice(0, chunkSize);
        } else if (ownedBy) {
            currentPointers = ownedBy.slice(0, chunkSize);
        }

        const res = await getProfiles({
            ownedBy: ownedBy ? currentPointers : undefined,
            profileIds: profileIds ? currentPointers : undefined,
            cursor,
        });

        profiles = profiles.concat(res.items);

        cursor = res.pageInfo.next;
        hasMore =
            res.pageInfo.next !== null &&
            (profileIds?.length !== undefined || ownedBy?.length != undefined);
    }

    return profiles;
};

export const getManagedProfiles = async (
    address: string
): Promise<ProfileFragment[]> => {
    let profiles: ProfileFragment[] = [];
    let cursor: any = null;
    let hasMore = true;
    while (hasMore) {
        const managedProfiles = await lensClient.wallet.profilesManaged({
            for: address,
            cursor,
            limit: LimitType.Fifty,
        });
        profiles.push(...managedProfiles.items);
        cursor = managedProfiles.pageInfo.next;
        hasMore = managedProfiles.pageInfo.next !== null;
    }
    return profiles;
};

export const searchProfiles = async (
    query: string,
    limit: LimitType = LimitType.Ten
): Promise<ProfileFragment[]> => {
    const searchProfiles = await lensClient.search.profiles({
        where: {},
        query,
        limit: LimitType.Ten,
    });

    return searchProfiles.items;
};

export const getMutualFollowers = async (
    profileId: string
): Promise<PaginatedResult<ProfileFragment>> => {
    const userProfileId = await lensClient.authentication.getProfileId();
    if (!userProfileId) throw new Error('No authenticated profile found');
    return lensClient.profile.mutualFollowers({
        observer: userProfileId,
        viewing: profileId,
        limit: LimitType.Fifty,
    });
};

export const followProfile = async (profileId: string): Promise<boolean> => {
    const res = await lensClient.profile.follow({ follow: [{ profileId }] });

    if (res.isFailure()) {
        console.error(
            'unfollowProfile: Error following profile',
            profileId,
            res.error
        );
        // TODO submit follow transaction directly on broadcast failure
        return false;
    }

    return true;
};

export const unfollowProfile = async (profileId: string): Promise<boolean> => {
    const res = await lensClient.profile.unfollow({ unfollow: [profileId] });

    if (res.isFailure()) {
        console.error(
            'unfollowProfile: Error unfollowing profile',
            profileId,
            res.error
        );
        // TODO submit unfollow transaction directly on broadcast failure
        return false;
    }

    return true;
};

export const enableProfileManager = async (): Promise<boolean> => {
    const { ensureCorrectChain } = await import('./evm/ethers-service');

    await ensureCorrectChain();

    const res = await lensClient.profile.createChangeProfileManagersTypedData({
        approveSignless: true,
    });

    if (res.isFailure()) {
        console.error(
            'enableProfileManager: Error creating typed data',
            res.error
        );
        return false;
    }

    const { id, typedData } = res.unwrap();

    const { signTypedData } = await import('./evm/ethers-service');
    const signedTypedData = await signTypedData(
        typedData.domain,
        typedData.types,
        typedData.value
    );

    const broadcastOnchainResult =
        await lensClient.transaction.broadcastOnchain({
            id,
            signature: signedTypedData,
        });

    const onchainRelayResult = broadcastOnchainResult.unwrap();
    if (isRelaySuccess(onchainRelayResult)) {
        console.log(
            `Successfully changed profile managers with transaction with id ${onchainRelayResult}, txHash: ${onchainRelayResult.txHash}`
        );

        return true;
    }

    console.warn(`enableProfileManager: Something went wrong`);
    // TODO submit enableProfileManager transaction directly on broadcast failure
    return false;
};

export const getNotifications = async (
    cursor?: any,
    highSignalFilter: boolean = false
): Promise<PaginatedResult<NotificationFragment>> => {
    const res = await lensClient.notifications.fetch({
        where: { highSignalFilter },
        cursor,
    });

    if (res.isFailure()) {
        throw new Error('Error fetching notifications');
    }

    return res.unwrap();
};

export const postOnMomoka = async (contentURI: string) =>
    lensClient.publication.postOnMomoka({ contentURI });

export const postOnChain = async (
    contentURI: string,
    referenceModule?: ReferenceModuleInput,
    openActionModules?: OpenActionModuleInput[]
) =>
    lensClient.publication.postOnchain({
        referenceModule,
        contentURI,
        openActionModules,
    });

export const createPostTypedData = async (
    contentURI: string,
    referenceModule?: ReferenceModuleInput,
    openActionModules?: OpenActionModuleInput[]
): Promise<CreateOnchainPostBroadcastItemResultFragment> => {
    const res = await lensClient.publication.createOnchainPostTypedData({
        referenceModule,
        contentURI,
        openActionModules,
    });

    if (res.isFailure()) {
        throw new Error('Error creating post typed data');
    }

    return res.unwrap();
};

export const broadcastPostOnChain = async (
    request: BroadcastRequest
): Promise<RelaySuccessFragment | RelayErrorFragment> => {
    const res = await lensClient.transaction.broadcastOnchain(request);

    if (res.isFailure()) {
        throw new Error('Error broadcasting post onchain');
    }

    return res.unwrap();
};

export const enabledModuleCurrencies = async (): Promise<
    PaginatedResult<Erc20Fragment>
> =>
    lensClient.modules.fetchCurrencies({
        limit: LimitType.Fifty,
    });

export const waitForTransaction = async ({
    txHash,
    txId,
}: {
    txHash?: string;
    txId?: string;
}): Promise<LensTransactionStatusType> => {
    const res = await lensClient.transaction.waitUntilComplete({
        forTxHash: txHash,
        forTxId: txId,
    });

    if (!res || res.status === LensTransactionStatusType.Failed) {
        throw new Error('Error waiting for transaction');
    }

    return res.status;
};

export const getPublication = async ({
    txHash,
    txId,
}: {
    txHash?: string;
    txId?: string;
}): Promise<AnyPublicationFragment | null> =>
    lensClient.publication.fetch({
        forTxHash: txHash,
        forId: txId,
    });
