import {writable} from "svelte/store";
import type {Writable} from "svelte/store";

const storedDarkMode = localStorage.darkMode;

export const darkMode: any | Writable<boolean> = writable(storedDarkMode === 'true');

darkMode.subscribe((value: any) => localStorage.darkMode = String(value));


const storedDispatcherDialogShown = localStorage.dispatcherDialogShown;

export const dispatcherDialogShown: any | Writable<boolean> = writable(storedDispatcherDialogShown === 'true');

dispatcherDialogShown.subscribe((value: any) => localStorage.dispatcherDialogShown = String(value));
