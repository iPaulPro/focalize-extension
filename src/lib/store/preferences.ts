import {writable} from "svelte/store";
import type {Writable} from "svelte/store";

const storedDarkMode = localStorage.darkMode;

export const darkMode: Writable<boolean> = writable(storedDarkMode === 'true');

darkMode.subscribe((value: boolean) => localStorage.darkMode = String(value));


const storedDispatcherDialogShown = localStorage.dispatcherDialogShown;

export const dispatcherDialogShown: Writable<boolean> = writable(storedDispatcherDialogShown === 'true');

dispatcherDialogShown.subscribe((value: boolean) => localStorage.dispatcherDialogShown = String(value));


const storedSignAsSelf = localStorage.signAsSelf;

export const signAsSelf: Writable<boolean> = writable(storedSignAsSelf === 'true');

signAsSelf.subscribe((value: boolean) => localStorage.signAsSelf = String(value));
