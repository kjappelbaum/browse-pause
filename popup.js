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

function openOptions() {
  chrome.runtime.openOptionsPage();
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('openOptionsBtn').addEventListener('click', openOptions);