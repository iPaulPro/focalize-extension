import createMetaMaskProvider from "metamask-extension-provider";
import { hexValue } from 'ethers/lib/utils';
import omitDeep from 'omit-deep';
import { Web3Provider } from '@ethersproject/providers';
import type { JsonRpcSigner } from '@ethersproject/providers';
import type {TypedDataDomain, TypedDataField} from "ethers";
import type BaseProvider from "@metamask/inpage-provider/dist/BaseProvider";

const inPageProvider = createMetaMaskProvider();
export const provider: Web3Provider = new Web3Provider(inPageProvider as BaseProvider, "any");

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

export const init = async() => {
    const accounts = await provider.send('eth_requestAccounts', []);
    return accounts[0];
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

// Subscribe to account change
provider.on("accountsChanged", (accounts: string[]) => {
    console.log("ethersProvider: accountsChanged", accounts);
});

// Subscribe to chainId change
provider.on("chainChanged", (chainId: number) => {
    console.log("ethersProvider: chainChanged", chainId);
});

// Subscribe to provider connection
provider.on("connect", (info: { chainId: number }) => {
    console.log("ethersProvider: connect", info);
});

// Subscribe to provider disconnection
provider.on("disconnect", (error: { code: number; message: string }) => {
    console.log("ethersProvider: disconnect", error);
});

provider.on('error', (error) => {
    // Failed to connect to MetaMask, fallback logic.
    console.error(error);
});