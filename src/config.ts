import lensHubAbi from './abis/lens-hub-contract-abi.json';
import peripheryProviderAbi from './abis/lens-periphery-data-provider.json';

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

export const PK = getParamOrExit('PK');

export const LENS_API = getParamOrExit('VITE_LENS_API');

export const LENS_HUB_CONTRACT = getParamOrExit('VITE_LENS_HUB_CONTRACT');

export const LENS_PERIPHERY_CONTRACT = getParamOrExit('VITE_LENS_PERIPHERY_CONTRACT');

export const LENS_PERIPHERY_NAME = 'LensPeriphery';

export const LENS_HUB_ABI = lensHubAbi;

export const LENS_PERIPHERY_ABI = peripheryProviderAbi;

export const INFURA_PROJECT_ID = getParam('VITE_INFURA_PROJECT_ID');

export const INFURA_SECRET = getParam('VITE_INFURA_SECRET');