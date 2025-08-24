function loadSettings() {
  chrome.storage.sync.get(['blockedUrls', 'localImages', 'imageUrls'
    ], (result) => {
    const urlList = document.getElementById('urlList');
    const imageCount = document.getElementById('imageCount');
    
    const urls = result.blockedUrls || [];
    urlList.innerHTML = urls.length ? urls.join('<br>') : 'No URLs blocked';
    
    const localImages = result.localImages || [];
    const imageUrls = result.imageUrls || [];
    const totalImages = localImages.length + imageUrls.length;
    
    imageCount.innerHTML = `
      ${totalImages
        } total images<br>
      <small>${localImages.length
        } local, ${imageUrls.length
        } URLs</small>
    `;
    });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('openOptionsBtn').addEventListener('click', openOptions);