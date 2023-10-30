import { WebIrys } from '@irys/sdk';
import { getProvider } from './evm/ethers-service';

export const getIrys: () => Promise<WebIrys> = async () => {
    const provider = await getProvider();

    const url = 'node2';
    const token = 'matic';
    const rpcURL = 'https://rpc-mumbai.maticvigil.com'; // Optional parameter

    // Create a wallet object
    const wallet = { rpcUrl: rpcURL, name: 'ethersv6', provider: provider };
    // Use the wallet object
    const webIrys = new WebIrys({ url, token, wallet });
    await webIrys.ready();

    return webIrys;
};
