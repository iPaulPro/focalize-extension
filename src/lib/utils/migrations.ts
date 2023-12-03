import {
    ALL_NODE_KEYS,
    deletePreference,
    getPreference,
    KEY_NODE_ARTICLE,
    KEY_NODE_NOTIFICATIONS,
    KEY_NODE_SEARCH,
    KEY_NODE_VIDEO,
} from '../stores/preferences-store';
import { LENS_NODES, type LensNode } from '../publications/lens-nodes';
import { KEY_WALLET_CONNECTION, saveToCache } from '../stores/cache-store';

const updateSavedLensterNodes = async () => {
    const syncStorage = await chrome.storage.sync.get([
        ...ALL_NODE_KEYS,
        KEY_NODE_NOTIFICATIONS,
        KEY_NODE_SEARCH,
    ]);
    Object.entries(syncStorage).forEach(([key, value]) => {
        if (value.name === 'Lenster') {
            chrome.storage.sync.set({ [key]: LENS_NODES[0] });
        }
    });
};

const updateNodes = async () => {
    await updateSavedLensterNodes();

    const nodeArticle = await getPreference<LensNode>(KEY_NODE_ARTICLE);
    if (nodeArticle?.name === 'Share') {
        await chrome.storage.sync.set({
            [KEY_NODE_ARTICLE]: LENS_NODES[0],
        });
    }

    const nodeVideo = await getPreference<LensNode>(KEY_NODE_VIDEO);
    if (nodeVideo?.name === 'Lenstube') {
        await chrome.storage.sync.set({
            [KEY_NODE_VIDEO]: LENS_NODES.find((n) => n.name === 'Tape'),
        });
    }
};

const moveWalletCacheToLocal = async () => {
    const walletConnection = await getPreference(KEY_WALLET_CONNECTION);
    if (walletConnection) {
        await saveToCache(KEY_WALLET_CONNECTION, walletConnection);
        await deletePreference(KEY_WALLET_CONNECTION);
    }
};

export const migrate = async (previousVersion: string) => {
    switch (previousVersion) {
        case '1.9.10':
            await updateNodes();
            await moveWalletCacheToLocal();
            break;
    }
};
