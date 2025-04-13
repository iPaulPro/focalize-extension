import {
    ALCHEMY_ETH_API_KEY,
    CURRENT_CHAIN_ID,
    LENS_CHAIN_ID,
    LENS_TESTNET_CHAIN_ID,
    WALLETCONNECT_PROJECT_ID,
} from '../config';
import { Eip1193Provider, ethers, formatEther, formatUnits, isError, toQuantity } from 'ethers';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import ethProvider from 'eth-provider';
import { getPreference, KEY_DARK_MODE } from '../stores/preferences-store';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import createMetaMaskProvider from 'metamask-extension-provider';
import focalizeIcon from '~/assets/focalize.svg';
import WalletConnection from '../types/WalletConnection';
import {
    deleteFromCache,
    getCached,
    KEY_WALLET_CONNECTION,
    saveToCache,
} from '../stores/cache-store';
import { BrowserProvider, getDefaultProvider, Network, Signer } from '@lens-chain/sdk/ethers';

let cachedProvider: BrowserProvider | undefined;

const networkMap = {
    LENS_CHAIN: {
        chainId: toQuantity(LENS_CHAIN_ID),
        chainName: 'Lens',
        nativeCurrency: { name: 'GHO', symbol: 'GHO', decimals: 18 },
        rpcUrls: ['https://rpc.lens.xyz'],
        blockExplorerUrls: ['https://explorer.lens.xyz'],
    },
    LENS_SEPOLIA: {
        chainId: toQuantity(LENS_TESTNET_CHAIN_ID),
        chainName: 'Lens Testnet',
        nativeCurrency: { name: 'GRASS', symbol: 'GRASS', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.lens.xyz'],
        blockExplorerUrls: ['https://explorer.testnet.lens.xyz/'],
    },
};

const rpcMap = new Map<number, string>([
    [LENS_CHAIN_ID, 'https://lens-mainnet.g.alchemy.com/v2/' + ALCHEMY_ETH_API_KEY],
    [LENS_TESTNET_CHAIN_ID, 'https://lens-sepolia.g.alchemy.com/v2/' + ALCHEMY_ETH_API_KEY],
]);

export const getRpcUrl = (): string | undefined => rpcMap.get(Number(CURRENT_CHAIN_ID));

const createWalletConnectProvider = async () => {
    const ethereumProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
            name: 'Focalize',
            description: 'Extension for Lens',
            url: 'https://focalize.app',
            icons: ['https://focalize.app/images/focalize.png'],
        },
        chains: [Number(CURRENT_CHAIN_ID)],
        showQrModal: true,
        methods: [
            'eth_accounts',
            'eth_chainId',
            'eth_requestAccounts',
            'eth_sign',
            'eth_signTransaction',
            'eth_signTypedData',
            'eth_signTypedData_v3',
            'eth_signTypedData_v4',
            'personal_sign',
            'wallet_addEthereumChain',
            'wallet_switchEthereumChain',
            'wallet_scanQRCode',
        ],
        events: ['chainChanged', 'accountsChanged'],
        rpcMap: {
            [LENS_CHAIN_ID]: 'https://lens-mainnet.g.alchemy.com/v2/' + ALCHEMY_ETH_API_KEY,
            [LENS_TESTNET_CHAIN_ID]: 'https://lens-sepolia.g.alchemy.com/v2/' + ALCHEMY_ETH_API_KEY,
        },
    });
    console.log('ethereumProvider', ethereumProvider);
    await ethereumProvider.connect();
    return new BrowserProvider(ethereumProvider as Eip1193Provider, 'any');
};

const createInjectedProvider = async (): Promise<BrowserProvider> => {
    const provider = ethProvider(['injected']);
    console.log('createInjectedProvider: found provider', provider);
    return new BrowserProvider(provider as Eip1193Provider, 'any');
};

const createFrameProvider = async (): Promise<BrowserProvider> => {
    const provider = ethProvider(['frame']);
    console.log('createFrameProvider: found provider', provider);
    return new BrowserProvider(provider as Eip1193Provider, 'any');
};

const createCoinbaseWalletProvider = async (): Promise<BrowserProvider> => {
    const darkMode = await getPreference<boolean>(KEY_DARK_MODE, false);
    const coinbaseWallet = new CoinbaseWalletSDK({
        appName: 'Focalize',
        appLogoUrl: focalizeIcon,
        darkMode,
        overrideIsMetaMask: false,
    });
    const provider = coinbaseWallet.makeWeb3Provider(
        rpcMap.get(Number(CURRENT_CHAIN_ID)),
        Number(CURRENT_CHAIN_ID),
    );
    return new BrowserProvider(provider as Eip1193Provider, 'any');
};

