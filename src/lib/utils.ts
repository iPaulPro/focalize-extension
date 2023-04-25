import type {Profile} from "./graph/lens-service";
import {ipfsUrlToGatewayUrl} from "./ipfs-service";
import showdown from "showdown";
import * as cheerio from 'cheerio';
import {fromEvent, Subject, takeUntil} from "rxjs";
import {debounceTime} from "rxjs/operators";

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isOnToolbar = async (): Promise<boolean> => {
    const settings = await chrome.action.getUserSettings();
    return settings.isOnToolbar;
};

export const getAvatarFromProfile = (profile: Profile) => {
    let avatarUrl: string | undefined;

    if (profile.picture?.__typename === "MediaSet") {
        avatarUrl = profile.picture?.original?.url;
    } else if (profile.picture?.__typename === "NftImage") {
        avatarUrl = profile.picture.uri;
    }

    if (avatarUrl?.startsWith('ipfs://')) {
        avatarUrl = ipfsUrlToGatewayUrl(avatarUrl);
    }

    if (!avatarUrl || avatarUrl.length === 0) {
        avatarUrl = `https://cdn.stamp.fyi/avatar/${profile.ownedBy}?s=96`
    }

    return avatarUrl;
};

export const htmlFromMarkdown = (markdown: string | undefined): string | undefined => {
    if (!markdown) return undefined;
    const converter = new showdown.Converter({
        simpleLineBreaks: true,
        simplifiedAutoLink: true,
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
    return extractTextFromHtml(htmlFromMarkdown(markdown));
};

export const truncate = (str: string | null | undefined, limit: number): string | null | undefined => {
    return (!str || str.length <= limit) ? str : str.slice(0, limit - 1) + '…';
};

export const launchComposerWindow = async (
    tags?: { url?: string, title?: string, description?: string }
) => {
    console.log('launchComposerWindow', tags);
    const path = chrome.runtime.getURL('src/window/index.html');
    const url = new URL(path);

    if (tags?.url) {
        url.searchParams.append('url', tags.url);
    }

    if (tags?.title) {
        url.searchParams.append('title', truncate(tags.title, 160) ?? '');
    }

    if (tags?.description) {
        url.searchParams.append('desc', truncate(tags.description, 160) ?? '');
    }

    const storage = await chrome.storage.sync.get('compactMode');
    const compactMode = storage.compactMode;

    chrome.windows.create({
        url: url.toString(),
        focused: true,
        type: 'popup',
        width: compactMode ? 672 : 768,
        height: compactMode ? 396 : 600
    }).catch(console.error);

    window.close();
};

interface ScrollEndListenerOptions {
    delay?: number;
    onScrollEnd?: () => void;
}

export const scrollEndListener = (
    node: HTMLElement,
    options: ScrollEndListenerOptions = {}
): { destroy: () => void } => {
    const { delay = 200, onScrollEnd = (node: HTMLElement) => {} } = options;
    const destroy = new Subject<void>();

    fromEvent(node, "scroll")
        .pipe(debounceTime(delay), takeUntil(destroy))
        .subscribe(() => {
            onScrollEnd(node);
        });

    return {
        destroy() {
            destroy.next();
            destroy.complete();
        },
    };
};

export interface OpenGraphTags {
    url?: string;
    title?: string | null,
    description?: string | null
}

export const getOpenGraphTags = (): OpenGraphTags => ({
    title: document.head.querySelector("meta[property='og:title']")?.getAttribute("content") ??
        document.head.querySelector("meta[name='twitter:title']")?.getAttribute("content"),
    description: document.head.querySelector("meta[property='og:description']")?.getAttribute("content") ??
        document.head.querySelector("meta[name='description']")?.getAttribute("content") ??
        document.head.querySelector("meta[name='twitter:description']")?.getAttribute("content")
});

export const formatFollowerCount = (count: number): string => {
    if (count >= 1_000_000) {
        return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (count >= 10_000) {
        return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
};