import {writable} from "svelte-local-storage-store";
import type {Writable} from "svelte/store";

export const darkMode: Writable<boolean> = writable('darkMode', false);

export const dispatcherDialogShown: Writable<boolean> = writable('dispatcherDialogShown', false);

export const signAsSelf: Writable<boolean> = writable('signAsSelf', false);
