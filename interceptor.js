/**
 * Interceptor Page Script
 * 
 * This script runs on the pause page that users see when they try to visit a blocked site.
 * It handles:
 * - Loading and displaying a random calming image
 * - Loading customizable text content
 * - User interactions (continue to site, go back)
 * - Communication with the background script
 */

document.addEventListener('DOMContentLoaded', () => {
    // Extract the original URL from the query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get('url');

    // Load custom text settings from storage
    chrome.runtime.sendMessage({ type: 'getCustomText' }, (textResponse) => {
        if (textResponse) {
            // Update the main pause message
            const messageElement = document.getElementById('pauseMessage');
            if (messageElement) {
                messageElement.textContent = textResponse.pauseMessage;
            }

            // Update the URL info with custom subtext (replace {url} placeholder)
            const urlInfo = document.getElementById('urlInfo');
            const subtextWithUrl = textResponse.pauseSubtext.replace('{url}', `<strong>${originalUrl}</strong>`);
            urlInfo.innerHTML = subtextWithUrl;

            // Update button texts
            const continueBtn = document.getElementById('continueBtn');
            const backBtn = document.getElementById('backBtn');
            if (continueBtn) continueBtn.textContent = textResponse.continueButtonText;
            if (backBtn) backBtn.textContent = textResponse.backButtonText;
        } else {
            // Fallback to default text if custom text fails to load
            const urlInfo = document.getElementById('urlInfo');
            urlInfo.innerHTML = `You were trying to visit: <strong>${originalUrl}</strong>`;
        }
    });

    // Set up button event listeners
    document.getElementById('continueBtn').addEventListener('click', () => {
        // Send approval message to background script to allow navigation
        chrome.runtime.sendMessage({ type: 'approveTab', url: originalUrl });
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        // Go back to previous page in browser history
        history.back();
    });

    // Request a random image from the background script
    chrome.runtime.sendMessage({ type: 'getRandomImage' }, (response) => {
        if (response && response.image) {
            const img = document.getElementById('randomImage');
            img.src = response.image;
            img.onerror = () => {
                console.log('Failed to load image:', response.image);
                // Hide image if it fails to load
                img.style.display = 'none';
            };
        } else {
            console.log('No image received from background script');
            document.getElementById('randomImage').style.display = 'none';
        }
    });
});