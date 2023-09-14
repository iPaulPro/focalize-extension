import type { Notification } from '../graph/lens-service';
import showdown from 'showdown';
import * as cheerio from 'cheerio';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DateTime } from 'luxon';
import type { DecodedMessage } from '@xmtp/xmtp-js';
import { InfuraProvider, type Provider } from 'ethers';
import { INFURA_PROJECT_ID } from '../../config';
import {
    getPreference,
    KEY_MESSAGES_UNREAD_TOPICS,
    KEY_NOTIFICATIONS_TIMESTAMP,
    KEY_USE_POPUP_COMPOSER,
} from '../stores/preferences-store';
import { KEY_WINDOW_TOPIC_MAP } from '../stores/cache-store';
import { tick } from 'svelte';
import { z, ZodType } from 'zod';

export const POPUP_MIN_HEIGHT = 350;

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const isOnToolbar = async (): Promise<boolean> => {
    const settings = await chrome.action.getUserSettings();
    return settings.isOnToolbar;
};

export const getAvatarForLensHandle = (
    handle: string,
    size: number = 128
): string => {
    return `https://cdn.stamp.fyi/avatar/${handle}?s=${size}`;
};

export const getAvatarFromAddress = (
    address: string,
    size: number = 128
): string => {
    return `https://cdn.stamp.fyi/avatar/${address}?s=${size}`;
};

export const htmlFromMarkdown = (
    markdown: string | undefined
): string | undefined => {
    if (!markdown) return undefined;
    const converter = new showdown.Converter({
        simpleLineBreaks: true,
        simplifiedAutoLink: true,
    });
    return converter.makeHtml(markdown);
};

export const extractTextFromHtml = (
    html: string | undefined
): string | undefined => {
    if (!html) return undefined;
    const $ = cheerio.load(html);
    return $.text();
};

export const stripMarkdown = (
    markdown: string | undefined
): string | undefined => {
    if (!markdown) return undefined;
    const html = htmlFromMarkdown(markdown);
    return extractTextFromHtml(html);
};

export const truncate = (
    str: string | null | undefined,
    limit: number | undefined
): string | null | undefined => {
    return !str || !limit || str.length <= limit
        ? str
        : str.slice(0, limit - 1) + '…';
};

export const truncateAddress = (
    address: string,
    maxLength: number = 8
): string => {
    if (address.length <= maxLength) {
        return address;
    }
    const ellipsis = '…';
    const startLength = Math.ceil((maxLength + ellipsis.length) / 2);
    const endLength = Math.floor((maxLength + ellipsis.length) / 2);
    return (
        address.slice(0, startLength) +
        ellipsis +
        address.slice(address.length - endLength)
    );
};

export const launchComposerWindow = async (
    tags?: {
        url?: string;
        title?: string;
        description?: string;
        icon?: string;
    },
    draftId?: string
) => {
    console.log('launchComposerWindow', tags);
    const path = chrome.runtime.getURL('src/window/index.html');
    const url = new URL(path);

    if (tags) {
        if (tags.url) url.searchParams.append('url', tags.url);
        if (tags.title)
            url.searchParams.append('title', truncate(tags.title, 160) ?? '');
        if (tags.description)
            url.searchParams.append(
                'desc',
                truncate(tags.description, 160) ?? ''
            );
        if (tags.icon) url.searchParams.append('icon', tags.icon);
    } else {
        const searchParams: Record<string, string> = getSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            url.searchParams.append(key, value);
        }
        if (draftId) {
            url.searchParams.set('draft', draftId);
        }
    }

    const usePopups = await getPreference<boolean>(KEY_USE_POPUP_COMPOSER);

    if (usePopups) {
        const currentWindow = await chrome.windows.getCurrent();
        const windowRight =
            currentWindow.left !== undefined &&
            currentWindow.width !== undefined
                ? currentWindow.left + currentWindow.width
                : 0;
        const options: chrome.windows.CreateData = {
            url: url.toString(),
            focused: true,
            type: 'popup',
            width: 672,
            height: POPUP_MIN_HEIGHT,
        };
        if (windowRight > 0) {
            options.left = windowRight - 672;
        }
        if (currentWindow.top) {
            options.top = currentWindow.top;
        }
        await chrome.windows.create(options);
    } else {
        await chrome.tabs.create({ url: url.toString() });
    }

    if (typeof window !== 'undefined') {
        window.close();
    }
};

export const launchComposerTab = async (draftId?: string) => {
    const path = chrome.runtime.getURL('src/window/index.html');
    const url = new URL(path);
    const searchParams: Record<string, string> = getSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.append(key, value);
    }

    if (draftId) {
        url.searchParams.set('draft', draftId);
    }

    await chrome.tabs.create({ url: url.toString() });
    window.close();
};

