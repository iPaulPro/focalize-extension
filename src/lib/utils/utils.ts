import showdown, { type ShowdownExtension } from 'showdown';
import * as cheerio from 'cheerio';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DateTime } from 'luxon';

import { getPreference, KEY_USE_POPUP_COMPOSER } from '../stores/preferences-store';
import {
    getCached,
    KEY_ENS_NAME_MAP,
    KEY_NOTIFICATION_ITEMS_CACHE,
    KEY_NOTIFICATIONS_TIMESTAMP,
    saveToCache,
} from '../stores/cache-store';
import { tick } from 'svelte';
import { z, ZodType } from 'zod';

import { getDefaultProvider } from '../evm/get-default-provider';
import type { Notification } from '@lens-protocol/client';
import { getEventTime } from '../lens/lens-notifications';
import { browser } from 'wxt/browser/chrome';

export const POPUP_MIN_HEIGHT = 350;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isOnToolbar = async (): Promise<boolean> => {
    const settings = await browser.action.getUserSettings();
    return settings.isOnToolbar;
};

export const getAvatarFromAddress = (address: string, size: number = 128): string => {
    return `https://cdn.stamp.fyi/avatar/${address}?s=${size}`;
};

const createShowdownMentionExtension = (): ShowdownExtension => ({
    type: 'lang',
    regex: /(?<=^|\s)@(\w+\/([\dA-Za-z]\w{2,25}))/,
    replace: '[@$2](https://share.lens.xyz/u/$1)',
});

const createShowdownGroupExtension = (
    groups: Map<string, string> | undefined,
): ShowdownExtension => ({
    type: 'lang',
    regex: /#(0x[a-fA-F0-9]{40})/,
    replace: (match: any, address: any) => {
        if (groups && !(groups instanceof Map)) {
            groups = new Map(Object.entries(groups));
        }
        const groupName = groups?.get(address);
        return groupName ? `**#${groupName}**` : match;
    },
});

export const htmlFromMarkdown = (
    markdown: string | undefined,
    cachedGroups?: Map<string, string>,
): string | undefined => {
    if (!markdown) return undefined;

    const converter = new showdown.Converter({
        simpleLineBreaks: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        openLinksInNewWindow: true,
        extensions: [createShowdownMentionExtension, createShowdownGroupExtension(cachedGroups)],
    });
    return converter.makeHtml(markdown);
};

export const extractTextFromHtml = (html: string | undefined): string | undefined => {
    if (!html) return undefined;
    const $ = cheerio.load(html);
    return $.text();
};

export const stripMarkdown = (markdown: string | undefined): string | undefined => {
    if (!markdown) return undefined;
    const html = htmlFromMarkdown(markdown);
    return extractTextFromHtml(html);
};

export const truncate = (
    str: string | null | undefined,
    limit: number | undefined,
): string | null | undefined => {
    return !str || !limit || str.length <= limit ? str : str.slice(0, limit - 1) + '…';
};

export const truncateAddress = (address: string, maxLength: number = 8): string => {
    if (address.length <= maxLength) {
        return address;
    }
    const ellipsis = '…';
    const startLength = Math.ceil((maxLength + ellipsis.length) / 2) + 1;
    const endLength = Math.floor((maxLength + ellipsis.length) / 2);
    return address.slice(0, startLength) + ellipsis + address.slice(address.length - endLength);
};

export const launchComposerWindow = async (
    tags?: {
        url?: string;
        title?: string;
        description?: string;
        icon?: string;
        image?: string;
    },
    draftId?: string,
    override: boolean = false,
) => {
    console.log('launchComposerWindow', tags);
    const path = browser.runtime.getURL('/post.html');
    const url = new URL(path);

    if (tags) {
        if (tags.url) url.searchParams.append('url', tags.url);
        if (tags.title) url.searchParams.append('title', truncate(tags.title, 160) ?? '');
        if (tags.description)
            url.searchParams.append('desc', truncate(tags.description, 160) ?? '');
        if (tags.icon) url.searchParams.append('icon', tags.icon);
        if (tags.image) url.searchParams.append('image', tags.image);
    } else {
        const searchParams: Record<string, string> = getSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            url.searchParams.append(key, value);
        }
        if (draftId) {
            url.searchParams.set('draft', draftId);
        }
    }

    const usePopups = await getPreference<boolean>(KEY_USE_POPUP_COMPOSER, true);

    if (usePopups || override) {
        const currentWindow = await browser.windows.getCurrent();
        const windowRight =
            currentWindow.left !== undefined && currentWindow.width !== undefined
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
        await browser.windows.create(options);
    } else {
        await browser.tabs.create({ url: url.toString() });
    }

    if (typeof window !== 'undefined') {
        window.close();
    }
};

export const launchComposerTab = async (draftId?: string) => {
    const path = browser.runtime.getURL('/post.html');
    const url = new URL(path);
    const searchParams: Record<string, string> = getSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.append(key, value);
    }

    if (draftId) {
        url.searchParams.set('draft', draftId);
    }

    await browser.tabs.create({ url: url.toString() });
    window.close();
};

interface ScrollEndListenerOptions {
    delay?: number;
    onScrollEnd?: (node: HTMLElement) => void;
}

