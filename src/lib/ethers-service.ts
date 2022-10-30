import createMetaMaskProvider from "metamask-extension-provider";
import { hexValue } from 'ethers/lib/utils';
import omitDeep from 'omit-deep';
import { Web3Provider } from '@ethersproject/providers';
import type { ExternalProvider, JsonRpcSigner } from '@ethersproject/providers';
import {sleep} from "./utils";

const inPageProvider = createMetaMaskProvider();
export const provider: Web3Provider = new Web3Provider(inPageProvider as ExternalProvider);

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

export const switchChains = async (chainId: number) => {
    const id: string = hexValue(chainId);
    try {
        await provider.send(
            'wallet_switchEthereumChain',
            [{chainId: id}]
        );
        console.log('switched to chain', chainId);
    } catch (error) {
        if (error.code === 4902) {
            console.log("this network is not in the user's wallet")
            // TODO prompt to add network - wallet_addEthereumChain
        }

        throw error;
    }
}

export const ensureCorrectChain = async () => {
    const chainId = await getChainId();
    if (CHAIN_ID !== chainId) {
        await switchChains(CHAIN_ID);
        await sleep(2000);
    }
}

export const init = async() => {
    const accounts = await provider.send('eth_requestAccounts', []);
    return accounts[0];
}

export const signedTypeData = (domain, types, value): Promise<string> => {
    const signer = getSigner();
    // remove the __typedname from the signature!
    return signer._signTypedData(
        omitDeep(domain, '__typename'),
        omitDeep(types, '__typename'),
        omitDeep(value, '__typename')
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