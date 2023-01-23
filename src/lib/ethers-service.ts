import createMetaMaskProvider from "metamask-extension-provider";
import {hexValue} from 'ethers/lib/utils';
import omitDeep from 'omit-deep';
import type {JsonRpcSigner} from '@ethersproject/providers';
import {Web3Provider} from '@ethersproject/providers';
import type {TypedDataDomain, TypedDataField} from "ethers";
import type BaseProvider from "@metamask/inpage-provider/dist/BaseProvider";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";

let provider: Web3Provider;

const web3ModalProviderOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: import.meta.env.VITE_INFURA_PROJECT_ID
        }
    }
};

const web3Modal = new Web3Modal({
    cacheProvider: false,
    providerOptions: web3ModalProviderOptions,
    disableInjectedProvider: false,
});

const CHAIN_ID = Number.parseInt(import.meta.env.VITE_CHAIN_ID);

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

export const getAddressFromSigner = (): Promise<string> => {
    return getSigner().getAddress();
}

export const getChainId = async (): Promise<number> => {
    return provider.send('eth_chainId', []).then(normalizeChainId);
}

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
                [CHAIN_ID === 80001 ? networkMap.MUMBAI_TESTNET : networkMap.POLYGON_MAINNET],
            );
        }

        throw error;
    }
}

export const ensureCorrectChain = async () => {
    const chainId = await getChainId();
    if (CHAIN_ID !== chainId) {
        await switchChains(CHAIN_ID);
    }
}

const getProviderFromWeb3Modal = async (): Promise<Web3Provider> => {
    const instance = await web3Modal.connect();
    return new Web3Provider(instance, "any");
};

export const getAccounts = async (): Promise<string[]> => {
    if (!provider) throw ('Provider is null. You must call init() first');
    return await provider.listAccounts();
}

export const initEthers = async(): Promise<any[]> => {
    console.log('initEthers');
    let accounts;

    // First attempt to connect to the extension provider, if it's not available we then try web3modal
    try {
        const inPageProvider = createMetaMaskProvider();
        provider = new Web3Provider(inPageProvider as BaseProvider, "any");
        console.log('Created metamask in-page provider');
        // provider.on('debug',  (error) => {
        //     // TODO Failed to connect to MetaMask, fallback logic
        //     console.error('Web3Provider debug`', error);
        // });
        // provider.on('error',  (error) => {
        //     // TODO Failed to connect to MetaMask, fallback logic
        //     console.error('Web3Provider error', error);
        // });

        if(chrome.runtime.lastError) console.error('runtime error', chrome.runtime.lastError)

        accounts = await provider.send('eth_requestAccounts', [])
        console.log('Got accounts from metamask', accounts);
        if(chrome.runtime.lastError) console.error('runtime error', chrome.runtime.lastError)
    } catch (e) {
        console.log('Unable to create metamask provider, attempting web3modal...');
        provider = await getProviderFromWeb3Modal();
        accounts = await provider.send('eth_requestAccounts', [])
    }

    console.log('returning accounts', accounts);
    return accounts;
}

export const signedTypeData = (
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