export const scrollEndListener = (
    node: HTMLElement,
    options: ScrollEndListenerOptions = {},
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
        const direction = targetElement.scrollTop > lastScrollTop ? 'down' : 'up';
        lastScrollTop = targetElement.scrollTop;

        node.style.transition = 'transform 0.3s, opacity 0.3s';

        if (direction === 'down') {
            node.style.transform = reversed ? 'translateY(50%)' : 'translateY(-50%)';
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
    image?: string | null;
}

export const getOpenGraphTags = (): OpenGraphTags => ({
    title:
        document.head.querySelector("meta[property='og:title']")?.getAttribute('content') ??
        document.head.querySelector("meta[name='twitter:title']")?.getAttribute('content'),
    description:
        document.head.querySelector("meta[property='og:description']")?.getAttribute('content') ??
        document.head.querySelector("meta[name='description']")?.getAttribute('content') ??
        document.head.querySelector("meta[name='twitter:description']")?.getAttribute('content'),
    image:
        document.head.querySelector("meta[property='og:image']")?.getAttribute('content') ??
        document.head.querySelector("meta[name='twitter:image']")?.getAttribute('content'),
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

export const isToday = (date: DateTime, now: DateTime = DateTime.now()): boolean => {
    const startOfToday = now.startOf('day');
    const startOfTomorrow = startOfToday.plus({ days: 1 });
    return date >= startOfToday && date < startOfTomorrow;
};

export const getEnsFromAddress = async (address: string): Promise<string | undefined> => {
    const ensNameMap = (await getCached<{ [id: string]: string }>(KEY_ENS_NAME_MAP)) ?? {};

    if (ensNameMap[address]) {
        return ensNameMap[address];
    }

    const provider = getDefaultProvider();
    const ens = await provider.lookupAddress(address);

    if (ens) {
        ensNameMap[address] = ens;
        await saveToCache(KEY_ENS_NAME_MAP, ensNameMap);
    }

    return ens ?? undefined;
};

export const getAddressFromEns = async (ens: string): Promise<string | null> => {
    const provider = getDefaultProvider();
    return provider.resolveName(ens);
};

export const buildXmtpStorageKey = (address: string): string => {
    return `xmtp-${address}`;
};

export const getXmtpKeys = async (address: string): Promise<Uint8Array | null> => {
    const storageKey = buildXmtpStorageKey(address);
    const storage = await browser.storage.local.get(storageKey);
    const savedKeys = storage[storageKey];
    return savedKeys ? Buffer.from(savedKeys, 'binary') : null;
};

export const getNotificationCountSinceLastOpened = async (timestamp?: string): Promise<number> => {
    if (!timestamp) {
        const syncStorage = await browser.storage.sync.get([KEY_NOTIFICATIONS_TIMESTAMP]);
        timestamp = syncStorage[KEY_NOTIFICATIONS_TIMESTAMP];
    }
    const lastUpdateDate = timestamp ? DateTime.fromISO(timestamp) : null;

    if (!lastUpdateDate) return 0;

    const storage = await browser.storage.local.get([KEY_NOTIFICATION_ITEMS_CACHE]);
    const notifications = storage[KEY_NOTIFICATION_ITEMS_CACHE];
    if (!notifications || notifications.length === 0) {
        return 0;
    }

    const newNotifications = notifications.filter((n: Notification) => {
        const eventTime = getEventTime(n);
        if (!eventTime) return false;
        return DateTime.fromISO(eventTime) > lastUpdateDate;
    });

    return newNotifications.length;
};

export const updateBadge = async () => {
    const newNotifications: number = await getNotificationCountSinceLastOpened();

    const countString: string = newNotifications > 99 ? '99+' : `${newNotifications}`;
    const title =
        newNotifications > 0 ? `${countString} new notifications` : 'Focalize | Share on Lens';

    await browser.action.setBadgeBackgroundColor({ color: '#6B2300' });
    await browser.action.setBadgeText({ text: newNotifications > 0 ? countString : '' });
    await browser.action.setTitle({ title });
};

export const clearBadge = async () => {
    await browser.action.setBadgeText({ text: '' });
    await browser.action.setTitle({ title: 'Focalize | Share on Lens' });
};

export const getSearchParams = (): Record<string, string> => {
    const queryString = window.location.search;
    return getSearchParamsMap(queryString);
};

export const isPopup = async (): Promise<boolean> => {
    const window = await browser.windows.getCurrent();
    return window.type === 'popup';
};

export const resizeTextarea = async (textarea: HTMLTextAreaElement | undefined) => {
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

const ethereumAddressTest = z.string().refine((value) => /^0x[a-fA-F0-9]{40}$/.test(value), {
    message: 'Invalid Ethereum address',
});

const domainNameTest = z.string().refine((value) => /\.(lens|eth|test)$/.test(value), {
    message: 'Invalid username',
});

export const addressOrDomainNameType: ZodType = z.union([ethereumAddressTest, domainNameTest]);

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

export const isEthereumAddress = (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address);

export const formatCryptoValue = (num: number): string => {
    const formattedNum = num.toFixed(8);
    return Intl.NumberFormat().format(parseFloat(formattedNum));
};
