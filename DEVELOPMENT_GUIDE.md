# Browse Pause - Development Guide

This guide walks you through how the Browse Pause Chrome extension was built, explaining the architecture, design decisions, and implementation details.

## Extension Architecture Overview

Chrome extensions are modular applications that extend browser functionality. Browse Pause uses a **content blocking** pattern with a **pause-and-reflect** user experience.

### Core Components

```
browse-pause/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── interceptor.html       # Pause page HTML
├── interceptor.js         # Pause page logic
├── interceptor.css        # Pause page styling
├── options.html           # Settings page HTML
├── options.js             # Settings page logic
├── options.css            # Settings page styling
├── popup.html             # Toolbar popup HTML
├── popup.js               # Toolbar popup logic
└── README.md              # Documentation
```

## Step-by-Step Development Process

### Step 1: Manifest Configuration

The `manifest.json` file is the extension's blueprint. It defines:

```json
{
    "manifest_version": 3,
    "name": "Browse Pause",
    "permissions": [
        "storage",     // Save user settings
        "activeTab",   // Access current tab info
        "tabs"         // Monitor tab navigation
    ],
    "host_permissions": ["<all_urls>"],  // Access all websites
    "background": {
        "service_worker": "background.js"  // Main logic file
    }
}
```

**Key Design Decisions:**
- **Manifest V3**: Latest standard for security and performance
- **Minimal Permissions**: Only request what's needed
- **Service Worker**: Persistent background processing

### Step 2: Background Script (Service Worker)

The background script is the extension's "brain" - it runs continuously and handles core logic.

```javascript
// Global state management
let approvedTabs = {};  // Track tabs allowed to continue
let blockedUrls = [];   // Cache blocked URLs for fast lookup

// URL monitoring - the core blocking mechanism
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
        // Check if URL should be blocked
        const shouldBlock = blockedUrls.some(blockedUrl => {
            // Flexible URL matching logic
            return urlMatches(changeInfo.url, blockedUrl);
        });
        
        if (shouldBlock) {
            // Redirect to pause page
            const redirectUrl = chrome.runtime.getURL('interceptor.html') + 
                               '?url=' + encodeURIComponent(changeInfo.url);
            chrome.tabs.update(tabId, { url: redirectUrl });
        }
    }
});
```

**Why This Approach:**
- **Event-Driven**: Responds to navigation attempts in real-time
- **Asynchronous**: Doesn't block browser performance
- **Stateful**: Remembers user decisions across page loads

### Step 3: Storage Architecture

Chrome extensions have two storage options, each with different characteristics:

```javascript
// storage.sync - Small data, syncs across devices
chrome.storage.sync.set({
    blockedUrls: ['facebook.com', 'twitter.com'],
    pauseMessage: 'Take a breath',
    imageUrls: ['https://example.com/image.jpg']
});

// storage.local - Large data, local only
chrome.storage.local.set({
    localImages: [
        { name: 'sunset.jpg', dataUrl: 'data:image/jpeg;base64,/9j/4AAQ...' }
    ]
});
```

**Storage Strategy:**
- **Sync Storage**: URLs, text settings (≤8KB items)
- **Local Storage**: Uploaded images (can be MB)

### Step 4: URL Matching Algorithm

Robust URL matching is crucial for user experience:

```javascript
function urlMatches(currentUrl, blockedUrl) {
    // Normalize URLs for comparison
    const cleanUrl = currentUrl.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
    const cleanBlockedUrl = blockedUrl.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
    
    // Multiple matching strategies
    return cleanUrl === cleanBlockedUrl ||                    // Exact match
           cleanUrl.startsWith(cleanBlockedUrl + '/') ||      // Path match
           cleanUrl.startsWith(cleanBlockedUrl + '?') ||      // Query match
           cleanUrl.startsWith(cleanBlockedUrl + '#');        // Fragment match
}
```

**Matching Features:**
- **Protocol Agnostic**: Works with HTTP and HTTPS
- **www Optional**: Matches with/without www prefix
- **Subdomain Support**: Blocks subdomains automatically
- **Path Sensitive**: Can block specific pages

### Step 5: Interceptor Page (Pause Screen)

The pause page provides the mindful interruption experience:

```html
<!-- Simple, clean structure -->
<div class="container">
    <div class="image-container">
        <img id="randomImage" alt="Calming image" />
    </div>
    <div class="message" id="pauseMessage">Take a breath</div>
    <div class="url-info" id="urlInfo"></div>
    <div class="buttons">
        <button id="continueBtn">Continue to Site</button>
        <button id="backBtn">Go Back</button>
    </div>
</div>
```

