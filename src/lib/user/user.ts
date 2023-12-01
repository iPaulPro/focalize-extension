import { currentUser, getUser, saveUser } from '../stores/user-store';
import { getAvatarForLensHandle } from '../utils/utils';
import { isAuthenticated } from '../lens-service';
import type { ProfileFragment } from '@lens-protocol/client';

export type User = {
    address: string;
    profileId: string;
    handle: string | undefined;
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

export const userFromProfile = (profile: ProfileFragment): User => {
    const avatarUrl = profile.handle
        ? getAvatarForLensHandle(profile.handle.fullHandle)
        : undefined;

    return {
        address: profile.ownedBy.address,
        profileId: profile.id,
        handle: profile.handle?.fullHandle,
        name: profile.metadata?.displayName,
        avatarUrl,
        canUseRelay: profile.signless,
    };
};

/**
 * Ensures that the user is logged in, otherwise opens the options page
 */
export const ensureUser = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
        const savedUser = await getUser();
        if (savedUser) {
            return { user: savedUser };
        }
    }

    chrome.runtime.openOptionsPage();
    window?.close();
};

export const onLogin = async (profile: ProfileFragment) => {
    const user = userFromProfile(profile);
    await saveUser(user);
    console.log('Authenticated user', user);

    try {
        await chrome.runtime.sendMessage({
            type: 'setNotificationsAlarm',
            enabled: true,
        });
    } catch (e) {
        console.error('Error setting notification alarm', e);
    }
};
