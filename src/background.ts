
const parseOGTags = () => {
    return {
        url: document.querySelector("meta[property='og:url']")?.getAttribute("content") ||
            document.querySelector("link[rel='canonical']")?.getAttribute("href"),
        title: document.querySelector("meta[property='og:title']")?.getAttribute("content"),
        description: document.querySelector("meta[property='og:description']")?.getAttribute("content")
    }
}

const shareUrl = (tags) => {
    const path = chrome.runtime.getURL('src/new-post/')
    chrome.tabs.create({url: path})
        .then(tab => {
            console.log(`Created new post tab ${tab.id} for ${JSON.stringify(tags)}`)
            // chrome.tabs.sendMessage(tab.id, {greeting: "hello"},
            //     // @ts-ignore
            //     (response) => {
            //         console.log(response);
            //     }
            // );
        })
        .catch(console.error)
}

chrome.runtime.onMessage.addListener(
    // @ts-ignore
    (request: any, sender: chrome["runtime.MessageSender"], sendResponse: (response: any) => {}) => {
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