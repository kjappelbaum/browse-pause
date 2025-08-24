if (sessionStorage.getItem('browse-pause-proceed') === 'true') {
    sessionStorage.removeItem('browse-pause-proceed');
} else {
    chrome.runtime.sendMessage({
        type: 'shouldBlock',
        url: window.location.href
    });
}