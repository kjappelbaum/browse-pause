document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get('url');

    const urlInfo = document.getElementById('urlInfo');
    urlInfo.innerHTML = `You were trying to visit: <strong>${originalUrl}</strong>`;

    document.getElementById('continueBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'approveTab', url: originalUrl });
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        history.back();
    });

    chrome.runtime.sendMessage({ type: 'getRandomImage' }, (response) => {
        if (response && response.image) {
            const img = document.getElementById('randomImage');
            img.src = response.image;
            img.onerror = () => {
                console.log('Failed to load image:', response.image);
                // Fallback to a solid color background if image fails
                img.style.display = 'none';
            };
        } else {
            console.log('No image received from background script');
            document.getElementById('randomImage').style.display = 'none';
        }
    });
});