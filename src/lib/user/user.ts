import type { Profile } from '../graph/lens-service';
import { getSavedAccessToken } from './lens-auth';
import { getUser } from '../stores/user-store';
import { getAvatarForLensHandle } from '../utils/utils';

export type User = {
    address: string;
    profileId: string;
    handle: string;
    name: string | undefined | null;
    avatarUrl: string | undefined;
    canUseRelay: boolean;
};

export enum UserError {
    WALLET_NOT_CONNECTED,
    NOT_AUTHENTICATED,
    NO_PROFILE,
    UNKNOWN,
}

export const userFromProfile = (profile: Profile): User => {
    const avatarUrl = getAvatarForLensHandle(profile.handle);

    return {
        address: profile.ownedBy,
        profileId: profile.id,
        handle: profile.handle,
        name: profile.name,
        avatarUrl,
        canUseRelay: profile.dispatcher?.canUseRelay ?? false,
    };
};

/**
 * Ensures that the user is logged in, otherwise opens the options page
 */
export const ensureUser = async () => {
    // Simply check for an existing access token as a signal that the user has logged in before
    // We don't need to know if it's valid right now
    const accessToken = await getSavedAccessToken();
    if (accessToken) {
        const savedUser = await getUser();
        if (savedUser) {
            return { user: savedUser };
        }
    }

    chrome.runtime.openOptionsPage();
    window?.close();
};
