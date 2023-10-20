//@ts-ignore
import namehash from 'eth-ens-namehash';
import {
    type ReverseRecords,
    ReverseRecords__factory,
} from '../../contracts/types';
import { ENS_REVERSE_RECORDS_ADDRESS } from '../../config';
import { getDefaultProvider } from '../evm/get-default-provider';

export const lookupAddresses = async (
    addresses: string[]
): Promise<Map<string, string | null>> => {
    const reverseRecords: ReverseRecords = ReverseRecords__factory.connect(
        ENS_REVERSE_RECORDS_ADDRESS,
        getDefaultProvider()
    );

    const names = await reverseRecords.getNames(addresses);

    const map = new Map<string, string | null>();
    for (let i = 0; i < addresses.length; i++) {
        const normalizedName: string | null = names[i]
            ? namehash.normalize(names[i])
            : null;
        map.set(addresses[i], normalizedName);
    }

    return map;
};
