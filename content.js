// Copyright (C) 2024 Seth Cottle

// This file is part of Sanitize It.

// Sanitize It is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// Sanitize It is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sanitized") {
    notifyAndCopyToClipboard(request.url);
  }
});

function notifyAndCopyToClipboard(sanitizedUrl) {
  // Copy to clipboard
  navigator.clipboard.writeText(sanitizedUrl).then(() => {
    console.log('URL copied to clipboard');
    // Show notification after successful copy
    showNotification('URL sanitized and copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
    // Show error notification if copy fails
    showNotification('URL sanitized, but failed to copy to clipboard. Please try again.');
  });
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
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