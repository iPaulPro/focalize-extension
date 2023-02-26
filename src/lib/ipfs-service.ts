// import {Web3Storage} from "web3.storage";
// import type {CIDString} from "web3.storage";
import axios from "axios";

// const web3Storage = new Web3Storage({token: import.meta.env.VITE_WEB3_STORAGE_TOKEN});

const AUTH_TOKEN = `${import.meta.env.VITE_INFURA_IPFS_PROJECT_ID}:${import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET}`

// export const uploadFile = async (file): Promise<CIDString> =>
//     await web3Storage.put(
//         [file],
//         {
//             wrapWithDirectory: false,
//             maxRetries: 3,
//         }
//     );

// export const uploadFileWithProgress = async (file: File, cb: (number) => {}): Promise<CIDString> => {
//     // show the root cid as soon as it's ready
//     const onRootCidReady = cid => {
//         console.log('uploading files with cid:', cid);
//     };
//
//     // when each chunk is stored, update the percentage complete and display
//     let uploaded = 0;
//
//     const onStoredChunk = size => {
//         uploaded += size;
//         const pct = 100 * (uploaded / file.size);
//         console.log(`Uploading... ${pct.toFixed(2)}% complete`);
//         cb(Math.min(100, pct));
//     };
//
//     // client.put will invoke our callbacks during the upload
//     // and return the root cid when the upload completes
//     return web3Storage.put([file], {
//         onRootCidReady,
//         onStoredChunk,
//         wrapWithDirectory: false,
//         maxRetries: 3
//     });
// };

export const uploadAndPin = async (file: File, cb?: (progress: number) => {}): Promise<string> => {
    const auth = btoa(`${AUTH_TOKEN}`)

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
        "https://ipfs.infura.io:5001/api/v0/add",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
                'Authorization': `Basic ${auth}`
            },
            onUploadProgress: (p) => {
                console.log(p);
                if (cb) {
                    const progress = (p.progress ?? 0) * 100;
                    cb(progress);
                }
            }
        }
    );

    console.log('uploadFile: result =', res);

    return res.data.Hash;
}

export const unpin = async (cid: string): Promise<string[]> => {
    if (!cid) throw new Error('CID cannot be null');

    const auth = btoa(`${AUTH_TOKEN}`)

    const res = await axios.post(
        "https://ipfs.infura.io:5001/api/v0/pin/rm?arg=" + cid,
        {},
        {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        }
    );

    console.log('unpin: result =', res);

    return res.data.Pins;
};

export const ipfsUrlToGatewayUrl = (
    ipfsUrl: string,
    gatewayDomain: string = 'https://ipfs.io/ipfs/'
): string => {
    // Extract the CID from the IPFS URL
    const cid = ipfsUrl.replace("ipfs://", "").replace(/^\/+|\/+$/g, "");

    // Build the Infura IPFS gateway URL
    const gatewayUrl = gatewayDomain + cid;

    // Add the path, if any
    const path = ipfsUrl.split(cid)[1];

    return path ? `${gatewayUrl}${path}` : gatewayUrl;
};
