import {Web3Storage} from "web3.storage";

const web3Storage = new Web3Storage({token: import.meta.env.VITE_WEB3_STORAGE_TOKEN});

export const uploadFile = async (file) => await web3Storage.put(
    [file],
    {
        wrapWithDirectory: false,
        maxRetries: 3,
    }
);