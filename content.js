let isIntercepted = false;
let originalUrl = '';

// Check if current URL should be blocked
function checkUrl() {
  if (isIntercepted || window.location.href.includes('chrome-extension: //')) return;
  
  chrome.runtime.sendMessage({ 
    type: 'shouldBlock', 
    url: window.location.href
    }, (response) => {
    if (response && response.shouldBlock) {
      interceptPage();
        }
    });
}

function interceptPage() {
  if (isIntercepted) return;
  isIntercepted = true;
  originalUrl = window.location.href;
  
  // Stop page loading
  window.stop();
  
  // Clear the page
  document.documentElement.innerHTML = '';
  
  // Create interceptor page
  createInterceptorPage();
}

function createInterceptorPage() {
  document.documentElement.innerHTML = `
    <html>
    <head>
      <title>Take a Moment</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
    }
        .container {
          text-align: center;
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,
        0,
        0,
        0.1);
          max-width: 90%;
          max-height: 90%;
    }
        .image-container {
          margin-bottom: 30px;
    }
        .random-image {
          max-width: 100%;
          max-height: 400px;
          border-radius: 15px;
          object-fit: cover;
    }
        .message {
          font-size: 24px;
          color: #333;
          margin-bottom: 30px;
          font-weight: 300;
    }
        .url-info {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
          word-break: break-all;
    }
        .buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
    }
        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
    }
        .btn-continue {
          background: #667eea;
          color: white;
    }
        .btn-continue:hover {
          background: #5a6fd8;
          transform: translateY(-2px);
    }
        .btn-back {
          background: #f8f9fa;
          color: #333;
          border: 2px solid #dee2e6;
    }
        .btn-back:hover {
          background: #e9ecef;
          transform: translateY(-2px);
    }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="image-container">
          <img class="random-image" id="randomImage" alt="Random image" />
        </div>
        <div class="message">Take a moment to pause</div>
        <div class="url-info">You were trying to visit: <strong>${originalUrl}</strong></div>
        <div class="buttons">
          <button class="btn btn-continue" id="continueBtn">Continue to Site</button>
          <button class="btn btn-back" id="backBtn">Go Back</button>
        </div>
      </div>
    </body>
    </html>
  `;

  document.getElementById('continueBtn').addEventListener('click', () => {
    window.location.href = originalUrl;
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    history.back();
  });

  chrome.runtime.sendMessage({ type: 'getRandomImage' }, (response) => {
    if (response && response.image) {
      document.getElementById('randomImage').src = response.image;
    }
  });
}
// Check URL on page load and navigation
checkUrl();

// Listen for navigation changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    isIntercepted = false;
    checkUrl();
    }
}).observe(document,
{ subtree: true, childList: true
});


