import {initEthers} from "./ethers-service";
import {getDefaultProfile, getProfiles} from "./lens-profile";

import type {Profile} from "./graph/lens-service";
import {getSavedAccessToken} from "./lens-auth";
import {currentUser} from "./stores/user-store";
import {get} from "./stores/chrome-storage-store";
import {getAvatar} from "./utils";

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
    const avatarUrl = getAvatar(profile);

    return {
        address: profile.ownedBy,
        profileId: profile.id,
        handle: profile.handle,
        name: profile.name,
        avatarUrl,
        canUseRelay: profile.dispatcher?.canUseRelay ?? false
    }
}

export const getCurrentUser = async (): Promise<{user?: User, error?: UserError}> => {
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

    const savedUser = await get(currentUser);
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
            const allProfiles = await getProfiles(address);
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