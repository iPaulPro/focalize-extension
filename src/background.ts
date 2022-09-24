chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.openOptionsPage();
    }
});


const parseOGTags = () => {
    return {
        url: document.querySelector("meta[property='og:url']")?.getAttribute("content") ||
            document.querySelector("link[rel='canonical']")?.getAttribute("href"),
        title: document.querySelector("meta[property='og:title']")?.getAttribute("content"),
        description: document.querySelector("meta[property='og:description']")?.getAttribute("content") ||
            document.querySelector("meta[name='twitter:description']")?.getAttribute("content")
    }
}

const shareUrl = (tags) => {
    console.log('shareUrl called with', tags);
    const path = chrome.runtime.getURL('src/new-post/');
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

    // chrome.tabs.create({url: url.toString()})
    //     .then(tab => {
    //         console.log(`Created new post tab ${tab.id} for ${JSON.stringify(tags)}`)
    //     })
    //     .catch(console.error);
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        console.log(`Got a message from ${sender.id}: ${request.markdown}`);
        if (sender.id !== chrome.runtime.id || sender.frameId !== 0) {
            return;
        }

        if (request.markdown) {
            sendResponse({success: "ok"});
        }
    }
);

chrome.action.onClicked.addListener(tab => {
    // No tabs or host permissions needed!
    console.log(tab)

    const url = tab.url
    const title = tab.title

    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
        chrome.tabs.update(
            tab.id,
            {
                url: chrome.runtime.getURL('src/new-post/')
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
            if (!tags.url) tags.url = url
            if (!tags.title) tags.title = title
            shareUrl(tags)
        } else {
            shareUrl({title, url})
        }
    }).catch(e => {
        console.error(e)
        shareUrl({title, url})
    })
})

export {}