export const launchThreadWindow = async ({
    topic,
    address,
}: { topic?: string; address?: string } = {}) => {
    let url = chrome.runtime.getURL('src/popup/messaging/thread/index.html');
    if (topic) {
        url += '?topic=' + encodeURIComponent(topic);
    } else if (address) {
        url += '?address=' + encodeURIComponent(address);
    }

    if (topic) {
        const storage = await chrome.storage.local.get(KEY_WINDOW_TOPIC_MAP);
        const windowTopicMap = storage[KEY_WINDOW_TOPIC_MAP] ?? {};
        const existingWindow = windowTopicMap[topic];
        if (existingWindow) {
            try {
                await chrome.windows.update(existingWindow, { focused: true });
                if (typeof window !== 'undefined') {
                    window.close();
                }
                return;
            } catch (e) {
                delete windowTopicMap[topic];
                await chrome.storage.local.set({
                    [KEY_WINDOW_TOPIC_MAP]: windowTopicMap,
                });
            }
        }
    }

    const currentWindow = await chrome.windows.getCurrent();
    const windowRight =
        currentWindow.left && currentWindow.width
            ? currentWindow.left + currentWindow.width
            : 0;
    const options: chrome.windows.CreateData = {
        url,
        focused: true,
        type: 'popup',
        width: 400,
        height: 600,
    };
    if (windowRight > 0) {
        options.left = windowRight - 400;
    }
    if (currentWindow.top) {
        options.top = currentWindow.top;
    }

    await chrome.windows.create(options);

    if (typeof window !== 'undefined') {
        window.close();
    }
};

interface ScrollEndListenerOptions {
    delay?: number;
    onScrollEnd?: (node: HTMLElement) => void;
}

export const scrollEndListener = (
    node: HTMLElement,
    options: ScrollEndListenerOptions = {}
): { destroy: () => void } => {
    const { delay = 200, onScrollEnd } = options;
    const destroy = new Subject<void>();

    fromEvent(node, 'scroll')
        .pipe(debounceTime(delay), takeUntil(destroy))
        .subscribe(() => {
            onScrollEnd?.(node);
        });

    return {
        destroy() {
            destroy.next();
            destroy.complete();
        },
    };
};

export const hideOnScroll = (node: HTMLElement, parameters: any) => {
    let targetElement: HTMLElement = parameters.scrollElement;
    let lastScrollTop = targetElement?.scrollTop;

    const reversed = parameters.reversed ?? false;

    const handleScroll = () => {
        const direction =
            targetElement.scrollTop > lastScrollTop ? 'down' : 'up';
        lastScrollTop = targetElement.scrollTop;

        node.style.transition = 'transform 0.3s, opacity 0.3s';

        if (direction === 'down') {
            node.style.transform = reversed
                ? 'translateY(50%)'
                : 'translateY(-50%)';
            node.style.opacity = '0';
        } else {
            node.style.transform = reversed ? '' : 'translateY(0)';
            node.style.opacity = '1';
        }
    };

    if (targetElement) {
        targetElement.addEventListener('scroll', handleScroll);
    }

    return {
        update(params: any) {
            targetElement?.removeEventListener('scroll', handleScroll);
            targetElement = params.scrollElement;
            lastScrollTop = targetElement.scrollTop;
            targetElement?.addEventListener('scroll', handleScroll);
        },
        destroy() {
            targetElement?.removeEventListener('scroll', handleScroll);
        },
    };
};

export interface OpenGraphTags {
    url?: string;
    title?: string | null;
    description?: string | null;
    icon?: string | null;
}

export const getOpenGraphTags = (): OpenGraphTags => ({
    title:
        document.head
            .querySelector("meta[property='og:title']")
            ?.getAttribute('content') ??
        document.head
            .querySelector("meta[name='twitter:title']")
            ?.getAttribute('content'),
    description:
        document.head
            .querySelector("meta[property='og:description']")
            ?.getAttribute('content') ??
        document.head
            .querySelector("meta[name='description']")
            ?.getAttribute('content') ??
        document.head
            .querySelector("meta[name='twitter:description']")
            ?.getAttribute('content'),
});

