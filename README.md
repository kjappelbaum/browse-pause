<div>
    <center>
    <h1> Browse Pause </h1>
    <img src="https://raw.githubusercontent.com/kjappelbaum/browse-pause/main/pause_logo.png" alt="Browse Pause Logo" width="64" height="64" />
    </center>
</div>


A minimalistic Chrome extension that helps you be more mindful of your browsing habits by intercepting visits to specified websites with a calming pause page.

## Features

- **Customizable URL blocking**: Block any websites you want to pause before visiting
- **Calming images**: Choose from beautiful Unsplash nature photos or upload your own local images
- **Customizable text**: Personalize the pause message and button text
- **Simple interface**: Clean, minimalistic design focused on mindfulness
- **Easy continuation**: Choose to continue to the site or go back after pausing

## How to Install

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Browse Pause extension is now installed!

## How to Use

1. Click the Browse Pause icon in your Chrome toolbar to see current settings
2. Click "Open Settings" to customize:
   - **Blocked URLs**: Add domains you want to pause before visiting (e.g., `facebook.com`, `twitter.com`)
   - **Images**: Choose from URL-based images or upload your own local images
   - **Custom Text**: Personalize the pause message, subtext, and button labels
3. When you visit a blocked site, you'll see a pause page with a calming image
4. Choose "Continue to Site" to proceed or "Go Back" to return

## Code Structure

This Chrome extension consists of several key components that work together:

### Core Files

#### `manifest.json`
- **Purpose**: Extension configuration and permissions
- **Key Features**: Defines the extension's capabilities, required permissions, and entry points
- **Manifest V3**: Uses the latest Chrome extension standards for security and performance

#### `background.js` (Service Worker)
- **Purpose**: Main extension logic running in the background
- **Key Functions**:
  - URL monitoring and blocking logic
  - Storage management and initialization
  - Message handling between components
  - Image and text data retrieval
- **Persistence**: Runs continuously to monitor browser navigation

#### `interceptor.html/js/css`
- **Purpose**: The pause page shown when a blocked site is accessed
- **Key Features**:
  - Displays random calming images
  - Shows customizable pause message
  - Provides "Continue" and "Go Back" options
  - Loads content dynamically from storage

#### `options.html/js/css`
- **Purpose**: Settings page for configuration
- **Key Features**:
  - URL management interface
  - Image upload and URL management
  - Text customization controls
  - Tabbed interface for organization

#### `popup.html/js`
- **Purpose**: Quick overview popup from browser toolbar
- **Key Features**:
  - Shows current blocked URLs
  - Displays image count summary
  - Provides link to full settings

### Data Flow

1. **User Navigation**: User attempts to visit a blocked site
2. **URL Checking**: `background.js` monitors tab updates and checks URLs
3. **Blocking**: If URL matches blocked list, redirect to `interceptor.html`
4. **Content Loading**: Interceptor page requests image and text from background
5. **User Choice**: User can continue to site or go back

### Storage Architecture

The extension uses Chrome's storage APIs efficiently:

- **`chrome.storage.sync`**: Small data that syncs across devices
  - Blocked URLs list
  - Image URLs
  - Custom text settings
  - Limit: 8KB per item, 102KB total

- **`chrome.storage.local`**: Large data stored locally only
  - Uploaded image files (as compressed data URLs)
  - No sync, but higher storage limits

### Communication Pattern

The extension uses Chrome's message passing for component communication:

```javascript
// Background script registers message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getRandomImage') {
        // Load and return random image
    }
    if (message.type === 'getCustomText') {
        // Load and return custom text settings
    }
});

// Other components send messages
chrome.runtime.sendMessage({ type: 'getRandomImage' }, (response) => {
    // Handle image response
});
```

## Technical Implementation Details

### URL Matching Algorithm
The extension uses flexible URL matching that handles various URL formats:
- Removes protocol (`http://`, `https://`)
- Handles `www.` prefix variations
- Matches domains, subdomains, and paths
- Case-insensitive comparison

### Image Compression
To stay within Chrome storage limits, uploaded images are:
- Resized to maximum 800x600 pixels
- Compressed to 80% JPEG quality
- Limited to 5MB upload size
- Converted to base64 data URLs for storage

### Tab Management
The extension tracks approved tabs to prevent infinite redirects:
- When user clicks "Continue", tab is marked as approved
- Subsequent navigation to that URL in that tab is allowed
- Tab approval is cleared after use

### Error Handling
Robust error handling throughout:
- Storage quota exceeded detection
- Image loading failure fallbacks
- Missing settings default values
- Network connectivity issues

## Development Notes

### Chrome Extension APIs Used
- `chrome.tabs.onUpdated`: Monitor navigation attempts
- `chrome.storage.sync/local`: Persistent settings storage
- `chrome.runtime.onMessage`: Inter-component communication
- `chrome.runtime.getURL`: Extension resource URLs

### Security Considerations
- Content Security Policy prevents XSS
- No eval() or inline scripts
- User-uploaded images stored locally only
- URL blocking happens before page load

### Performance Optimizations
- Blocked URLs cached in memory for fast lookup
- Image compression reduces storage usage
- Lazy loading of settings and images
- Minimal background script footprint

## Default Blocked Sites

- facebook.com
- twitter.com  
- reddit.com
- linkedin.com

## Browser Compatibility

- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## License

This project is open source and available under the MIT License.
