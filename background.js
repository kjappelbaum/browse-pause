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
    chrome.storage.sync.get(['blockedUrls', 'imageUrls'], (result) => {
        if (!result.blockedUrls) {
            const defaultImageUrls = [
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1418065460487-3956c3808eaf?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=600&fit=crop'
            ];
            
            chrome.storage.sync.set({
                blockedUrls: ['facebook.com', 'twitter.com', 'reddit.com', 'linkedin.com'],
                imageUrls: defaultImageUrls
            }, () => {
                // Initialize empty local images storage
                chrome.storage.local.set({
                    localImages: []
                }, loadBlockedUrls);
            });
        } else {
            loadBlockedUrls();
        }
    });
});

// Load blocked URLs when the service worker starts
loadBlockedUrls();

// Listen for changes in storage to update blockedUrls
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.blockedUrls) {
        loadBlockedUrls();
    }
});

// Check URLs when tabs are updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only check when the URL actually changes and it's a complete load
    if (changeInfo.status === 'loading' && changeInfo.url) {
        console.log("Checking URL:", changeInfo.url);
        console.log("Current blocked URLs:", blockedUrls);
        
        // Skip if this tab has been approved
        if (approvedTabs[tabId]) {
            console.log("Tab approved, allowing:", tabId);
            delete approvedTabs[tabId];
            return;
        }

        // Skip if this is our own interceptor page
        if (changeInfo.url.includes(chrome.runtime.getURL('interceptor.html'))) {
            console.log("Skipping interceptor page");
            return;
        }

        // Check if the URL should be blocked
        const shouldBlock = blockedUrls.some(blockedUrl => {
            const cleanUrl = changeInfo.url.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
            const cleanBlockedUrl = blockedUrl.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
            
            console.log(`Comparing: "${cleanUrl}" with blocked "${cleanBlockedUrl}"`);
            
            // Check if the domain matches exactly or is a subdomain/path of the blocked URL
            const matches = cleanUrl === cleanBlockedUrl || 
                           cleanUrl.startsWith(cleanBlockedUrl + '/') ||
                           cleanUrl.startsWith(cleanBlockedUrl + '?') ||
                           cleanUrl.startsWith(cleanBlockedUrl + '#') ||
                           (cleanBlockedUrl.includes('.') && cleanUrl.includes(cleanBlockedUrl));
                           
            console.log(`Match result: ${matches}`);
            return matches;
        });

        console.log("Should block:", shouldBlock);

        if (shouldBlock) {
            console.log("Blocking URL: " + changeInfo.url);
            const redirectUrl = chrome.runtime.getURL('interceptor.html') + '?url=' + encodeURIComponent(changeInfo.url);
            chrome.tabs.update(tabId, { url: redirectUrl });
        }
    }
});

// Listen for messages from the interceptor script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'approveTab') {
        approvedTabs[sender.tab.id] = true;
        chrome.tabs.update(sender.tab.id, { url: message.url });
    } else if (message.type === 'getRandomImage') {
        // Load both storage.sync (URLs) and storage.local (large images)
        chrome.storage.sync.get(['imageUrls'], (syncResult) => {
            chrome.storage.local.get(['localImages'], (localResult) => {
                const imageUrls = syncResult.imageUrls || [];
                const localImages = localResult.localImages || [];
                
                // Combine URL images and local image data URLs
                const allImages = [
                    ...imageUrls,
                    ...localImages.map(img => img.dataUrl)
                ];
                
                // Fallback to default if no images
                if (allImages.length === 0) {
                    allImages.push('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop');
                }
                
                const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
                sendResponse({ image: randomImage });
            });
        });
        return true; // Async response
    }
});