export const formatFollowerCount = (count: number): string => {
    if (count >= 1_000_000) {
        return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (count >= 10_000) {
        return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
};

/**
 * Parse search params from a URL.
 * @param search The search string to parse.
 * @returns A record of key-value pairs.
 */
export const getSearchParamsMap = (search: string): Record<string, string> => {
    const params: URLSearchParams = new URLSearchParams(search);
    const entries: IterableIterator<[string, string]> = params.entries();
    const result: Record<string, string> = {};
    for (const [key, value] of entries) {
        result[key] = value;
    }
    return result;
};

export const isToday = (
    date: DateTime,
    now: DateTime = DateTime.now()
): boolean => {
    const startOfToday = now.startOf('day');
    const startOfTomorrow = startOfToday.plus({ days: 1 });
    return date >= startOfToday && date < startOfTomorrow;
};

export const isPeerMessage = (message: DecodedMessage): boolean => {
    return message.senderAddress === message.conversation.peerAddress;
};

const getDefaultProvider = (): Provider =>
    new InfuraProvider('mainnet', INFURA_PROJECT_ID);

export const getEnsFromAddress = async (
    address: string
): Promise<string | undefined> => {
    const provider = getDefaultProvider();
    const ens = await provider.lookupAddress(address);
    return ens ?? undefined;
};

export const getAddressFromEns = async (
    ens: string
): Promise<string | null> => {
    const provider = getDefaultProvider();
    return provider.resolveName(ens);
};

export const buildXmtpStorageKey = (address: string): string => {
    return `xmtp-${address}`;
};

export const getXmtpKeys = async (
    address: string
): Promise<Uint8Array | null> => {
    const storageKey = buildXmtpStorageKey(address);
    const storage = await chrome.storage.local.get(storageKey);
    const savedKeys = storage[storageKey];
    return savedKeys ? Buffer.from(savedKeys, 'binary') : null;
};

export const getNotificationCountSinceLastOpened = async (
    timestamp?: string
): Promise<number> => {
    if (!timestamp) {
        const syncStorage = await chrome.storage.sync.get([
            KEY_NOTIFICATIONS_TIMESTAMP,
        ]);
        timestamp = syncStorage[KEY_NOTIFICATIONS_TIMESTAMP];
    }
    const lastUpdateDate = timestamp ? DateTime.fromISO(timestamp) : null;

    if (!lastUpdateDate) return 0;

    const storage = await chrome.storage.local.get(['notificationItemsCache']);
    const notifications = storage.notificationItemsCache;
    if (!notifications || notifications.length === 0) {
        return 0;
    }

    const newNotifications = notifications.filter((n: Notification) => {
        return DateTime.fromISO(n.createdAt) > lastUpdateDate;
    });

    return newNotifications.length;
};

export const updateBadge = async () => {
    const storage = await chrome.storage.sync.get([KEY_MESSAGES_UNREAD_TOPICS]);
    const newNotifications: number =
        await getNotificationCountSinceLastOpened();
    const newMessages: number =
        storage[KEY_MESSAGES_UNREAD_TOPICS]?.length ?? 0;

    const count = newNotifications + newMessages;
    const countString: string = count > 99 ? '99+' : `${count}`;
    const title =
        count > 0
            ? `${countString} new notifications and unread messages`
            : 'Focalize';

    await chrome.action.setBadgeBackgroundColor({ color: '#6B2300' });
    await chrome.action.setBadgeText({ text: count > 0 ? countString : '' });
    await chrome.action.setTitle({ title });
};

export const clearBadge = async () => {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'Focalize' });
};

export const getSearchParams = (): Record<string, string> => {
    const queryString = window.location.search;
    return getSearchParamsMap(queryString);
};

export const isPopup = async (): Promise<boolean> => {
    const window = await chrome.windows.getCurrent();
    return window.type === 'popup';
};

export const resizeTextarea = async (
    textarea: HTMLTextAreaElement | undefined
) => {
    if (!textarea) return;

    await tick();

    textarea.style.height = 'auto';
    const computedStyle = getComputedStyle(textarea);
    const height = parseInt(computedStyle.height, 10);
    const lineHeight = parseInt(computedStyle.lineHeight, 10);
    const padding = parseInt(computedStyle.paddingTop, 10);
    const maxHeight = lineHeight * 10;
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'scroll';
        textarea.style.height = `${maxHeight + padding * 2}px`;
    } else {
        textarea.style.overflowY = 'hidden';
        textarea.style.height = `${Math.max(height, scrollHeight)}px`;
    }
};

const ethereumAddressTest = z
    .string()
    .refine((value) => /^0x[a-fA-F0-9]{40}$/.test(value), {
        message: 'Invalid Ethereum address',
    });

const domainNameTest = z
    .string()
    .refine((value) => /\.(lens|eth|test)$/.test(value), {
        message: 'Invalid username',
    });

export const addressOrDomainNameType: ZodType = z.union([
    ethereumAddressTest,
    domainNameTest,
]);

export const validateRecipient = (node: HTMLElement, parameters: any) => {
    const onValidate: () => void = parameters.onValidate;
    const onValidated: (valid: boolean) => void = parameters.onValidated;
    const subject = new Subject<string>();

    subject.pipe(debounceTime(500)).subscribe((value) => {
        const result = addressOrDomainNameType.safeParse(value);
        onValidated(result.success);
    });

    const handleInput = (event: Event) => {
        onValidate?.();
        const input = event.target as HTMLInputElement;
        subject.next(input.value);
    };

    node.addEventListener('input', handleInput);

    return {
        destroy() {
            node.removeEventListener('input', handleInput);
            subject.unsubscribe();
        },
    };
};

export const isEthereumAddress = (address: string): boolean =>
    /^0x[a-fA-F0-9]{40}$/.test(address);

export const formatCryptoValue = (num: number): number => {
    const formattedNum = num.toFixed(8);
    return parseFloat(formattedNum);
};
