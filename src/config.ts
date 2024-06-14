import { LensContracts } from 'lens-modules';

const getParamOrExit = (name: string) => {
    const param = import.meta.env[name];
    if (!param) {
        console.error(`Required config param '${name}' missing`);
        process.exit(1);
    }
    return param;
};

export const APP_ID: string = 'focalize';

export const LENS_API: string = getParamOrExit('VITE_LENS_API');

export const LENS_HUB_CONTRACT: string = getParamOrExit(
    'VITE_LENS_HUB_CONTRACT'
);

export const CHAIN_ID: string = getParamOrExit('VITE_CHAIN_ID');

export const isMainnet = CHAIN_ID === '137';

export const INFURA_PROJECT_ID: string = getParamOrExit(
    'VITE_INFURA_PROJECT_ID'
);

export const INFURA_IPFS_PROJECT_ID: string = getParamOrExit(
    'VITE_INFURA_IPFS_PROJECT_ID'
);

export const INFURA_IPFS_PROJECT_SECRET: string = getParamOrExit(
    'VITE_INFURA_IPFS_PROJECT_SECRET'
);

export const INFURA_GATEWAY_URL: string = getParamOrExit(
    'VITE_INFURA_GATEWAY_URL'
);

export const LENS_PREVIEW_NODE: string = getParamOrExit(
    'VITE_LENS_PREVIEW_NODE'
);

export const GIPHY_KEY: string = getParamOrExit('VITE_GIPHY_KEY');

export const WALLETCONNECT_PROJECT_ID: string = getParamOrExit(
    'VITE_WALLETCONNECT_PROJECT_ID'
);

export const ALCHEMY_ETH_API_KEY: string = getParamOrExit(
    'VITE_ALCHEMY_ETH_API_KEY'
);

export const ALCHEMY_MATIC_API_KEY: string = getParamOrExit(
    'VITE_ALCHEMY_MATIC_API_KEY'
);

export const ENS_REVERSE_RECORDS_ADDRESS: string = getParamOrExit(
    'VITE_ENS_REVERSE_RECORDS'
);

export const TIP_ACTION_MODULE: string = isMainnet
    ? '0x22cb67432C101a9b6fE0F9ab542c8ADD5DD48153'
    : '0x2cB57904A3E28Ff861f78dA410157E0b6c086aba';

export const PWYW_COLLECT_MODULE: string = isMainnet
    ? '0x7fbD7496CaE2DAcad7a62350DA8488E31eC026eA'
    : '0x3d06AA6ca4FC7eE0D5581B85CB52CA7714175e43';

export const COLLECT_PUBLICATION_ACTION = isMainnet
    ? LensContracts.mainnet.Modules.act.find(
          (a) => a.name === 'CollectPublicationAction'
      )?.address
    : LensContracts.testnet.Modules.act.find(
          (a) => a.name === 'CollectPublicationAction'
      )?.address;

export const AUCTION_ACTION_MODULE: string = isMainnet
    ? '0x857b5e09d54AD26580297C02e4596537a2d3E329'
    : '0xd935e230819AE963626B31f292623106A3dc3B19';
