const getParamOrExit = (name: string) => {
    const param = import.meta.env[name];
    if (!param) {
        console.error(`Required config param '${name}' missing`);
        process.exit(1);
    }
    return param;
};

export const APP_ID: string = 'Focalize';

export const LENS_API: string = getParamOrExit('VITE_LENS_API');

export const LENS_HUB_CONTRACT: string = getParamOrExit(
    'VITE_LENS_HUB_CONTRACT'
);

export const CHAIN_ID: string = getParamOrExit('VITE_CHAIN_ID');

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
