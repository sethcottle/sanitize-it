// Copyright (C) 2024 Seth Cottle

// This file is part of Sanitize It.

// Sanitize It is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// Sanitize It is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

chrome.action.onClicked.addListener((tab) => {
  sanitizeAndUpdateUrl(tab);
});

function sanitizeAndUpdateUrl(tab) {
  let url = new URL(tab.url);
  
  // Remove everything after '?'
  url.search = '';
  
  // Remove ref parameters from the pathname
  let newPathname = url.pathname.replace(/\/ref\/.*$/, '');
  newPathname = newPathname.replace(/\/ref=.*$/, '');
  url.pathname = newPathname;

  // Remove hash
  url.hash = '';
  
  const sanitizedUrl = url.toString();
  
  // Update the current tab with the sanitized URL
  chrome.tabs.update(tab.id, { url: sanitizedUrl }, () => {
    // Wait for the page to load before injecting the content script
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        // Inject content script to handle clipboard and notification
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: notifyAndCopyToClipboard,
          args: [sanitizedUrl]
        });
      }
    });
  });
}

function notifyAndCopyToClipboard(sanitizedUrl) {
  // Copy to clipboard
  navigator.clipboard.writeText(sanitizedUrl).then(() => {
    console.log('URL copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });

  // Create and show notification
  const notification = document.createElement('div');
  notification.textContent = 'URL sanitized and copied to clipboard!';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #327834;
    color: white;
    padding: 16px;
    border-radius: 4px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 16px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  `;

  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}