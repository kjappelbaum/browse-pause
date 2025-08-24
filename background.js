let approvedTabs = {};

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
            });
        }
    });
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (approvedTabs[details.tabId]) {
        delete approvedTabs[details.tabId];
        return;
    }

    chrome.storage.sync.get(['blockedUrls'], (result) => {
        const blockedUrls = result.blockedUrls || [];
        const shouldBlock = blockedUrls.some(url => {
            const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
            return details.url.includes(cleanUrl);
        });

        if (shouldBlock) {
            chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL('interceptor.html') + '?url=' + encodeURIComponent(details.url) });
        }
    });
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