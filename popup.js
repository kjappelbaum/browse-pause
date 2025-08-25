/**
 * Popup Script for Browse Pause Extension
 * 
 * This script manages the small popup that appears when users click
 * the extension icon in the Chrome toolbar. It provides:
 * - Quick overview of current settings
 * - Summary of blocked URLs and images
 * - Link to open full settings page
 */

/**
 * Loads and displays current extension settings in the popup
 * Shows blocked URLs count and image counts from both storage types
 */
function loadSettings() {
  chrome.storage.sync.get(['blockedUrls', 'imageUrls'], (result) => {
    const urlList = document.getElementById('urlList');
    const imageCount = document.getElementById('imageCount');
    
    const urls = result.blockedUrls || [];
    urlList.innerHTML = urls.length ? urls.join('<br>') : 'No URLs blocked';
    
    const imageUrls = result.imageUrls || [];
    
    // Load local images from storage.local
    chrome.storage.local.get(['localImages'], (localResult) => {
      const localImages = localResult.localImages || [];
      const totalImages = localImages.length + imageUrls.length;
      
      imageCount.innerHTML = `
        ${totalImages} total images<br>
        <small>${localImages.length} local, ${imageUrls.length} URLs</small>
      `;
    });
  });
}

/**
 * Opens the full options page when user clicks the settings button
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('openOptionsBtn').addEventListener('click', openOptions);