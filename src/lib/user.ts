import {initEthers} from "./ethers-service";
import {getDefaultProfile, getProfiles} from "./lens-profile";

import type {Profile} from "./graph/lens-service";
import {getSavedAccessToken} from "./lens-auth";
import {currentUser, getUser} from './stores/user-store';
import {getAvatarForLensHandle} from "./utils";

export type User = {
    address: string,
    profileId: string,
    handle: string,
    name: string | undefined | null,
    avatarUrl: string | undefined,
    canUseRelay: boolean
};

export enum UserError {
    WALLET_NOT_CONNECTED,
    NOT_AUTHENTICATED,
    NO_PROFILE,
    UNKNOWN
}

export const userFromProfile = (profile: Profile): User => {
    const avatarUrl = getAvatarForLensHandle(profile.handle);

    return {
        address: profile.ownedBy,
        profileId: profile.id,
        handle: profile.handle,
        name: profile.name,
        avatarUrl,
        canUseRelay: profile.dispatcher?.canUseRelay ?? false
    }
}

export const getAuthenticatedUser = async (): Promise<{user?: User, error?: UserError}> => {
    let address: string;
    let accessToken: string;
    let profile: Profile | undefined;

    // First initiate the provider and get the address
    try {
        const accounts = await initEthers();
        address = accounts[0];
    } catch (e) {
        console.error('getCurrentUser: Error during wallet initialization', e);
        return { error: UserError.WALLET_NOT_CONNECTED };
    }

    if (!address) {
        return { error: UserError.WALLET_NOT_CONNECTED };
    }

    // Simply check for an existing access token as a signal that the user has logged in before
    // We don't need to know if it's valid right now
    try {
        accessToken = await getSavedAccessToken()
    } catch (e) {
        return { error: UserError.NOT_AUTHENTICATED };
    }

    if (!accessToken) {
        console.log('getCurrentUser: No saved access token found, likely first session...');
        return { error: UserError.NOT_AUTHENTICATED };
    }

    const savedUser = await getUser();
    if (savedUser) {
        return {user: savedUser};
    }

    try {
        profile = await getDefaultProfile(address);
    } catch (e) {
        console.error('getCurrentUser: unable to get default Lens profile', e)
    }

    if (!profile) {
        try {
            const allProfiles = await getProfiles([address]);
            profile = allProfiles[0];
        } catch (e) {
            console.error(`getCurrentUser: No profiles found for address ${address}`, e)
        }
    }

    if (!profile) {
        return { error: UserError.NO_PROFILE };
    }

    try {
        const user = userFromProfile(profile);
        return {user};
    } catch (e) {
        return {error: UserError.UNKNOWN};
    }
};

/**
 * Ensures that the user is logged in, otherwise opens the options page
 */
export const ensureUser = async (onUserAuthenticated?: (user: User) => void) => {
    await initEthers();

    if (await getUser()) return;

    try {
        const {user, error} = await getAuthenticatedUser();

        if (error || !user) {
            chrome.runtime.openOptionsPage();
            window?.close();
            return;
        }

        currentUser.set(user);
        onUserAuthenticated?.(user);
    } catch (e) {
        chrome.runtime.openOptionsPage();
        window?.close();
    }
};