import {
    development,
    LensClient,
    LimitType,
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

export const getProfiles = async (
    ownedBy: string[]
): Promise<ProfileFragment[]> => {
    const res = await lensClient.profile.fetchAll({
        where: { ownedBy },
        limit: LimitType.Fifty,
    });
    if (res.pageInfo.next) {
        // TODO handle getProfiles pagination
        console.warn('getProfiles: Pagination not implemented');
    }
    return res.items;
};

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

    const profiles = await getProfiles([address]);
    console.log('authenticate: Profiles', profiles);

    // TODO handle multiple profiles
    const profile = profiles[0];
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
