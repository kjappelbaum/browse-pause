/**
 * Options Page Script
 * 
 * This script manages the extension's settings page where users can:
 * - Configure blocked URLs
 * - Upload local images or add image URLs
 * - Customize pause screen text
 * - Save and load all settings
 * 
 * The script handles two types of storage:
 * - chrome.storage.sync: Small data like URLs and text (syncs across devices)
 * - chrome.storage.local: Large data like uploaded images (local only)
 */

// Global variables to track current state
let currentImages = [];      // Array of uploaded local images
let currentImageUrls = [];   // Array of image URLs

/**
 * Switches between image management tabs (local vs URLs)
 * @param {string} tab - Either 'local' or 'urls'
 */
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

/**
 * Loads all settings from Chrome storage and populates the UI
 * This function is called when the options page loads
 */
function loadSettings() {
  console.log('Loading settings...');
  
  // Load URLs and text settings using storage.sync
  chrome.storage.sync.get(['blockedUrls', 'imageUrls', 'pauseMessage', 'pauseSubtext', 'continueButtonText', 'backButtonText'], (result) => {
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
    
    // Load custom text settings
    document.getElementById('pauseMessage').value = result.pauseMessage || 'Take a breath';
    document.getElementById('pauseSubtext').value = result.pauseSubtext || 'You were trying to visit: {url}';
    document.getElementById('continueButtonText').value = result.continueButtonText || 'Continue to Site';
    document.getElementById('backButtonText').value = result.backButtonText || 'Go Back';
    
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

/**
 * Processes uploaded image files with compression and validation
 * @param {FileList} files - Files selected by user
 * 
 * This function:
 * 1. Validates file types and sizes
 * 2. Compresses images to reduce storage usage
 * 3. Converts to data URLs for storage
 * 4. Updates the preview display
 */
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

/**
 * Updates the image preview display in the options page
 * Shows thumbnails of uploaded images with remove buttons
 */
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

/**
 * Saves all settings to Chrome storage
 * Handles both sync storage (URLs, text) and local storage (images)
 */
function saveSettings() {
  console.log('Saving settings...');
  
  const urlText = document.getElementById('urlList').value;
  const blockedUrls = urlText.split('\n').filter(url => url.trim());
  
  const imageUrlText = document.getElementById('imageList').value;
  const imageUrls = imageUrlText.split('\n').filter(url => url.trim());
  
  // Get custom text values
  const pauseMessage = document.getElementById('pauseMessage').value;
  const pauseSubtext = document.getElementById('pauseSubtext').value;
  const continueButtonText = document.getElementById('continueButtonText').value;
  const backButtonText = document.getElementById('backButtonText').value;
  
  console.log('Saving blockedUrls:', blockedUrls);
  console.log('Saving imageUrls:', imageUrls);
  console.log('Saving custom text settings');
  console.log('Saving localImages:', currentImages.length, 'images');
  
  // Save smaller data (URLs and text) to storage.sync
  chrome.storage.sync.set({
    blockedUrls: blockedUrls,
    imageUrls: imageUrls,
    pauseMessage: pauseMessage,
    pauseSubtext: pauseSubtext,
    continueButtonText: continueButtonText,
    backButtonText: backButtonText
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

    document.getElementById('textTabBtn').addEventListener('click', () => {
        // Switch to text customization tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.getElementById('textTabBtn').classList.add('active');
        document.getElementById('textTab').classList.add('active');
    });
});