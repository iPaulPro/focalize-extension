import axios from 'axios';
import { CURRENT_CHAIN_ID } from '@/lib/config';
import { Signer } from '@lens-chain/sdk/ethers';
import { immutable, StorageClient } from '@lens-chain/storage-client';

export const GROVE_GATEWAY_URL = 'https://api.grove.storage/';

export interface GroveFile extends File {
    /**
     * Storage key for the file
     */
    key: string;
}

/**
 * Uploads a file to the Grove storage with a mutable ACL
 * @param file File to upload
 * @param walletAddress Wallet address to set the ACL to
 * @param cb Callback to track upload progress
 * @returns The storage key of the uploaded file
 */
export const uploadMutableFile = async (
    file: File,
    walletAddress: string,
    cb?: (progress: number) => void,
): Promise<string> => {
    const keyRes = await axios.post('https://api.grove.storage/link/new');
    const key = keyRes.data[0].storage_key;
    console.log('uploadFile: created key', key);

    if (!key) {
        throw new Error('Error uploading file');
    }

    const acl = {
        template: 'wallet_address',
        wallet_address: walletAddress,
        chain_id: Number(CURRENT_CHAIN_ID),
    };
    const blob = new Blob([JSON.stringify(acl)], { type: 'application/json' });
    const aclFile = new File([blob], 'acl.json', { type: 'application/json' });

    const formData = new FormData();
    formData.append(key, file);
    formData.append('lens-acl.json', aclFile);

    const res = await axios.post(`https://api.grove.storage/${key}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (p) => {
            console.log(p);
            if (cb) {
                const progress = (p.progress ?? 0) * 100;
                cb(progress);
            }
        },
    });

    console.log('uploadFile: result =', res);
    return key;
};

/**
 * Uploads a file to the Grove storage with an immutable ACL
 * @param file File to upload
 * @returns The storage key of the uploaded file
 */
export const uploadImmutableFile = async (file: File): Promise<string> => {
    const storageClient = StorageClient.create();
    const acl = immutable(Number(CURRENT_CHAIN_ID));
    const { storageKey } = await storageClient.uploadFile(file, { acl });
    console.log('uploadImmutableFile: success! storageKey', storageKey);
    return storageKey;
};

/**
 * Uploads a JSON object to the Grove storage
 * @param json JSON object to upload
 * @returns URI of the uploaded JSON object
 */
export const uploadJson = async (json: any): Promise<string> => {
    const storageClient = StorageClient.create();
    const acl = immutable(Number(CURRENT_CHAIN_ID));
    const { uri } = await storageClient.uploadAsJson(json, { acl });
    console.log('uploadJson: success! uri', uri);
    return uri;
};

/**
 * Downloads a file from the Grove storage
 * @param key Storage key of the file
 * @returns True if the download was successful
 */
export const deleteFile = async (key: string, signer: Signer): Promise<boolean> => {
    if (!key) throw new Error('Key cannot be null');
    console.log('deleteFile: key', key);

    const storageClient = StorageClient.create();
    const res = await storageClient.delete(key, {
        signMessage({ message }: { message: string }): Promise<string> {
            return signer.signMessage(message);
        },
    });

    return res.success;
};
