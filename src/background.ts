chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
});

const parseOGTags = (): {
    url?: string;
    title?: string | null,
    description?: string | null
} => ({
    title: document.head.querySelector("meta[property='og:title']")?.getAttribute("content") ||
        document.head.querySelector("meta[name='twitter:title']")?.getAttribute("content"),
    description: document.head.querySelector("meta[property='og:description']")?.getAttribute("content") ||
        document.head.querySelector("meta[name='description']")?.getAttribute("content") ||
        document.head.querySelector("meta[name='twitter:description']")?.getAttribute("content")
});

const truncate = (str: string, n: number) => (str.length > n) ? str.slice(0, n - 1) + '&hellip;' : str;

const shareUrl = (tags: any) => {
    console.log('shareUrl called with', tags);
    const path = chrome.runtime.getURL('src/index.html#/post');
    const url = new URL(path);

    url.searchParams.append('type', 'link');

    if (tags.url) {
        url.searchParams.append('url', tags.url);
    }

    if (tags.title) {
        url.searchParams.append('title', truncate(tags.title, 160));
    }

    if (tags.description) {
        url.searchParams.append('desc', truncate(tags.description, 160));
    }

    chrome.windows.create({
        url: url.toString(),
        focused: true,
        type: 'popup',
        width: 800,
        height: 600
    }).catch(console.error);
}

// chrome.runtime.onMessage.addListener(
//     async (request, sender, sendResponse) => {
//         console.log(`Got a message from`, sender);
//         if (sender.id !== chrome.runtime.id || sender.frameId !== 0) {
//             return;
//         }
//     }
// );

chrome.action.onClicked.addListener(tab => {
    const url = tab.url!!;
    const title = tab.title;

    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
        chrome.tabs.update(
            // @ts-ignore
            tab.id,
            {
                url: chrome.runtime.getURL('src/index.html#/post')
            }
        ).catch(console.error);
        return;
    }

    chrome.scripting.executeScript(
        {
            // @ts-ignore
            target: {tabId: tab.id},
            func: parseOGTags
        }
    ).then(results => {
        const tags = results[0]?.result;
        if (tags) {
            console.log('found open graph tags', tags);
            tags.url = url // og:url is often misused
            if (!tags.title) tags.title = title
            shareUrl(tags)
        } else {
            console.log('no tags found')
            shareUrl({title, url})
        }
    }).catch(e => {
        console.error(e)
        shareUrl({title, url})
    })
})

export {}