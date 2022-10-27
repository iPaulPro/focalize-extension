import {Web3Storage} from "web3.storage";
import type {CIDString} from "web3.storage";

const web3Storage = new Web3Storage({token: import.meta.env.VITE_WEB3_STORAGE_TOKEN});

export const uploadFile = async (file): Promise<CIDString> =>
    await web3Storage.put(
        [file],
        {
            wrapWithDirectory: false,
            maxRetries: 3,
        }
    );

export const uploadFileWithProgress = async (file: File, cb: (number) => {}): Promise<CIDString> => {
    // show the root cid as soon as it's ready
    const onRootCidReady = cid => {
        console.log('uploading files with cid:', cid);
    };

    // when each chunk is stored, update the percentage complete and display
    let uploaded = 0;

    const onStoredChunk = size => {
        uploaded += size;
        const pct = 100 * (uploaded / file.size);
        console.log(`Uploading... ${pct.toFixed(2)}% complete`);
        cb(Math.min(100, pct));
    };

    // client.put will invoke our callbacks during the upload
    // and return the root cid when the upload completes
    return web3Storage.put([file], {
        onRootCidReady,
        onStoredChunk,
        wrapWithDirectory: false,
        maxRetries: 3
    });
};

export const retrieve = async (cid) => {
    const res = await fetch(
        `https://${cid}.ipfs.nftstorage.link`,
        { method: "HEAD" }
    );
    console.log(`Got a response! [${res.status}] ${res.statusText} ${res.headers.get('content-type')}`);

    if (!res.ok) {
        throw new Error(`failed to get ${cid}`);
    }

    return {
        type: res.headers.get('content-type'),
        size: res.headers.get('content-length')
    };
};