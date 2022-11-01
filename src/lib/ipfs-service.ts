// import {Web3Storage} from "web3.storage";
// import type {CIDString} from "web3.storage";
import axios from "axios";

// const web3Storage = new Web3Storage({token: import.meta.env.VITE_WEB3_STORAGE_TOKEN});

const AUTH_TOKEN = `${import.meta.env.VITE_INFURA_PROJECT_ID}:${import.meta.env.VITE_INFURA_PROJECT_SECRET}`

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

export const uploadFile = async (file, cb?: (number) => {}): Promise<string> => {
    const auth = btoa(`${AUTH_TOKEN}`)

    let formData = new FormData();
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
                    const progress = Math.round((p.loaded * 100) / p.total);
                    cb(progress);
                }
            }
        }
    );

    return res.data.Hash;
}