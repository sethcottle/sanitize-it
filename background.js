// Copyright (C) 2024 Seth Cottle

// This file is part of Sanitize It.

// Sanitize It is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// Sanitize It is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

console.log('Background script loaded');

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  sanitizeAndUpdateUrl(tab);
});

function sanitizeAndUpdateUrl(tab) {
  console.log('sanitizeAndUpdateUrl function called');
  let url = new URL(tab.url);
  
  console.log('Original URL:', url.toString());
  
  // Remove everything after '?'
  url.search = '';
  
  // Remove ref parameters from the pathname
  let newPathname = url.pathname.replace(/\/ref\/.*$/, '');
  newPathname = newPathname.replace(/\/ref=.*$/, '');
  url.pathname = newPathname;

  // Remove hash
  url.hash = '';
  
  const sanitizedUrl = url.toString();
  console.log('Sanitized URL:', sanitizedUrl);
  
  // Update the current tab with the sanitized URL
  chrome.tabs.update(tab.id, { url: sanitizedUrl }, () => {
    console.log('Tab updated with sanitized URL');
    // Wait for the page to load before injecting the content script
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        console.log('Page loaded, copying to clipboard');
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: copyToClipboard,
          args: [sanitizedUrl]
        }).then((results) => {
          console.log('Clipboard operation completed, showing notification');
          const copySucceeded = results[0].result;
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: showNotification,
            args: [
              copySucceeded ? 'URL sanitized and copied to clipboard!' : 'URL sanitized, but copying to clipboard failed.',
              !copySucceeded  // isError flag
            ]
          });
        }).catch((error) => {
          console.error('Error during clipboard operation:', error);
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: showNotification,
            args: ['URL sanitized, but an error occurred while trying to copy.', true]  // isError flag
          });
        });
      }
    });
  });
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => {
      console.log('URL copied to clipboard using Clipboard API');
      return true;
    }).catch(err => {
      console.error('Failed to copy using Clipboard API:', err);
      return fallbackCopyToClipboard(text);
    });
  } else {
    console.log('Clipboard API not available, using fallback method');
    return fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";  // Avoid scrolling to bottom
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    const msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    document.body.removeChild(textArea);
    return false;
  }
}

function showNotification(message, isError = false) {
  console.log('Showing notification:', message);
  
  // Create container for shadow DOM
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
  `;
  
  // Create shadow DOM
  const shadow = container.attachShadow({mode: 'closed'});
  
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  
  // Create style element
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      background-color: ${isError ? '#FFC387' : '#327834'};
      color: ${isError ? 'black' : 'white'};
      padding: 16px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      text-align: center;
      min-width: 200px;
      max-width: 80%;
    }
  `;
  
  // Add style and notification to shadow DOM
  shadow.appendChild(style);
  shadow.appendChild(notification);
  
  // Add class to notification
  notification.className = 'notification';
  
  // Add container to body
  document.body.appendChild(container);
  console.log('Notification added to the page');

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(container);
      console.log('Notification removed from the page');
    }, 500);
  }, 3000);
}

console.log('Background script setup complete');