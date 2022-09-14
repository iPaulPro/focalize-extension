const parseOGTags = () => {
    return {
        url: document.querySelector("meta[property='og:url']")?.getAttribute("content") ||
            document.querySelector("link[rel='canonical']")?.getAttribute("href"),
        title: document.querySelector("meta[property='og:title']")?.getAttribute("content"),
        description: document.querySelector("meta[property='og:description']")?.getAttribute("content")
    }
}

const shareUrl = (tags) => {
    const url = `src/new-post/?url=${encodeURIComponent(tags.url)}&title=${encodeURIComponent(tags.title)}&desc=${encodeURIComponent(tags.description)}`
    const path = chrome.runtime.getURL(url)
    chrome.tabs.create({url: path})
        .then(tab => {
            console.log(`Created new post tab ${tab.id} for ${JSON.stringify(tags)}`)
        })
        .catch(console.error)
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