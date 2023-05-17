import {CHAIN_ID, INFURA_PROJECT_ID} from '../config';
import {createExternalExtensionProvider} from '@metamask/providers';
import {hexValue} from 'ethers/lib/utils';
import omitDeep from 'omit-deep';
import type {JsonRpcSigner} from '@ethersproject/providers';
import {Web3Provider} from '@ethersproject/providers';
import type {TypedDataDomain, TypedDataField} from 'ethers';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import MetaMaskLogo from '../assets/metamask.svg';
import MetaMaskInPageProvider from './providers/connectors';
import ethProvider from 'eth-provider';

let provider: Web3Provider;

const chainId = Number.parseInt(CHAIN_ID, 10);

const networkMap = {
    POLYGON_MAINNET: {
        chainId: hexValue(137), // '0x89'
        chainName: "Polygon Mainnet",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpcUrls: ["https://polygon-rpc.com"],
        blockExplorerUrls: ["https://www.polygonscan.com/"],
    },
    MUMBAI_TESTNET: {
        chainId: hexValue(80001), // '0x13881'
        chainName: "Polygon Mumbai Testnet",
        nativeCurrency: { name: "tMATIC", symbol: "tMATIC", decimals: 18 },
        rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
        blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
    },
};

const web3ModalProviderOptions = {
    // MetaMask provider is not injected into Extension pages, so add the in-page provider as a custom web3modal provider
    "custom-metamask": {
        display: {
            logo: MetaMaskLogo,
            name: "MetaMask",
            description: "Connect to your MetaMask account"
        },
        package: MetaMaskInPageProvider,
        connector: async () => createExternalExtensionProvider()
    },
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: INFURA_PROJECT_ID,
            rpc: {
                137: "https://polygon-mainnet.infura.io/v3/" + INFURA_PROJECT_ID,
                80001: "https://polygon-mumbai.infura.io/v3/" + INFURA_PROJECT_ID,
            },
            network: chainId === 80001 ? 'mumbai' : 'matic'
        }
    },
    coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
            appName: "Focalize",
            infuraId: INFURA_PROJECT_ID,
            chainId: CHAIN_ID
        }
    },
    frame: {
        package: ethProvider // required
    }
};

const web3Modal = new Web3Modal({
    cacheProvider: true,
    providerOptions: web3ModalProviderOptions,
    disableInjectedProvider: false,
});

const getSignerProvider = async (): Promise<Web3Provider> => {
    const instance = await web3Modal.connect();
    return new Web3Provider(instance, "any");
};

function normalizeChainId(chainId: string | number | bigint) {
    if (typeof chainId === 'string')
        return Number.parseInt(
            chainId,
            chainId.trim().substring(0, 2) === '0x' ? 16 : 10,
        )
    if (typeof chainId === 'bigint') return Number(chainId)
    return chainId
}

export const getSigner = (): JsonRpcSigner => {
    return provider.getSigner();
}

export const getChainId = async (): Promise<number> => {
    return provider.send('eth_chainId', []).then(normalizeChainId);
}

export const switchChains = async (chainId: number) => {
    const id: string = hexValue(chainId);
    try {
        await provider.send(
            'wallet_switchEthereumChain',
            [{chainId: id}]
        );
        console.log('switched to chain', chainId);
    } catch (error) {
        // @ts-ignore
        if (error.code === 4902) {
            console.log("this network is not in the user's wallet")
            await provider.send(
                "wallet_addEthereumChain",
                [chainId === 80001 ? networkMap.MUMBAI_TESTNET : networkMap.POLYGON_MAINNET],
            );
        }

        throw error;
    }
}

export const ensureCorrectChain = async () => {
    if (!provider) {
        provider = await getSignerProvider();
    }

    const currentChainId = await getChainId();
    if (currentChainId !== chainId) {
        await switchChains(chainId);
    }
}

export const getAccounts = async (): Promise<string[]> => {
    if (!provider) {
        provider = await getSignerProvider();
    }

    let accounts = await provider.send('eth_requestAccounts', []);

    if (!accounts || accounts.length === 0) {
        try {
            accounts = await provider.listAccounts();
        } catch (e) {
            console.error('getAccounts: Unable to get accounts from provider', e)
        }
    }

    return accounts;
}

export const initEthers = async(): Promise<any[]> => {
    if (!provider) {
        provider = await getSignerProvider();
    }
    return await getAccounts();
}

export const signTypedData = (
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value:  Record<string, any>
): Promise<string> => {
    const signer = getSigner();
    // remove the __typedname from the signature!
    return signer._signTypedData(
        omitDeep(domain, ['__typename']),
        // @ts-ignore
        omitDeep(types, ['__typename']),
        omitDeep(value, ['__typename'])
    );
}

export const clearProvider = () => {
    web3Modal.clearCachedProvider();
}