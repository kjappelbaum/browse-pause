let currentImages = [];
let currentImageUrls = [];

function switchImageTab(tab) {
    const tabs = document.querySelectorAll('#imagesTab .tab');
    const contents = document.querySelectorAll('#imagesTab .tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    if (tab === 'local') {
        document.querySelector('#imagesTab .tab').classList.add('active');
        document.getElementById('localTab').classList.add('active');
    } else {
        document.querySelectorAll('#imagesTab .tab')[1].classList.add('active');
        document.getElementById('imageUrlsTab').classList.add('active');
    }
}

function loadSettings() {
  console.log('Loading settings...');
  
  // Load URLs using storage.sync
  chrome.storage.sync.get(['blockedUrls', 'imageUrls'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading sync settings:', chrome.runtime.lastError);
      return;
    }
    
    console.log('Loaded sync settings:', result);
    
    if (result.blockedUrls) {
      document.getElementById('urlList').value = result.blockedUrls.join('\n');
    }
    
    currentImageUrls = result.imageUrls || [];
    document.getElementById('imageList').value = currentImageUrls.join('\n');
    
    // Load local images using storage.local (for larger data)
    chrome.storage.local.get(['localImages'], (localResult) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading local settings:', chrome.runtime.lastError);
        return;
      }
      
      console.log('Loaded local settings:', localResult);
      currentImages = localResult.localImages || [];
      displayImagePreviews();
    });
  });
}

function handleImageFiles(files) {
  console.log('Handling files:', files.length);
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      console.log('Processing image:', file.name, 'Size:', file.size);
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Image ${file.name} is too large. Please use images smaller than 5MB.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        // Create an image element to resize it
        const img = new Image();
        img.onload = function() {
          // Resize image to max 800x600 to reduce size
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          const maxWidth = 800;
          const maxHeight = 600;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress the image
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
          
          console.log('Original size:', e.target.result.length, 'Compressed size:', compressedDataUrl.length);
          
          currentImages.push({
            name: file.name,
            dataUrl: compressedDataUrl,
            size: compressedDataUrl.length
          });
          console.log('Image added, total images:', currentImages.length);
          displayImagePreviews();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      console.log('Skipping non-image file:', file.name);
    }
  });
}

function displayImagePreviews() {
  console.log('Displaying image previews for', currentImages.length, 'images');
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
    console.log('Clearing all local images');
    currentImages = [];
    displayImagePreviews();
    // Auto-save after clearing images
    saveSettings();
  }
}

function saveSettings() {
  console.log('Saving settings...');
  
  const urlText = document.getElementById('urlList').value;
  const blockedUrls = urlText.split('\n').filter(url => url.trim());
  
  const imageUrlText = document.getElementById('imageList').value;
  const imageUrls = imageUrlText.split('\n').filter(url => url.trim());
  
  console.log('Saving blockedUrls:', blockedUrls);
  console.log('Saving imageUrls:', imageUrls);
  console.log('Saving localImages:', currentImages.length, 'images');
  
  // Save smaller data (URLs) to storage.sync
  chrome.storage.sync.set({
    blockedUrls: blockedUrls,
    imageUrls: imageUrls
    // Note: We don't save the 'images' combined array here anymore since it contains large data URLs
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving sync settings:', chrome.runtime.lastError);
      showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    // Save larger data (local images) to storage.local
    chrome.storage.local.set({
      localImages: currentImages
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving local settings:', chrome.runtime.lastError);
        showStatus('Error saving local images: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      console.log('All settings saved successfully');
      showStatus('Settings saved!', 'success');
    });
  });
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('save').addEventListener('click', saveSettings);
    document.getElementById('clearImages').addEventListener('click', clearAllImages);

    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
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