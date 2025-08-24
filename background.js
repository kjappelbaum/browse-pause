let approvedTabs = {};
let blockedUrls = [];

function loadBlockedUrls() {
    chrome.storage.sync.get(['blockedUrls'], (result) => {
        blockedUrls = result.blockedUrls || [];
        console.log("Loaded blocked URLs: ", blockedUrls);
    });
}

chrome.runtime.onInstalled.addListener(() => {
    // Initialize default settings
    chrome.storage.sync.get(['blockedUrls', 'images'], (result) => {
        if (!result.blockedUrls) {
            chrome.storage.sync.set({
                blockedUrls: ['facebook.com', 'twitter.com', 'reddit.com'],
                images: [
                    'https://picsum.photos/800/600?random=1',
                    'https://picsum.photos/800/600?random=2',
                    'https://picsum.photos/800/600?random=3',
                    'https://picsum.photos/800/600?random=4',
                    'https://picsum.photos/800/600?random=5'
                ]
            }, loadBlockedUrls);
        } else {
            loadBlockedUrls();
        }
    });
});

// Listen for changes in storage to update blockedUrls
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.blockedUrls) {
        loadBlockedUrls();
    }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (approvedTabs[details.tabId]) {
        delete approvedTabs[details.tabId];
        return;
    }

    const shouldBlock = details.url.includes("example.com");

    if (shouldBlock) {
        console.log("Blocking URL: " + details.url);
        return { redirectUrl: chrome.runtime.getURL('interceptor.html') + '?url=' + encodeURIComponent(details.url) };
    }
}, { url: [{ urlMatches: '<all_urls>' }] });

// Listen for messages from the interceptor script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'approveTab') {
        approvedTabs[sender.tab.id] = true;
        chrome.tabs.update(sender.tab.id, { url: message.url });
    } else if (message.type === 'getRandomImage') {
        chrome.storage.sync.get(['images'], (result) => {
            const images = result.images || [];
            const randomImage = images[Math.floor(Math.random() * images.length)];
            sendResponse({ image: randomImage });
        });
        return true; // Async response
    }
});