import type { ProfileFragment } from '@lens-protocol/client';
import { searchProfiles } from '../lens-service';

let searchAbortController: AbortController;

// const searchProfiles = async (
//     query: string,
//     limit: number = 5
// ): Promise<ProfileFragment[]> => {
//     searchAbortController?.abort();
//     searchAbortController = new AbortController();
//
//     const client = new GraphQLClient(LENS_API, { fetch });
//     const request: SearchQueryRequest = {
//         query,
//         type: SearchRequestTypes.Profile,
//         limit,
//     };
//     const { search } = await client.request({
//         document: SearchProfilesDocument,
//         variables: { request },
//         signal: searchAbortController.signal,
//     });
//
//     if (search.__typename === 'ProfileSearchResult')
//         return search.items as Profile[];
//     return [];
// };

export const searchHandles = (
    query: string,
    limit: number,
    cb: (profiles: ProfileFragment[]) => void
) =>
    searchProfiles(query)
        .then((profiles) => cb(profiles.slice(0, limit)))
        .catch(() => {});
