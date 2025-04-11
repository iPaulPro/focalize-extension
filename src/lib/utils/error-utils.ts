import { toast } from 'svelte-sonner';
import { AuthenticationError, SigningError, ValidationError } from '@lens-protocol/client';
import { clearUser } from '@/lib/stores/user-store';
import { browser } from 'wxt/browser/chrome';

export class NoWalletError extends Error {
    constructor() {
        super('No wallet found');
        this.name = 'NoWalletError';
        Object.setPrototypeOf(this, NoWalletError.prototype);
    }
}

export class NoSessionError extends Error {
    constructor() {
        super('No Lens session found');
        this.name = 'NoSessionError';
        Object.setPrototypeOf(this, NoSessionError.prototype);
    }
}

export const SIGNING_ERROR_MSG = 'Please use the wallet address you used to sign in.';

export const onError = (error: Error, msg?: string) => {
    if (msg) {
        console.error(msg, error);
    } else {
        console.error(error);
    }

    if (error instanceof NoSessionError) {
        toast.error(msg ?? 'No Lens session found. Please sign in again.', { duration: 5000 });
        clearUser();
        browser.runtime.openOptionsPage();
    } else if (error instanceof NoWalletError) {
        toast.error(msg ?? 'No wallet found. Please connect a wallet', { duration: 5000 });
    } else if (error instanceof SigningError) {
        toast.error(SIGNING_ERROR_MSG, { duration: 5000 });
    } else if (error instanceof AuthenticationError) {
        toast.error(msg ?? 'Authentication error. Please sign in again.', { duration: 5000 });
        clearUser();
        browser.runtime.openOptionsPage();
    } else if (error instanceof ValidationError) {
        toast.error(error.message, { duration: 5000 });
    } else {
        toast.error(msg ?? 'An unexpected error occurred. Please try again.', {
            duration: 5000,
        });
    }
};
