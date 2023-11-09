import {
    ALCHEMY_MATIC_API_KEY,
    APP_ID,
    CHAIN_ID,
    INFURA_PROJECT_ID,
    WALLETCONNECT_PROJECT_ID,
} from '../../config';
import type { JsonRpcSigner, TypedDataDomain, TypedDataField } from 'ethers';
import { BrowserProvider, isError, toQuantity } from 'ethers';
import omitDeep from 'omit-deep';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import ethProvider from 'eth-provider';
import {
    deletePreference,
    getPreference,
    KEY_DARK_MODE,
    KEY_WALLET_CONNECTION,
    savePreference,
} from '../stores/preferences-store';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import createMetaMaskProvider from 'metamask-extension-provider';
import focalizeIcon from '../../assets/focalize.svg';
import WalletConnection from './WalletConnection';

const walletConnectProjectId = WALLETCONNECT_PROJECT_ID;

let cachedProvider: BrowserProvider | undefined;

const chainId = Number.parseInt(CHAIN_ID, 10);

const networkMap = {
    POLYGON_MAINNET: {
        chainId: toQuantity(137), // '0x89'
        chainName: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://www.polygonscan.com/'],
    },
    MUMBAI_TESTNET: {
        chainId: toQuantity(80001), // '0x13881'
        chainName: 'Mumbai',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
    },
};

const rpcMap = new Map<number, string>([
    [137, 'https://polygon-mainnet.g.alchemy.com/v2/' + ALCHEMY_MATIC_API_KEY],
    [80001, 'https://polygon-mumbai.infura.io/v3/' + INFURA_PROJECT_ID],
]);

export const getRpcUrl = (): string | undefined => rpcMap.get(chainId);

const createWalletConnectProvider = async () => {
    const ethereumProvider = await EthereumProvider.init({
        projectId: walletConnectProjectId,
        chains: [chainId],
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
            137:
                'https://polygon-mainnet.g.alchemy.com/v2/' +
                ALCHEMY_MATIC_API_KEY,
            80001: 'https://polygon-mumbai.infura.io/v3/' + INFURA_PROJECT_ID,
        },
    });
    console.log('ethereumProvider', ethereumProvider);
    await ethereumProvider.connect();
    return new BrowserProvider(ethereumProvider, 'any');
};

const createInjectedProvider = async (): Promise<BrowserProvider> => {
    const provider = ethProvider(['injected']);
    console.log('createInjectedProvider: found provider', provider);
    return new BrowserProvider(provider, 'any');
};

const createFrameProvider = async (): Promise<BrowserProvider> => {
    const provider = ethProvider(['frame']);
    console.log('createFrameProvider: found provider', provider);
    return new BrowserProvider(provider, 'any');
};

const createCoinbaseWalletProvider = async (): Promise<BrowserProvider> => {
    const darkMode = await getPreference<boolean>(KEY_DARK_MODE, false);
    const coinbaseWallet = new CoinbaseWalletSDK({
        appName: APP_ID,
        appLogoUrl: focalizeIcon,
        darkMode,
        overrideIsMetaMask: false,
    });
    const provider = coinbaseWallet.makeWeb3Provider(
        rpcMap.get(chainId),
        chainId
    );
    return new BrowserProvider(provider, 'any');
};

const createSignerProvider = async (): Promise<BrowserProvider> => {
    const walletConnection: WalletConnection | undefined = await getPreference(
        KEY_WALLET_CONNECTION
    );
    if (!walletConnection) {
        throw new Error('No wallet connection');
    }

    switch (walletConnection) {
        case WalletConnection.METAMASK:
            return new BrowserProvider(createMetaMaskProvider(), 'any');
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
        return Number.parseInt(
            id,
            id.trim().substring(0, 2) === '0x' ? 16 : 10
        );
    if (typeof id === 'bigint') return Number(id);
    return id;
};

export const getProvider = async (): Promise<BrowserProvider> => {
    console.log('getProvider: cachedProvider', cachedProvider);
    if (!cachedProvider) {
        cachedProvider = await createSignerProvider();
    }
    return cachedProvider;
};

export const clearProvider = async () => {
    cachedProvider = undefined;
    await deletePreference(KEY_WALLET_CONNECTION);
};

export const initEthers = async (wallet: WalletConnection): Promise<any[]> => {
    console.log('initEthers: wallet connection', wallet);
    await clearProvider();
    await savePreference(KEY_WALLET_CONNECTION, wallet);
    return await getAccounts();
};

export const getSigner = async (): Promise<JsonRpcSigner> => {
    const provider = await getProvider();
    return provider.getSigner();
};

const getChainId = async (): Promise<number> => {
    const provider = await getProvider();
    return provider.send('eth_chainId', []).then(normalizeChainId);
};

const switchChains = async (id: number) => {
    const stringId: string = toQuantity(id);
    const provider = await getProvider();

    try {
        await provider.send('wallet_switchEthereumChain', [
            { chainId: stringId },
        ]);
        console.log('switched to chain', id);
    } catch (error) {
        console.error('switchChains: error switching chains', error);
        if (isError(error, 'UNKNOWN_ERROR')) {
            await provider.send('wallet_addEthereumChain', [
                id === 80001
                    ? networkMap.MUMBAI_TESTNET
                    : networkMap.POLYGON_MAINNET,
            ]);
            return;
        }
        throw error;
    }
};

export const ensureCorrectChain = async () => {
    const currentChainId = await getChainId();
    if (currentChainId !== chainId) {
        await switchChains(chainId);
    }
};

export const getAccounts = async (): Promise<string[]> => {
    const provider = await getProvider();
    let accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
        try {
            accounts = await provider.listAccounts();
        } catch (e) {
            console.error(
                'getAccounts: Unable to get accounts from provider',
                e
            );
        }
    }
    return accounts;
};

export const signTypedData = async (
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
): Promise<string> => {
    const signer = await getSigner();
    return signer.signTypedData(
        omitDeep(domain, ['__typename']),
        // @ts-ignore
        omitDeep(types, ['__typename']),
        omitDeep(value, ['__typename'])
    );
};
