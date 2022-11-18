import {writable} from "svelte/store";
import type {Writable} from "svelte/store";

const storedDarkMode = localStorage.darkMode;

export const darkMode: Writable<boolean> = writable(storedDarkMode === 'true');

darkMode.subscribe((value) => localStorage.darkMode = String(value));
