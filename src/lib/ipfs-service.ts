import axios from "axios";

const AUTH_TOKEN = `${import.meta.env.VITE_INFURA_IPFS_PROJECT_ID}:${import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET}`

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

export const getCidFromIpfsUrl = (ipfsUrl: string): string => {
    if (!ipfsUrl.startsWith('ipfs://')) throw new Error('IPFS urls must begin with ipfs://');
    return ipfsUrl.replace("ipfs://", "").replace(/^\/+|\/+$/g, "");
}

export const ipfsUrlToGatewayUrl = (
    ipfsUrl: string,
    gatewayDomain: string = 'https://ipfs.io/ipfs/'
): string | undefined => {
    if (!ipfsUrl || ipfsUrl.length === 0 || !ipfsUrl.startsWith('ipfs://')) return ipfsUrl;
    const cid = getCidFromIpfsUrl(ipfsUrl);
    const gatewayUrl = gatewayDomain + cid;
    const path = ipfsUrl.split(cid)[1];
    return path ? `${gatewayUrl}${path}` : gatewayUrl;
};
