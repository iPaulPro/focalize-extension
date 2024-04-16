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
    : '0x6111e258a6d00d805DcF1249900895c7aA0cD186';

export const PWYW_COLLECT_MODULE: string = isMainnet
    ? '0xD9968D6A7C0B550a9a66aC202de66E95673e676B'
    : '0xD9968D6A7C0B550a9a66aC202de66E95673e676B';

export const COLLECT_PUBLICATION_ACTION = isMainnet
    ? LensContracts.mainnet.Modules.act.find(
          (a) => a.name === 'CollectPublicationAction'
      )?.address
    : LensContracts.testnet.Modules.act.find(
          (a) => a.name === 'CollectPublicationAction'
      )?.address;
