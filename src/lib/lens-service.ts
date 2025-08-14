import {
    Account,
    AccountAvailable,
    AccountGraphsFollowStats,
    BigDecimal,
    EvmAddress,
    evmAddress,
    Feed,
    Group,
    GroupsOrderBy,
    IStorageProvider,
    MeResult,
    Notification,
    PageSize,
    Paginated,
    Post,
    PublicClient,
    Repost,
    SessionClient,
    mainnet,
    staging,
    CreatePostRequest,
} from '@lens-protocol/client';
import {
    createGroup,
    enableSignless,
    fetchAccount,
    fetchAccountGraphStats,
    fetchAccounts,
    fetchAccountsAvailable,
    fetchFeed,
    fetchFollowersYouKnow,
    fetchGroup,
    fetchGroups,
    fetchMeDetails,
    fetchNotifications,
    fetchPost,
    follow,
    post,
    removeSignless,
    setAccountMetadata,
    unfollow,
    createAccountWithUsername,
    fetchUsername,
    deposit,
    withdraw,
    wrapTokens,
    unwrapTokens,
    fetchAccountBalances,
} from '@lens-protocol/client/actions';
import WalletConnection from '@/lib/types/WalletConnection';
import { handleOperationWith } from '@lens-protocol/client/ethers';
import { account } from '@lens-protocol/metadata';
import { uploadJson } from '@/lib/grove-service';
import { APP_ADDRESS, CURRENT_CHAIN_ID, GLOBAL_NAMESPACE_ADDRESS, isMainnet } from '@/lib/config';
import { NoSessionError, NoWalletError } from '@/lib/utils/error-utils';
import { type SimpleCollect } from '@/lib/types/SimpleCollect';
import { SUPPORTED_CURRENCIES } from '@/lib/utils/supported-currencies';
import type { EditAccountInput } from '@/lib/types/EditAccountInput';

const storageProvider: IStorageProvider = {
    getItem: function (key: string): Promise<string | null> | string | null {
        return browser.storage.local.get(key).then((storage) => storage[key] ?? null);
    },
    setItem: function (
        key: string,
        value: string,
    ): Promise<string> | Promise<void> | void | string {
        return browser.storage.local.set({ [key]: value });
    },
    removeItem: function (key: string): Promise<string> | Promise<void> | void {
        return browser.storage.local.remove(key);
    },
};

const publicClient = PublicClient.create({
    environment: isMainnet ? mainnet : staging,
    storage: storageProvider,
});

const getSigner = async () => {
    const { ensureCorrectChain, getSigner } = await import('./evm/ethers-service');

    await ensureCorrectChain();

    const signer = await getSigner();
    if (!signer) return false;

    return signer;
};

export const getClient = async (): Promise<SessionClient | PublicClient> => {
    const resumed = await publicClient.resumeSession();
    if (resumed.isOk()) {
        return resumed.value;
    }
    return publicClient;
};

export const isAuthenticated = async (): Promise<boolean> => {
    const client = await getClient();
    return client.isSessionClient();
};