const createSignerProvider = async (): Promise<BrowserProvider> => {
    const walletConnection: WalletConnection | undefined = await getCached(KEY_WALLET_CONNECTION);
    if (!walletConnection) {
        throw new Error('No wallet connection');
    }

    switch (walletConnection) {
        case WalletConnection.METAMASK:
            return new BrowserProvider(createMetaMaskProvider() as Eip1193Provider, 'any');
        case WalletConnection.WALLET_CONNECT:
            return createWalletConnectProvider();
        case WalletConnection.INJECTED:
            return createInjectedProvider();
        case WalletConnection.FRAME:
            return createFrameProvider();
        case WalletConnection.COINBASE_WALLET:
            return createCoinbaseWalletProvider();
    }
};

const normalizeChainId = (id: string | number | bigint) => {
    if (typeof id === 'string')
        return Number.parseInt(id, id.trim().substring(0, 2) === '0x' ? 16 : 10);
    if (typeof id === 'bigint') return Number(id);
    return id;
};

export const getProvider = async (): Promise<BrowserProvider> => {
    if (!cachedProvider) {
        cachedProvider = await createSignerProvider();
    }
    return cachedProvider;
};

export const clearProvider = async () => {
    cachedProvider = undefined;
    await deleteFromCache(KEY_WALLET_CONNECTION);
};

export const initEthers = async (wallet: WalletConnection): Promise<string[]> => {
    console.log('initEthers: wallet connection', wallet);
    await clearProvider();
    await saveToCache(KEY_WALLET_CONNECTION, wallet);
    return await getAccounts();
};

export const getSigner = async (): Promise<Signer> => {
    const provider = await getProvider();
    const lensProvider = getDefaultProvider(Network.Testnet);
    return Signer.from(
        // @ts-expect-error ignore
        await provider.getSigner(),
        Number(CURRENT_CHAIN_ID),
        lensProvider,
    );
};

const getChainId = async (): Promise<number> => {
    const provider = await getProvider();
    return provider.send('eth_chainId', []).then(normalizeChainId);
};

const switchChains = async (id: number) => {
    const stringId: string = toQuantity(id);
    const provider = await getProvider();

    try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: stringId }]);
        console.log('switched to chain', id);
    } catch (error) {
        console.error('switchChains: error switching chains', error);
        if (isError(error, 'UNKNOWN_ERROR')) {
            await provider.send('wallet_addEthereumChain', [
                id === LENS_TESTNET_CHAIN_ID ? networkMap.LENS_SEPOLIA : networkMap.LENS_CHAIN,
            ]);
            return;
        }
        throw error;
    }
};

export const ensureCorrectChain = async () => {
    const currentChainId = await getChainId();
    if (currentChainId !== Number(CURRENT_CHAIN_ID)) {
        await switchChains(Number(CURRENT_CHAIN_ID));
    }
};

export const getAccounts = async (): Promise<string[]> => {
    const provider = await getProvider();
    let accounts: string[] = [];
    try {
        const signers = await provider.listAccounts();
        accounts = signers.map((signer) => signer.address);
    } catch (e) {
        console.error('getAccounts: Unable to get accounts from provider', e);
    }
    if (!accounts.length) {
        accounts = await provider.send('eth_requestAccounts', []);
    }
    return accounts;
};

export const getNativeBalance = async (walletAddress: string): Promise<string> => {
    const provider = await getProvider();
    const balanceHex = await provider.send('eth_getBalance', [walletAddress, 'latest']);
    console.log(
        'getNativeBalance: balance for address',
        walletAddress,
        '=',
        formatEther(balanceHex),
    );
    return formatEther(balanceHex);
};

export const getErc20Balance = async (
    tokenAddress: string,
    walletAddress: string,
): Promise<string> => {
    const provider = await getProvider();
    const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
    ];
    const erc20 = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const balance = await erc20.balanceOf(walletAddress);
    const decimals = await erc20.decimals();
    console.log('getErc20Balance: balance', formatUnits(balance, decimals));
    return formatUnits(balance, decimals);
};

// export const signTypedData = async (
//     domain: TypedDataDomain,
//     types: Record<string, Array<TypedDataField>>,
//     value: Record<string, never>,
// ): Promise<string> => {
//     const signer = await getSigner();
//     return signer.signTypedData(
//         omitDeep(domain, ['__typename']),
//         // @ts-expect-error ignore
//         omitDeep(types, ['__typename']),
//         omitDeep(value, ['__typename']),
//     );
// };
