import type {Profile} from "../graph/lens-service";
import {ipfsUrlToGatewayUrl} from "./ipfs-service";
import showdown from "showdown";
import * as cheerio from 'cheerio';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isOnToolbar = async (): Promise<boolean> => {
    const settings = await chrome.action.getUserSettings();
    return settings.isOnToolbar;
};

export const getAvatar = (profile: Profile) => {
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

export const limitString = (str: string | undefined, limit: number): string | undefined => {
    if (!str || str.length <= limit) {
        // String is already within the limit, no need to truncate
        return str;
    } else {
        // String is longer than the limit, truncate and add ellipsis
        return str.slice(0, limit) + '...';
    }
};