export const connectWalletAndGetAccounts = async (
    walletConnection: WalletConnection,
): Promise<readonly AccountAvailable[]> => {
    const { initEthers, getAccounts, clearProvider, ensureCorrectChain } = await import(
        './evm/ethers-service'
    );

    let address: string | undefined;
    try {
        const accounts = await initEthers(walletConnection);
        address = accounts[0];
    } catch (e) {
        console.warn('authenticateUser: Unable to get address from cached provider', e);
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

    if (!address) throw new NoWalletError();
    console.log('authenticate: Authenticating with address', address);

    await ensureCorrectChain();

    return getManagedAccounts(address);
};

/**
 * Onboard the current signer wallet
 * @returns the authenticated wallet address of the onboarding user
 */
export const onboard = async (): Promise<string> => {
    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    console.log('onboard: logging in with wallet', signer.address);

    const authenticatedRes = await publicClient.login({
        onboardingUser: {
            app: evmAddress(APP_ADDRESS),
            wallet: evmAddress(signer.address),
        },
        signMessage: async (message: string) => {
            return signer.signMessage(message);
        },
    });
    console.log('onboard: login res', authenticatedRes);

    if (authenticatedRes.isErr()) {
        throw authenticatedRes.error;
    }

    return signer.address;
};

export const login = async (
    walletAddress: string,
    accountAvailable: AccountAvailable,
): Promise<Account> => {
    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    console.log('login: logging in with wallet', walletAddress, 'account', accountAvailable);

    const res = await publicClient.login({
        ...(accountAvailable.__typename === 'AccountManaged'
            ? {
                  accountManager: {
                      app: evmAddress(APP_ADDRESS),
                      manager: evmAddress(walletAddress),
                      account: evmAddress(accountAvailable.account.address),
                  },
              }
            : {
                  accountOwner: {
                      app: evmAddress(APP_ADDRESS),
                      owner: evmAddress(walletAddress),
                      account: evmAddress(accountAvailable.account.address),
                  },
              }),
        signMessage: async (message: string) => {
            return signer.signMessage(message);
        },
    });

    console.log('login: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return accountAvailable.account;
};

export const logOut = async () => {
    const client = await getClient();
    if (client.isSessionClient()) {
        await client?.logout();
    }
    await browser.storage.local.clear();
    await browser.storage.sync.clear();
    await browser.runtime.sendMessage({ type: 'loggedOut' });
    const { clearProvider } = await import('./evm/ethers-service');
    await clearProvider();
};

export const getAccount = async ({
    address,
    username,
}: {
    address?: string;
    username?: string;
}): Promise<Account | null> => {
    const client = await getClient();

    if (address) {
        const res = await fetchAccount(client, {
            address: evmAddress(address),
        });
        console.log('getAccount: account res', res);
        if (res.isErr()) {
            return null;
        }
        return res.value;
    }

    if (!username) {
        throw new Error('No account ID or username provided');
    }

    const res = await fetchAccount(client, {
        username: {
            localName: username,
        },
    });
    console.log('getAccount: account res', res);
    if (res.isErr()) {
        return null;
    }
    return res.value;
};

export const getAccounts = async (address: string): Promise<Account[]> => {
    const client = await getClient();

    const res = await fetchAccountsAvailable(client, {
        managedBy: evmAddress(address),
    });

    console.log('getAccounts: res', res);

    if (res.isOk()) {
        const accountsOwned = res.value.items
            .filter((item) => item.__typename === 'AccountOwned')
            .map((item) => item.account);
        return accountsOwned;
    }

    return [];
};

export const getManagedAccounts = async (address: string): Promise<readonly AccountAvailable[]> => {
    const res = await fetchAccountsAvailable(publicClient, {
        managedBy: evmAddress(address),
        pageSize: PageSize.Fifty,
    });

    console.log('getManagedAccounts: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value.items;
};

export const searchAccounts = async (query: string): Promise<readonly Account[]> => {
    const client = await getClient();
    const res = await fetchAccounts(client, {
        filter: {
            searchBy: {
                localNameQuery: query,
                namespaces: [evmAddress(GLOBAL_NAMESPACE_ADDRESS)],
            },
        },
        pageSize: PageSize.Ten,
    });
    if (res.isErr()) {
        return [];
    }
    return res.value.items;
};

export const getMutualFollowers = async (accountAddress: string): Promise<Account[]> => {
    const client = await getClient();
    if (!client?.isSessionClient()) return [];

    const authenticatedUser = client.getAuthenticatedUser();
    if (authenticatedUser.isErr()) {
        return [];
    }

    const res = await fetchFollowersYouKnow(client, {
        observer: evmAddress(authenticatedUser.value.address),
        target: evmAddress(accountAddress),
        pageSize: PageSize.Fifty,
    });

    console.log('getMutualFollowers: res', res);

    if (res.isErr()) {
        return [];
    }

    return res.value.items.map((item) => item.follower);
};

export const followAccount = async (address: string): Promise<boolean> => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await follow(client, {
        account: evmAddress(address),
    })
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);

    console.log('followAccount: follow res', res);

    if (res.isErr()) {
        throw res.error;
    }

    console.log('followAccount: successfully followed, txhash=', res.value);

    return true;
};

export const unfollowAccount = async (address: string): Promise<boolean> => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await unfollow(client, {
        account: evmAddress(address),
    })
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);

    console.log('unfollowAccount: unfollow res', res);

    if (res.isErr()) {
        throw res.error;
    }

    console.log('unfollowAccount: successfully unfollowed, txhash=', res.value);

    return true;
};

