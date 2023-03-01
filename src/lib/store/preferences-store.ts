import {chromeStorageSync} from "./chrome-storage-store";
import type {Writable} from "svelte/store";
import type {LensNode} from "../lens-nodes";

import nodes from '../../lib/store/nodes.json';

const defaultNode = nodes[0];

export type RefreshInterval = {
    value: number,
    label: string
}

export const compactMode: Writable<boolean> = chromeStorageSync('compactMode', true);

export const darkMode: Writable<boolean> = chromeStorageSync('darkMode', false);

export const dispatcherDialogShown: Writable<boolean> = chromeStorageSync('dispatcherDialogShown', false);

export const showLocales: Writable<boolean> = chromeStorageSync('showLocales', true);

export const useDispatcher: Writable<boolean> = chromeStorageSync('useDispatcher', true);

export const useRelay: Writable<boolean> = chromeStorageSync('useRelay', true);

export const welcomeShown: Writable<boolean> = chromeStorageSync('welcomeShown', false);

export const releaseDismissed: Writable<string> = chromeStorageSync('releaseDismissed');

export const nodePost: Writable<LensNode> = chromeStorageSync('nodePost', defaultNode);

export const nodeImage: Writable<LensNode> = chromeStorageSync('nodeImage', defaultNode);

export const nodeVideo: Writable<LensNode> = chromeStorageSync('nodeVideo', defaultNode);

export const nodeAudio: Writable<LensNode> = chromeStorageSync('nodeAudio', defaultNode);

export const nodeArticle: Writable<LensNode> = chromeStorageSync('nodeArticle', defaultNode);

export const nodeNotifications: Writable<LensNode> = chromeStorageSync('nodeNotifications', defaultNode);

export const nodeSearch: Writable<LensNode> = chromeStorageSync('nodeSearch', defaultNode);

export const notificationsEnabled: Writable<boolean> = chromeStorageSync('notificationsEnabled', true);

export const notificationsRefreshInterval: Writable<RefreshInterval> = chromeStorageSync('notificationsRefreshInterval', {value: 15, label: '15 min'});

export const notificationsTimestamp: Writable<string> = chromeStorageSync('notificationsTimestamp');