import type { Profile, SearchQueryRequest } from '../graph/lens-service';
import {
    SearchProfilesDocument,
    SearchRequestTypes,
} from '../graph/lens-service';
import { GraphQLClient } from 'graphql-request';
import { LENS_API } from '../../config';

let searchAbortController: AbortController;

const searchProfiles = async (
    query: string,
    limit: number = 5
): Promise<Profile[]> => {
    searchAbortController?.abort();
    searchAbortController = new AbortController();

    const client = new GraphQLClient(LENS_API, { fetch });
    const request: SearchQueryRequest = {
        query,
        type: SearchRequestTypes.Profile,
        limit,
    };
    const { search } = await client.request({
        document: SearchProfilesDocument,
        variables: { request },
        signal: searchAbortController.signal,
    });

    if (search.__typename === 'ProfileSearchResult')
        return search.items as Profile[];
    return [];
};

export const searchHandles = (
    query: string,
    limit: number,
    cb: (profiles: Profile[]) => void
) =>
    searchProfiles(query, limit)
        .then((profiles) => cb(profiles))
        .catch(() => {});
