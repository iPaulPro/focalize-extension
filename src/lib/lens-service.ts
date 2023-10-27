import {
    development,
    LensClient,
    LimitType,
    type NotificationFragment,
    type PaginatedResult,
    type ProfileFragment,
} from '@lens-protocol/client';
import type {
    IObservableStorageProvider,
    StorageProviderSubscriber,
    StorageSubscription,
} from '@lens-protocol/storage';
import WalletConnection from './evm/WalletConnection';

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
    environment: development,
    storage: chromeStorage,
});

export const isAuthenticated = (): Promise<boolean> =>
    lensClient.authentication.isAuthenticated();

export const generateChallenge = (
    profileId: string,
    address: string
): Promise<{ id: string; text: string }> =>
    lensClient.authentication.generateChallenge({
        for: profileId,
        signedBy: address,
    });

export const login = async (walletConnection: WalletConnection) => {
    const {
        initEthers,
        getSigner,
        getAccounts,
        clearProvider,
        ensureCorrectChain,
    } = await import('./evm/ethers-service');

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
    console.log('authenticate: Profiles', res);

    // TODO handle multiple profiles
    const profile = res.items[0];
    if (!profile) {
        throw new NoProfileError();
    }

    const { id, text } = await generateChallenge(profile.id, address);
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

    if (onchainRelayResult.__typename === 'RelayError') {
        console.log(`Something went wrong`);
        // TODO submit enableProfileManager transaction directly on broadcast failure
        return false;
    }

    return true;
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
