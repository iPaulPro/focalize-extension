chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
});

const parseOGTags = () => {
    return {
        url: document.querySelector("meta[property='og:url']")?.getAttribute("content"),
        title: document.querySelector("meta[property='og:title']")?.getAttribute("content"),
        description: document.querySelector("meta[property='og:description']")?.getAttribute("content") ||
            document.querySelector("meta[name='twitter:description']")?.getAttribute("content")
    }
}

const shareUrl = (tags) => {
    console.log('shareUrl called with', tags);
    const path = chrome.runtime.getURL('src/new-post/index.html');
    const url = new URL(path);

    url.searchParams.append('type', 'link');

    if (tags.url) {
        url.searchParams.append('url', tags.url);
    }

    if (tags.title) {
        url.searchParams.append('title', tags.title);
    }

    if (tags.description) {
        url.searchParams.append('desc', tags.description);
    }

    chrome.windows.create({
        url: url.toString(),
        focused: true,
        type: 'popup',
        width: 800,
        height: 700
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
    const url = tab.url
    const title = tab.title

    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
        chrome.tabs.update(
            tab.id,
            {
                url: chrome.runtime.getURL('src/new-post/index.html')
            }
        ).catch(console.error);
        return;
    }

    chrome.scripting.executeScript(
        {
            target: {tabId: tab.id},
            func: parseOGTags
        }
    ).then(results => {
        const tags = results[0]?.result
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