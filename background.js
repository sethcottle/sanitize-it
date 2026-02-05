// Copyright (C) 2024 Seth Cottle

// This file is part of Sanitize It.

// Sanitize It is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// Sanitize It is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

// Cross-browser namespace: Chrome <144 uses chrome.*, Firefox and Chrome 144+ use browser.*
const api = typeof browser !== 'undefined' ? browser : chrome;

console.log('Background script loaded');

// Icon click: copy only (Firefox Shift+Click = copy + refresh)
api.action.onClicked.addListener((tab, info) => {
  const shouldRefresh = !!(info && info.modifiers && info.modifiers.includes('Shift'));
  console.log('Extension icon clicked' + (shouldRefresh ? ' (Shift+Click)' : ''));
  sanitize(tab, shouldRefresh);
});

// Keyboard shortcuts (work on both Chrome and Firefox)
api.commands.onCommand.addListener((command) => {
  api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      const shouldRefresh = command === 'sanitize-refresh';
      console.log('Command: ' + command);
      sanitize(tabs[0], shouldRefresh);
    }
  });
});

function sanitize(tab, shouldRefresh) {
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
  console.log('Sanitized URL:', sanitizedUrl);

  // Inject script on the CURRENT page while activeTab permission is still valid.
  // Firefox revokes activeTab after navigation, so we copy + toast first, then navigate.
  api.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyAndNotify,
    args: [sanitizedUrl, shouldRefresh]
  });
}

// Single injected function that handles clipboard + notification in the page context.
// This avoids serializing Promise results back to the background script, which
// Firefox cannot do reliably with scripting.executeScript.
function copyAndNotify(sanitizedUrl, shouldRefresh) {

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => {
        console.log('URL copied to clipboard using Clipboard API');
        return true;
      }).catch(err => {
        console.error('Failed to copy using Clipboard API:', err);
        return fallbackCopy(text);
      });
    } else {
      console.log('Clipboard API not available, using fallback method');
      return Promise.resolve(fallbackCopy(text));
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      console.log('Fallback: Copying text command was ' + (successful ? 'successful' : 'unsuccessful'));
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback: Unable to copy', err);
      document.body.removeChild(textArea);
      return false;
    }
  }

  function showNotification(message, isError) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      pointer-events: none;
    `;

    const shadow = container.attachShadow({mode: 'closed'});

    const notification = document.createElement('div');
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes toast-in {
        from { opacity: 0; transform: translateY(-8px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes toast-out {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(-8px) scale(0.96); }
      }
      .notification {
        background: ${isError ? 'rgba(60, 40, 20, 0.88)' : 'rgba(20, 40, 20, 0.88)'};
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        color: ${isError ? '#FFC387' : '#6FCF6A'};
        padding: 10px 18px;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: -0.01em;
        line-height: 1.4;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12), inset 0 0.5px 0 rgba(255,255,255,0.08);
        border: 0.5px solid ${isError ? 'rgba(255,195,135,0.15)' : 'rgba(111,207,106,0.15)'};
        text-align: center;
        animation: toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .notification.dismiss {
        animation: toast-out 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;
      }
    `;

    shadow.appendChild(style);
    shadow.appendChild(notification);
    notification.className = 'notification';
    document.body.appendChild(container);

    setTimeout(() => {
      notification.classList.add('dismiss');
      setTimeout(() => {
        document.body.removeChild(container);
      }, 350);
    }, 3000);
  }

  // Run clipboard, show toast, then optionally navigate
  copyToClipboard(sanitizedUrl).then((success) => {
    const msg = success
      ? (shouldRefresh ? 'Sanitized and copied! Refreshing...' : 'Sanitized URL copied to clipboard!')
      : 'URL sanitized, but copying to clipboard failed.';
    showNotification(msg, !success);
  }).catch(() => {
    showNotification('URL sanitized, but an error occurred while trying to copy.', true);
  }).finally(() => {
    if (shouldRefresh) {
      setTimeout(() => {
        location.replace(sanitizedUrl);
      }, 1500);
    }
  });
}

console.log('Background script setup complete');
