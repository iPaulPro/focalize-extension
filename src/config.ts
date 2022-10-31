const getParamOrExit = (name: string) => {
    const param = import.meta.env[name];
    if (!param) {
        console.error(`Required config param '${name}' missing`);
        process.exit(1);
    }
    return param;
};

export const APP_ID: string = "Focalize";

export const LENS_API: string = getParamOrExit('VITE_LENS_API');

export const LENS_HUB_CONTRACT: string = getParamOrExit('VITE_LENS_HUB_CONTRACT');