export const enableAccountManager = async () => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await enableSignless(client)
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);

    console.log('enableAccountManager: enableSignless res', res);

    if (res.isErr()) {
        throw res.error;
    }

    console.log('enableAccountManager: successfully enabled signless, txhash=', res.value);
};

export const disableAccountManager = async () => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await removeSignless(client)
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);

    console.log('disableAccountManager: removeSignless res', res);

    if (res.isErr()) {
        throw res.error;
    }

    console.log('disableAccountManager: successfully disabled signless, txhash=', res.value);
};

export const getNotifications = async (
    cursor?: never,
    highSignalFilter: boolean = false,
): Promise<Paginated<Notification>> => {
    const client = await getClient();
    console.log('getNotifications: client=', client, 'cursor', cursor);
    if (!client?.isSessionClient()) throw new NoSessionError();

    const res = await fetchNotifications(client, {
        cursor,
        filter: {
            includeLowScore: !highSignalFilter,
        },
    });

    console.log('getNotifications: fetchNotifications res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const createPost = async (
    contentUri: string,
    feed: EvmAddress,
    simpleCollect: SimpleCollect | null,
    followerOnly: boolean = false,
): Promise<string | null> => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const req: CreatePostRequest = {
        contentUri,
        feed,
        ...(simpleCollect && {
            actions: [{ simpleCollect }],
        }),
        ...(followerOnly && {
            rules: {
                required: [
                    {
                        followersOnlyRule: {
                            quotesRestricted: true,
                            repostRestricted: true,
                            repliesRestricted: true,
                        },
                    },
                ],
            },
        }),
    };
    console.log('createPost: req', req);

    const res = await post(client, req)
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);
    console.log('createPost: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const getPost = async ({
    txHash,
    post,
}: {
    txHash?: string;
    post?: string;
}): Promise<Post | Repost | null> => {
    const client = await getClient();
    const res = await fetchPost(client, { txHash, post });
    console.log('getPost: res', res);
    if (res.isErr()) {
        return null;
    }
    return res.value;
};

export const getGraphStats = async (account: string): Promise<AccountGraphsFollowStats | null> => {
    const res = await fetchAccountGraphStats(publicClient, { account });
    console.log('geGraphStats: res', res);
    if (res.isErr()) {
        return null;
    }
    return res.value;
};

export const getMe = async (): Promise<MeResult | null> => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const res = await fetchMeDetails(client);
    console.log('getMe: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const switchAccounts = async (account: string): Promise<void> => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const res = await client.switchAccount({
        account: evmAddress(account),
    });
    console.log('switchAccounts: res', res);
    if (res.isErr()) {
        throw res.error;
    }
};

export const getMemberGroups = async (account: string): Promise<readonly Group[]> => {
    const client = await getClient();
    const res = await fetchGroups(client, {
        filter: {
            member: evmAddress(account),
        },
        pageSize: PageSize.Fifty,
        orderBy: GroupsOrderBy.Alphabetical,
    });
    console.log('getMemberGroups: fetchGroups res', res);
    if (res.isErr()) {
        return [];
    }
    return res.value.items;
};

export const searchGroups = async (searchQuery: string): Promise<readonly Group[]> => {
    const client = await getClient();
    const res = await fetchGroups(client, {
        filter: { searchQuery },
        pageSize: PageSize.Ten,
        orderBy: GroupsOrderBy.Alphabetical,
    });
    console.log('getMemberGroups: fetchGroups res', res);
    if (res.isErr()) {
        return [];
    }
    return res.value.items;
};

