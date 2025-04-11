import { searchAccounts } from '../lens-service';
import { type SimpleAccount, toSimpleAccount } from '../types/SimpleAccount';

export const searchUsernames = (
    query: string,
    limit: number = 5,
    cb?: (accounts: SimpleAccount[]) => void,
): Promise<SimpleAccount[]> =>
    searchAccounts(query)
        .then((accounts) => {
            const simpleAccounts = accounts.slice(0, limit).map(toSimpleAccount);
            if (cb) cb(simpleAccounts);
            return simpleAccounts;
        })
        .catch(() => []);
