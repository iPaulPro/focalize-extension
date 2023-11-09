import { WebIrys } from '@irys/sdk';
import { JsonRpcProvider, type Signer, Wallet } from 'ethers';
import { getProvider, getRpcUrl } from './evm/ethers-service';
import {
    getPreference,
    KEY_AUTO_SIGN_METADATA,
} from './stores/preferences-store';

class IrysProvider {
    private readonly provider: JsonRpcProvider;
    private readonly signer: Signer;
    constructor(provider: JsonRpcProvider, signer: Signer) {
        this.provider = provider;
        this.signer = signer;
    }
    getProvider = () => this.provider;
    getSigner = () => this.signer;
}

export const getIrys: () => Promise<WebIrys> = async () => {
    let provider;

    const autoSign = await getPreference(KEY_AUTO_SIGN_METADATA, true);
    if (autoSign) {
        const rpcProvider = new JsonRpcProvider(getRpcUrl());
        try {
            const signer = Wallet.createRandom().connect(rpcProvider);
            provider = new IrysProvider(rpcProvider, signer);
        } catch (e) {
            console.error('getIrys: error creating signer', e);
        }
    }

    if (!provider) {
        provider = await getProvider();
    }

    const url = 'node2';
    const token = 'matic';
    const wallet = { name: 'ethersv6', provider };
    const irys = new WebIrys({ url, token, wallet });

    await irys.ready();

    return irys;
};
