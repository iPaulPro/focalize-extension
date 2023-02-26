import {SearchRequestTypes} from "../graph/lens-service";
import type {Profile, SearchQueryRequest} from "../graph/lens-service";
import type {TributeItem} from "tributejs";

import client from "../graph/graphql-client";
import {getSdk} from "../graph/lens-service";

export const searchProfiles = async (query: string, limit: number = 5): Promise<Profile[]> => {
    const sdk = getSdk(client);
    const request: SearchQueryRequest = {query, type: SearchRequestTypes.Profile, limit}
    const {search} = await sdk.SearchProfiles({request});
    if (search.__typename === 'ProfileSearchResult') return search.items as Profile[];
    return [];
}

export const searchHandles = (query: string, limit: number, cb: (profiles: Profile[]) => void) => {
    searchProfiles(query, limit)
        .then(profiles => cb(profiles))
        .catch(console.error)
}

export const buildTributeUsernameMenuTemplate = (item: TributeItem<Profile>) => {
    const profile: Profile = item.original;

    const handleView = document.createElement('div');
    handleView.className = 'text-base font-medium dark:text-white truncate';
    handleView.innerText = '@' + profile.handle;

    const subtextView = document.createElement('div');
    subtextView.className = 'text-gray-600 dark:text-gray-200 text-sm truncate';
    subtextView.innerText = profile.name || profile.onChainIdentity?.ens?.name || profile.ownedBy;

    const textContainer = document.createElement('div');
    textContainer.className = 'flex-1 pl-1 mr-8 overflow-hidden';
    textContainer.appendChild(handleView);
    textContainer.appendChild(subtextView);

    const imageView = document.createElement('img');
    imageView.alt = `${profile.handle}'s avatar`;
    imageView.className = 'mx-auto object-cover rounded-full h-10 w-10';
    imageView.src = `https://cdn.stamp.fyi/avatar/${profile.ownedBy}?s=96`;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'flex flex-col w-10 h-10 justify-center items-center mr-3';
    imageContainer.appendChild(imageView);

    const outerContainer = document.createElement('div');
    outerContainer.className = 'flex flex-1 px-1 items-center overflow-hidden';
    outerContainer.appendChild(imageContainer);
    outerContainer.appendChild(textContainer);

    const row = document.createElement('div');
    row.className = 'flex flex-row overflow-hidden';
    row.appendChild(outerContainer);

    return row.outerHTML;
}

export const buildLoadingItemTemplate = () => `<div class="">Loading...</div>`;