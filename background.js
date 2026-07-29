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

// Open welcome page on first install; set uninstall survey URL
api.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    api.tabs.create({ url: 'https://tinyextensions.com/sanitizeit-howto' });
  }
});
api.runtime.setUninstallURL('https://tinyextensions.com/uninstall.html?ext=sanitizeit');

// Right-click menu: the sanitize actions plus Settings, on both the page and
// the toolbar button. With multiple items every browser nests them under a
// "Sanitize It" submenu (1Password-style). This is also the only in-product
// path to Settings on Safari (no Options item on the toolbar button and,
// before Safari 26, no settings button in its extensions pane) and a one-hop
// shortcut past Firefox's Manage Extension → Preferences flow. A context menu
// click counts as user intent, so activeTab covers the injection just like an
// icon click. Runs on every worker start; removeAll keeps it idempotent.
// The sanitize items only show on http(s) pages — injection is impossible on
// browser UI, extension pages, and the Web Store. Settings works anywhere.
const HTTP_PATTERNS = ['http://*/*', 'https://*/*'];
const MENU_ITEMS = [
  { id: 'menu-sanitize-copy', title: 'Copy Sanitized URL', documentUrlPatterns: HTTP_PATTERNS },
  { id: 'menu-sanitize-refresh', title: 'Copy Sanitized URL & Refresh', documentUrlPatterns: HTTP_PATTERNS },
  { id: 'menu-separator', type: 'separator' },
  { id: 'menu-open-settings', title: 'Settings…' },
];

async function registerContextMenus() {
  if (!api.contextMenus) return;
  try {
    await api.contextMenus.removeAll();
    let contexts = ['action', 'page'];
    try {
      MENU_ITEMS.forEach((item) => api.contextMenus.create({ ...item, contexts }));
    } catch (error) {
      // Older engines that don't know the 'action' context
      await api.contextMenus.removeAll();
      contexts = ['page'];
      MENU_ITEMS.forEach((item) => api.contextMenus.create({ ...item, contexts }));
    }
  } catch (error) {
    console.log('Context menu registration failed: ' + error.message);
  }
}
registerContextMenus();

if (api.contextMenus && api.contextMenus.onClicked) {
  api.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'menu-open-settings') {
      api.runtime.openOptionsPage();
      return;
    }
    if (info.menuItemId === 'menu-sanitize-copy' || info.menuItemId === 'menu-sanitize-refresh') {
      if (!tab || !tab.url) return;
      const shouldRefresh = info.menuItemId === 'menu-sanitize-refresh';
      api.storage.sync.get({ smartMode: true, smartOptions: {} }).then((result) => {
        const smartOptions = { ...SMART_OPTION_DEFAULTS, ...result.smartOptions };
        console.log('Context menu: ' + info.menuItemId);
        sanitize(tab, shouldRefresh, result.smartMode, smartOptions);
      });
    }
  });
}

// Smart-mode sub-options: opt-in behaviors layered on top of smart mode. Stored under
// the `smartOptions` key; these defaults are merged with whatever the user has saved, so
// adding a new option here keeps older saved settings working (missing key -> default).
const SMART_OPTION_DEFAULTS = {
  youtubePlaylist: false,
  youtubeTimestamp: false,
  amazonVariant: false,
};

// Icon click: behaviour depends on user preference (Shift inverts the default)
// Alt+Click (Firefox) opens settings directly
api.action.onClicked.addListener((tab, info) => {
  const modifiers = (info && info.modifiers) || [];
  const shiftHeld = modifiers.includes('Shift');
  const altHeld = modifiers.includes('Alt');

  if (altHeld) {
    api.runtime.openOptionsPage();
    return;
  }

  api.storage.sync.get({ defaultAction: 'copy', smartMode: true, smartOptions: {} }).then(async (result) => {
    const defaultIsRefresh = result.defaultAction === 'copyRefresh';
    const shouldRefresh = shiftHeld ? !defaultIsRefresh : defaultIsRefresh;
    const smartOptions = { ...SMART_OPTION_DEFAULTS, ...result.smartOptions };
    console.log('Extension icon clicked (default=' + result.defaultAction + (shiftHeld ? ', Shift' : '') + ')');
    // Safari can hand onClicked a tab object without a url — re-query the
    // active tab (the click already granted activeTab) instead of bailing
    let targetTab = tab;
    if (!targetTab || !targetTab.url) {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      targetTab = tabs[0];
    }
    sanitize(targetTab, shouldRefresh, result.smartMode, smartOptions);
  });
});

// Keyboard shortcuts (work on both Chrome and Firefox)
api.commands.onCommand.addListener((command) => {
  if (command === 'open-settings') {
    api.runtime.openOptionsPage();
    return;
  }
  api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      const shouldRefresh = command === 'sanitize-refresh';
      console.log('Command: ' + command);
      api.storage.sync.get({ smartMode: true, smartOptions: {} }).then((result) => {
        const smartOptions = { ...SMART_OPTION_DEFAULTS, ...result.smartOptions };
        sanitize(tabs[0], shouldRefresh, result.smartMode, smartOptions);
      });
    }
  });
});

