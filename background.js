/**
 * Browse Pause Extension - Background Script
 * 
 * This is the main service worker that runs in the background and handles:
 * - URL monitoring and blocking
 * - Storage management and initialization
 * - Communication between different parts of the extension
 * 
 * Chrome Extensions use a "background script" (service worker in Manifest V3)
 * that runs independently of any web page and handles extension logic.
 */

/**
 * Global state variables
 * These persist throughout the extension's lifecycle
 */
// Tracks tabs that have been approved to continue to their destination
let approvedTabs = {};
// Cached list of blocked URLs for quick access during URL checking
let blockedUrls = [];

/**
 * Loads blocked URLs from Chrome storage into memory
 * This function is called whenever we need to refresh the blocked URLs list
 * 
 * Why we cache URLs: Chrome storage is asynchronous, but URL checking needs to be fast.
 * We cache the URLs in memory so we can quickly check them when tabs are loading.
 */
function loadBlockedUrls() {
    chrome.storage.sync.get(['blockedUrls'], (result) => {
        blockedUrls = result.blockedUrls || [];
        console.log("Loaded blocked URLs: ", blockedUrls);
    });
}

/**
 * Event listener that runs when the extension is first installed or updated
 * This sets up the default configuration for the extension
 */
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
                imageUrls: defaultImageUrls,
                pauseMessage: 'Take a breath',
                pauseSubtext: 'You were trying to visit: {url}',
                continueButtonText: 'Continue to Site',
                backButtonText: 'Go Back'
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

/**
 * Load blocked URLs when the service worker starts
 * Service workers can be terminated and restarted, so we need to reload our data
 */
loadBlockedUrls();

/**
 * Listen for changes in storage to update our cached blocked URLs
 * This ensures the extension stays in sync when settings are changed
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.blockedUrls) {
        loadBlockedUrls();
    }
});

/**
 * Main URL blocking logic - monitors all tab updates
 * This is the core functionality that intercepts navigation attempts
 */
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

/**
 * Message handler for communication between different parts of the extension
 * This handles requests from the interceptor page and other extension components
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'approveTab') {
        // User clicked "Continue to Site" - mark this tab as approved
        approvedTabs[sender.tab.id] = true;
        chrome.tabs.update(sender.tab.id, { url: message.url });
    } else if (message.type === 'getRandomImage') {
        // Interceptor page requesting a random image to display
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
    } else if (message.type === 'getCustomText') {
        // Interceptor page requesting custom text settings
        chrome.storage.sync.get(['pauseMessage', 'pauseSubtext', 'continueButtonText', 'backButtonText'], (result) => {
            sendResponse({
                pauseMessage: result.pauseMessage || 'Take a breath',
                pauseSubtext: result.pauseSubtext || 'You were trying to visit: {url}',
                continueButtonText: result.continueButtonText || 'Continue to Site',
                backButtonText: result.backButtonText || 'Go Back'
            });
        });
        return true; // Async response
    }
});