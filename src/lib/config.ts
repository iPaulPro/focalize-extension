const getParamOrExit = (name: string) => {
    const param = import.meta.env[name];
    if (!param) {
        console.error(`Required config param '${name}' missing`);
        process.exit(1);
    }
    return param;
};

export const APP_ADDRESS: string = getParamOrExit('VITE_LENS_APP');

export const CURRENT_CHAIN_ID: string = getParamOrExit('VITE_CHAIN_ID');

export const GIPHY_KEY: string = getParamOrExit('VITE_GIPHY_KEY');

export const WALLETCONNECT_PROJECT_ID: string = getParamOrExit('VITE_WALLETCONNECT_PROJECT_ID');

export const ALCHEMY_ETH_API_KEY: string = getParamOrExit('VITE_ALCHEMY_ETH_API_KEY');

export const GLOBAL_FEED_ADDRESS: string = getParamOrExit('VITE_LENS_GLOBAL_FEED');

export const GLOBAL_NAMESPACE_ADDRESS: string = getParamOrExit('VITE_LENS_GLOBAL_NAMESPACE');

export const LENS_TESTNET_CHAIN_ID = 37111;

export const LENS_CHAIN_ID = 232;

export const isMainnet = Number(CURRENT_CHAIN_ID) === LENS_CHAIN_ID;