// Site-specific allowlists: only these query params are preserved (everything else is stripped).
// Sites not listed here get full aggressive stripping (all query params removed).
const SITE_RULES = {
  'www.youtube.com':   ['v', 'list', 'index', 't', 'search_query'],
  'youtube.com':       ['v', 'list', 'index', 't', 'search_query'],
  'youtu.be':          ['t'],
  'music.youtube.com': ['v', 'list', 'index', 't'],
  'www.google.com':    ['q', 'tbm', 'tbs', 'udm'],
  'google.com':        ['q', 'tbm', 'tbs', 'udm'],
  'search.yahoo.com':  ['p'],
  'www.bing.com':      ['q'],
  'duckduckgo.com':    ['q'],
  'kagi.com':          ['q', 'l', 'r', 'order', 'dr', 'verbatim'],
};

// Amazon has dozens of country domains (amazon.com, amazon.co.uk, amazon.de, ...),
// so they're matched by pattern instead of listed individually.
// th/psc pin the selected size/color variant, node identifies category pages,
// k/s are the search query and sort order. The product itself is the /dp/<ASIN>
// path segment, which is never stripped, not a query parameter.
const AMAZON_HOSTNAME = /(^|\.)amazon\.[a-z]{2,3}(\.[a-z]{2})?$/;
const AMAZON_PARAMS = ['k', 's', 'th', 'psc', 'node'];

function getAllowedParams(hostname) {
  if (SITE_RULES.hasOwnProperty(hostname)) {
    return SITE_RULES[hostname];
  }
  if (AMAZON_HOSTNAME.test(hostname)) {
    return AMAZON_PARAMS;
  }
  return null;
}

function sanitize(tab, shouldRefresh, smartMode, smartOptions = {}) {
  // Nothing to sanitize (and nowhere to inject) on browser UI, extension
  // pages, PDFs, etc. — icon clicks and shortcuts can still land here
  if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
    console.log('Skipping sanitize — not an http(s) page (url=' + (tab && tab.url ? tab.url : 'unavailable') + ')');
    return;
  }
  let url = new URL(tab.url);
  const originalUrl = tab.url;
  const hostname = url.hostname;
  let allowed = getAllowedParams(hostname);
  let usedSmartMode = false;

  if (smartMode !== false && allowed) {
    // Keep only allowlisted params for this site
    usedSmartMode = true;

    // Opt-in smart-mode sub-options remove otherwise-kept params for an even cleaner link.
    const ytHosts = ['www.youtube.com', 'youtube.com', 'music.youtube.com', 'youtu.be'];
    if (ytHosts.includes(hostname)) {
      // Playlist context only exists on watch links (?v=); /playlist and album pages have
      // no `v`, so their list param is always preserved.
      if (smartOptions.youtubePlaylist && url.searchParams.has('v')) {
        allowed = allowed.filter((p) => p !== 'list' && p !== 'index');
      }
      // Drop the start time (t=) so the link opens at the beginning of the video.
      if (smartOptions.youtubeTimestamp) {
        allowed = allowed.filter((p) => p !== 't');
      }
    }
    // Drop Amazon's variant flags (th/psc) for the canonical product link. The item is
    // still identified by the /dp/<ASIN> path; this just removes the pre-selected offer.
    if (smartOptions.amazonVariant && AMAZON_HOSTNAME.test(hostname)) {
      allowed = allowed.filter((p) => p !== 'th' && p !== 'psc');
    }
    const filtered = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (allowed.includes(key)) {
        filtered.set(key, value);
      }
    }
    // YouTube auto-generated mixes (list=RD...) are personalized radio queues,
    // not shareable playlists — drop them and keep just the video link.
    if (filtered.has('v') && /^RD/.test(filtered.get('list') || '')) {
      filtered.delete('list');
      filtered.delete('index');
    }
    const qs = filtered.toString();
    url.search = qs ? '?' + qs : '';
  } else {
    // Aggressive: strip all query params
    url.search = '';
  }

  // Amazon embeds tracking in the path as /ref=... segments. Only strip these
  // on Amazon domains — other sites use /ref/ legitimately (e.g. docs pages).
  if (AMAZON_HOSTNAME.test(hostname)) {
    url.pathname = url.pathname.replace(/\/ref=.*$/, '').replace(/\/ref\/.*$/, '');
  }

  // Remove hash
  url.hash = '';

  const sanitizedUrl = url.toString();
  const wasChanged = sanitizedUrl !== originalUrl;
  console.log('Sanitized URL:', sanitizedUrl);

  // Inject script on the CURRENT page while activeTab permission is still valid.
  // Firefox revokes activeTab after navigation, so we copy + toast first, then navigate.
  api.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyAndNotify,
    args: [sanitizedUrl, shouldRefresh, usedSmartMode, wasChanged]
  }).catch((error) => {
    // Restricted pages that slip past the protocol guard — log instead of
    // surfacing an uncaught rejection in the extensions error console
    console.log('Injection failed: ' + error.message);
  });
}

// Single injected function that handles clipboard + notification in the page context.
// This avoids serializing Promise results back to the background script, which
// Firefox cannot do reliably with scripting.executeScript.
function copyAndNotify(sanitizedUrl, shouldRefresh, usedSmartMode, wasChanged) {

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
    let msg;
    if (!success) {
      msg = 'URL sanitized, but copying to clipboard failed.';
    } else if (!wasChanged) {
      msg = shouldRefresh ? 'URL already clean, copied! Refreshing...' : 'URL already clean, copied to clipboard!';
    } else if (usedSmartMode) {
      msg = shouldRefresh ? 'Copied! (tracking removed, kept essential params) Refreshing...' : 'Copied! (tracking removed, kept essential params)';
    } else {
      msg = shouldRefresh ? 'Sanitized and copied! Refreshing...' : 'Sanitized URL copied to clipboard!';
    }
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
