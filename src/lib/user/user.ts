import { getUser, saveUser } from '../stores/user-store';
import { getMe, isAuthenticated } from '../lens-service';
import type { Account } from '@lens-protocol/client';
import { getAccountAvatar } from '../utils/lens-utils';
import { User } from '@/lib/types/User';
import { sleep } from '@/lib/utils/utils';
import { clearNotificationCache } from '@/lib/stores/cache-store';
import { onError } from '@/lib/utils/error-utils';

const userFromAccount = (address: string, account: Account, signless: boolean): User => {
    const avatarUrl = getAccountAvatar(account);

    return {
        address,
        account: account.address,
        username: account.username?.value,
        name: account.metadata?.name,
        avatarUrl,
        signless,
    };
};

/**
 * Ensures that the user is logged in, otherwise opens the options page
 */
export const ensureUser = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
        const savedUser = await getUser();
        if (savedUser && savedUser.account) {
            return { user: savedUser };
        }
    }

    await browser.runtime.openOptionsPage();
    window?.close();
};

export const onLogin = async (address: string, account?: Account) => {
    if (!account) {
        await saveUser({ address });
        return;
    }

    try {
        const me = await getMe();
        const user = userFromAccount(address, account, me?.isSignless ?? false);
        await saveUser(user);
        console.log('Authenticated user', user);
    } catch (e) {
        if (e instanceof Error) {
            onError(e);
        }
    }

    await clearNotificationCache();

    // delay to avoid hitting rate limits
    await sleep(5000);

    try {
        await browser.runtime.sendMessage({
            type: 'setNotificationsAlarm',
            enabled: true,
        });
    } catch (e) {
        console.error('Error setting notification alarm', e);
    }
};
