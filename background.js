chrome.runtime.onInstalled.addListener(() => {
    // Initialize default settings
  chrome.storage.sync.get(['blockedUrls', 'images'], (result) => {
    if (!result.blockedUrls) {
      chrome.storage.sync.set({
        blockedUrls: ['facebook.com', 'twitter.com', 'reddit.com'],
        images: [
          'https: //picsum.photos/800/600?random=1',
          'https: //picsum.photos/800/600?random=2',
          'https: //picsum.photos/800/600?random=3',
          'https: //picsum.photos/800/600?random=4',
          'https: //picsum.photos/800/600?random=5'
                ]
            });
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'shouldBlock') {
    chrome.storage.sync.get(['blockedUrls'], (result) => {
      const blockedUrls = result.blockedUrls || [];
      const shouldBlock = blockedUrls.some(url => {
        const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
        return message.url.includes(cleanUrl);
            });
      sendResponse({ shouldBlock
            });
        });
    return true; // Async response
    } else if (message.type === 'getRandomImage') {
    chrome.storage.sync.get(['images'], (result) => {
      const images = result.images || [];
      const randomImage = images[Math.floor(Math.random() * images.length)
            ];
      sendResponse({ image: randomImage
            });
        });
    return true; // Async response
    }
});

