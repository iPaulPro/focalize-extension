import {writable} from "svelte/store";
import type {Writable} from 'svelte/store';
import type {User} from "../user";

/**
 * The authenticated Lens user
 */
export const currentUser: any | Writable<User> = writable();

export const clearUser = () => {
    currentUser.set(null);
}