**Dynamic Content Loading:**
```javascript
// Load customizable text
chrome.runtime.sendMessage({ type: 'getCustomText' }, (response) => {
    document.getElementById('pauseMessage').textContent = response.pauseMessage;
    // Replace {url} placeholder with actual URL
    const subtext = response.pauseSubtext.replace('{url}', originalUrl);
    document.getElementById('urlInfo').innerHTML = subtext;
});

// Load random image
chrome.runtime.sendMessage({ type: 'getRandomImage' }, (response) => {
    document.getElementById('randomImage').src = response.image;
});
```

### Step 6: Settings Page Architecture

The options page uses a tabbed interface for organization:

```javascript
// Tab switching logic
function switchTab(targetTab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show target tab
    document.getElementById(targetTab).classList.add('active');
}

// Settings persistence
function saveSettings() {
    const settings = {
        blockedUrls: getUrlsFromTextarea(),
        pauseMessage: document.getElementById('pauseMessage').value,
        // ... other settings
    };
    
    chrome.storage.sync.set(settings);
}
```

### Step 7: Image Management System

Handling user-uploaded images requires storage management:

```javascript
function handleImageFiles(files) {
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Compress image to stay within storage limits
            const compressedImage = compressImage(e.target.result);
            currentImages.push({
                name: file.name,
                dataUrl: compressedImage,
                size: compressedImage.length
            });
        };
        reader.readAsDataURL(file);
    });
}

function compressImage(dataUrl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resize and compress
    canvas.width = Math.min(originalWidth, 800);
    canvas.height = Math.min(originalHeight, 600);
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8); // 80% quality
}
```

### Step 8: Message Passing System

Chrome extensions use message passing for component communication:

```javascript
// Background script - message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.type) {
        case 'getRandomImage':
            // Load and return random image
            loadRandomImage().then(image => {
                sendResponse({ image: image });
            });
            return true; // Async response
            
        case 'approveTab':
            // Mark tab as approved for navigation
            approvedTabs[sender.tab.id] = true;
            chrome.tabs.update(sender.tab.id, { url: message.url });
            break;
    }
});

// Other components - send messages
chrome.runtime.sendMessage(
    { type: 'getRandomImage' },
    (response) => {
        // Handle response
        displayImage(response.image);
    }
);
```

## Advanced Implementation Details

### Tab State Management

The extension needs to prevent infinite redirects when users choose to continue:

```javascript
// When user clicks "Continue to Site"
function approveNavigation(originalUrl, tabId) {
    // Mark this tab as approved
    approvedTabs[tabId] = true;
    
    // Navigate to original URL
    chrome.tabs.update(tabId, { url: originalUrl });
    
    // Clean up approval after use
    setTimeout(() => {
        delete approvedTabs[tabId];
    }, 1000);
}
```

### Error Handling Strategy

Robust error handling ensures good user experience:

```javascript
function safeStorageOperation(operation) {
    try {
        operation();
    } catch (error) {
        if (error.message.includes('quota exceeded')) {
            showUserFriendlyError('Storage limit reached. Please remove some images.');
        } else {
            console.error('Storage operation failed:', error);
            showUserFriendlyError('Settings could not be saved. Please try again.');
        }
    }
}
```

### Performance Optimizations

Several techniques ensure the extension doesn't slow down browsing:

1. **URL Caching**: Blocked URLs stored in memory for fast lookup
2. **Lazy Loading**: Images and settings loaded only when needed
3. **Debounced Saves**: Settings saved after user stops typing
4. **Compressed Images**: Automatic image optimization

## Security Considerations

Chrome extensions require careful attention to security:

### Content Security Policy
```json
"content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
}
```

### Input Sanitization
```javascript
function sanitizeUrl(url) {
    // Remove dangerous characters and validate format
    return url.replace(/[<>'"]/g, '').trim();
}
```

### Minimal Permissions
- Only request necessary permissions
- Use `activeTab` instead of `tabs` when possible
- Avoid `<all_urls>` unless essential


## Future Enhancement Ideas

### Planned Features
- Time-based blocking (work hours only)
- Usage statistics and insights
- Collaborative blocking lists
- Integration with focus apps

### Technical Improvements
- WebP image support for better compression
- Background sync for settings
- Improved URL pattern matching
- Performance monitoring
