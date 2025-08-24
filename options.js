let currentImages = [];

function loadSettings() {
  chrome.storage.sync.get(['blockedUrls', 'images', 'imageUrls'
    ], (result) => {
    const urlList = document.getElementById('urlList');
    const imageList = document.getElementById('imageList');
    
    const urls = result.blockedUrls || ['facebook.com', 'twitter.com', 'reddit.com'
        ];
    urlList.value = urls.join('\n');
    
    // Load local images (data URLs)
    currentImages = result.images || [];
    displayImagePreviews();
    
    // Load image URLs
    const imageUrls = result.imageUrls || [
      'https: //picsum.photos/800/600?random=1',
      'https: //picsum.photos/800/600?random=2',
      'https: //picsum.photos/800/600?random=3',
      'https: //picsum.photos/800/600?random=4',
      'https: //picsum.photos/800/600?random=5'
        ];
    imageList.value = imageUrls.join('\n');
    });
}

function handleImageFiles(files) {
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        currentImages.push({
          name: file.name,
          dataUrl: e.target.result,
          size: file.size
                });
        displayImagePreviews();
            };
      reader.readAsDataURL(file);
        }
    });
}

function displayImagePreviews() {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';
  
  currentImages.forEach((image, index) => {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.innerHTML = `
      <img src="${image.dataUrl}" alt="${image.name}" title="${image.name}">
      <button class="remove-btn" data-index="${index}" title="Remove image">×</button>
    `;
    preview.appendChild(imageItem);
    });
  
  if (currentImages.length === 0) {
    preview.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No local images selected</div>';
    }
}

function clearAllImages() {
  if (confirm('Are you sure you want to remove all local images?')) {
    currentImages = [];
    displayImagePreviews();
    }
}

function saveSettings() {
  const urlList = document.getElementById('urlList');
  const imageList = document.getElementById('imageList');
  const status = document.getElementById('status');
  
  const urls = urlList.value.split('\n').filter(url => url.trim()).map(url => url.trim());
  const imageUrls = imageList.value.split('\n').filter(img => img.trim()).map(img => img.trim());
  
  // Combine local images (data URLs) and remote URLs for the random selection
  const allImages = [
    ...currentImages.map(img => img.dataUrl),
    ...imageUrls
    ];
  
  chrome.storage.sync.set({
    blockedUrls: urls,
    images: allImages, // Combined list for backwards compatibility
    localImages: currentImages, // Store local images separately for management
    imageUrls: imageUrls // Store URLs separately for editing
    }, () => {
    status.textContent = `Settings saved! ${currentImages.length
        } local images and ${imageUrls.length
        } URL images configured.`;
    status.className = 'status success';
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
        },
        3000);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('save').addEventListener('click', saveSettings);
    document.getElementById('clearImages').addEventListener('click', clearAllImages);

    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('hover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('hover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        handleImageFiles(e.dataTransfer.files);
    });
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        handleImageFiles(e.target.files);
    });

    document.getElementById('imagePreview').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            currentImages.splice(index, 1);
            displayImagePreviews();
        }
    });

    document.getElementById('urlsTabBtn').addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById('urlsTabBtn').classList.add('active');
        document.getElementById('urlsTab').classList.add('active');
    });

    document.getElementById('imagesTabBtn').addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById('imagesTabBtn').classList.add('active');
        document.getElementById('imagesTab').classList.add('active');
    });
});