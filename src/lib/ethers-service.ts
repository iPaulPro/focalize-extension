import createMetaMaskProvider from "metamask-extension-provider";
import { ethers, utils } from 'ethers';
import omitDeep from 'omit-deep';
import type { Web3Provider, ExternalProvider, JsonRpcSigner } from '@ethersproject/providers';

const inPageProvider = createMetaMaskProvider();
export const ethersProvider: Web3Provider = new ethers.providers.Web3Provider(inPageProvider as ExternalProvider);

export const getSigner = (): JsonRpcSigner => {
    return ethersProvider.getSigner();
}

export const getAddressFromSigner = (): Promise<string> => {
    return getSigner().getAddress();
}

export const init = async() => {
    const accounts = await ethersProvider.send('eth_requestAccounts', []);
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

export const splitSignature = (signature) => {
    return utils.splitSignature(signature)
}

// Subscribe to account change
ethersProvider.on("accountsChanged", (accounts: string[]) => {
    console.log("ethersProvider: accountsChanged", accounts);
});

// Subscribe to chainId change
ethersProvider.on("chainChanged", (chainId: number) => {
    console.log("ethersProvider: chainChanged", chainId);
});

// Subscribe to provider connection
ethersProvider.on("connect", (info: { chainId: number }) => {
    console.log("ethersProvider: connect", info);
});

// Subscribe to provider disconnection
ethersProvider.on("disconnect", (error: { code: number; message: string }) => {
    console.log("ethersProvider: disconnect", error);
});

ethersProvider.on('error', (error) => {
    // Failed to connect to MetaMask, fallback logic.
    console.error(error);
});