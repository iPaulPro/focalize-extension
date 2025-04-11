import type { TributeItem } from 'tributejs';
import type { SimpleAccount } from '../types/SimpleAccount';
import { formatUsernameV2toLocalName } from '../utils/lens-utils';
import { truncateAddress } from '../utils/utils';

export const buildTributeUsernameMenuTemplate = (item: TributeItem<SimpleAccount>) => {
    const account: SimpleAccount = item.original;

    const usernameView = document.createElement('div');
    usernameView.className = 'text-base font-medium dark:text-white truncate';
    usernameView.innerText = formatUsernameV2toLocalName(account.username!);

    const subtextView = document.createElement('div');
    subtextView.className = 'text-gray-600 dark:text-gray-200 text-sm truncate';
    subtextView.innerText = account.displayName || account?.ens || truncateAddress(account.address);

    const textContainer = document.createElement('div');
    textContainer.className = 'flex-1 pl-1 mr-8 overflow-hidden';
    textContainer.appendChild(usernameView);
    textContainer.appendChild(subtextView);

    const imageView = document.createElement('img');
    imageView.alt = `${account.username}'s avatar`;
    imageView.className = 'mx-auto object-cover rounded-full h-10 w-10';
    imageView.src = `https://cdn.stamp.fyi/avatar/${account.ownedBy}?s=96`;

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
};
