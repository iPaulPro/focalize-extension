// @ts-ignore
import {chromeStorageSync} from "../chrome-storage-store";
import type {Writable} from "svelte/store";

export const compactMode: Writable<boolean> = chromeStorageSync('compactMode', false);

export const darkMode: Writable<boolean> = chromeStorageSync('darkMode', false);

export const dispatcherDialogShown: Writable<boolean> = chromeStorageSync('dispatcherDialogShown', false);

export const showLocales: Writable<boolean> = chromeStorageSync('showLocales', true);

export const useDispatcher: Writable<boolean> = chromeStorageSync('useDispatcher', true);

export const useRelay: Writable<boolean> = chromeStorageSync('useRelay', true);

export const welcomeShown: Writable<boolean> = chromeStorageSync('welcomeShown', false);