export const getGroup = async (groupAddress: string): Promise<Group | null> => {
    const client = await getClient();
    const res = await fetchGroup(client, {
        group: evmAddress(groupAddress),
    });
    console.log('getGroup: fetchGroup res', res);
    if (res.isErr()) {
        return null;
    }
    return res.value;
};

export const newGroup = async (metadataUri: string) => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await createGroup(client, { metadataUri })
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);
    console.log('newGroup: createGroup res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const getFeed = async (feedAddress: string): Promise<Feed | null> => {
    if (!feedAddress || feedAddress.length === 0) return null;
    const client = await getClient();
    const res = await fetchFeed(client, {
        feed: evmAddress(feedAddress),
    });
    console.log('getFeed: res', res);
    if (res.isErr()) {
        return null;
    }
    return res.value;
};

export const editAccount = async (input: EditAccountInput) => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const metadata = account({
        name: input.name,
        bio: input.bio,
        picture: input.picture,
        coverPicture: input.coverPicture,
        attributes: input.attributes,
    });
    const metadataUri = await uploadJson(metadata);

    const res = await setAccountMetadata(client, { metadataUri })
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);

    console.log('editAccount: setAccountMetadata res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const res = await fetchUsername(client, {
        username: {
            localName: username,
        },
    });
    console.log('isUsernameAvailable: fetchUsername res', res);

    if (res.isErr()) {
        return false;
    }

    return res.value === null;
};

export const createAccount = async (
    username: string,
    metadataUri: string,
): Promise<Account | null> => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await createAccountWithUsername(client, {
        username: {
            localName: username,
        },
        metadataUri,
    })
        .andThen(handleOperationWith(signer))
        .andThen(client?.waitForTransaction);
    console.log('createAccount: createAccountWithUsername res', res);

    if (res.isErr()) {
        throw res.error;
    }

    const txHash = res.value;
    const accountRes = await fetchAccount(client, { txHash });
    console.log('createAccount: fetchAccount res', accountRes);
    if (accountRes.isErr()) {
        throw accountRes.error;
    }

    const account = accountRes.value;
    if (!account) {
        throw new Error('Unable to create account');
    }

    const switchRes = await client.switchAccount({
        account: evmAddress(account.address),
    });
    console.log('createAccount: switchAccount res', accountRes);
    if (switchRes.isErr()) {
        throw switchRes.error;
    }

    return account;
};

export const depositGHO = async (value: BigDecimal) => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await deposit(client, {
        native: value,
    }).andThen(handleOperationWith(signer));
    console.log('depositGho: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const withdrawGHO = async (value: BigDecimal) => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await withdraw(client, {
        native: value,
    }).andThen(handleOperationWith(signer));
    console.log('withdrawGho: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const withdrawErc20 = async (tokenAddress: string, value: BigDecimal) => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await withdraw(client, {
        erc20: {
            currency: evmAddress(tokenAddress),
            value,
        },
    }).andThen(handleOperationWith(signer));
    console.log('withdrawErc20: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const wrapGHO = async (value: BigDecimal) => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await wrapTokens(client, {
        amount: value,
    }).andThen(handleOperationWith(signer));
    console.log('wrapGho: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const unwrapGHO = async (value: BigDecimal) => {
    const client = await getClient();
    if (!client.isSessionClient()) throw new NoSessionError();

    const signer = await getSigner();
    if (!signer) throw new NoWalletError();

    const res = await unwrapTokens(client, {
        amount: value,
    }).andThen(handleOperationWith(signer));
    console.log('unwrapGho: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};

export const getBalances = async () => {
    const client = await getClient();
    if (!client?.isSessionClient()) throw new NoSessionError();

    const res = await fetchAccountBalances(client, {
        includeNative: true,
        tokens: SUPPORTED_CURRENCIES.filter((c) => {
            return (
                c.contract.chainId === Number(CURRENT_CHAIN_ID) &&
                (c.symbol === `WGRASS` || c.symbol === `WGHO`)
            );
        }).map((c) => c.contract.address),
    });
    console.log('getBalances: res', res);

    if (res.isErr()) {
        throw res.error;
    }

    return res.value;
};
