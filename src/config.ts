import lensHubAbi from './abis/lens-hub-contract-abi.json';

const getParamOrExit = (name: string) => {
    const param = import.meta.env[name];
    if (!param) {
        console.error(`Required config param '${name}' missing`);
        process.exit(1);
    }
    return param;
};

const getParam = (name: string) => {
    const param = import.meta.env[name];
    if (!param) {
        return null;
    }
    return param;
};

export const APP_ID = "Focalize";

export const LENS_API = getParamOrExit('VITE_LENS_API');

export const LENS_HUB_CONTRACT = getParamOrExit('VITE_LENS_HUB_CONTRACT');

export const LENS_HUB_ABI = lensHubAbi;