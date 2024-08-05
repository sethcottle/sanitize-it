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
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    chrome.action.setPopup({ tabId: tab.id, popup: 'restricted.html' });
    chrome.action.openPopup();
  } else {
    sanitizeAndUpdateUrl(tab);
  }
});

function sanitizeAndUpdateUrl(tab) {
  const url = new URL(tab.url);
  
  // List of common tracking parameters to remove
  const trackingParams = [
    // UTM parameters
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    // Social media
    'fbclid', 'gclid', 'msclkid', 'igshid',
    // Email marketing
    'mc_eid', 'mc_cid',
    // General
    'source', 'medium', 'campaign', 'content', 'term',
    'ref', 'referrer', 'ref_src', 'ref_url',
    'share', 'share_source',
    // Analytics
    '_ga', '_gl', '_hsenc', '_hsmi', 'yclid', 'yp_c',
    // E-commerce and affiliate
    'tag', 'affiliate', 'affiliateid', 'aff', 'afid',
    'pcrid', 'productid', 'keywordid', 'siteid', 'adid', 'network',
    // Amazon specific
    'ascsubtag', 'sc', 'linkId', 'linkCode', 'camp', 'creative',
    // Other e-commerce
    'geniuslink', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_p', 'pf_rd_r',
  ];

  // Remove all listed tracking parameters
  trackingParams.forEach(param => {
    url.searchParams.delete(param);
  });

  // Remove any parameter that starts with 'utm_' or 'aff_'
  for (let param of url.searchParams.keys()) {
    if (param.startsWith('utm_') || param.startsWith('aff_')) {
      url.searchParams.delete(param);
    }
  }
  
  // Remove ref parameters from the pathname
  let newPathname = url.pathname.replace(/\/ref\/.*$/, '');
  newPathname = newPathname.replace(/\/ref=.*$/, '');
  url.pathname = newPathname;

  // Remove hash if it contains tracking information
  if (url.hash.includes('?') || trackingParams.some(param => url.hash.includes(param))) {
    url.hash = '';
  }
  
  const sanitizedUrl = url.toString();
  
  // Update the current tab with the sanitized URL
  chrome.tabs.update(tab.id, { url: sanitizedUrl }, () => {
    // Wait for the page to load before injecting the content script
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        // Inject content script to handle clipboard and notification
        chrome.tabs.sendMessage(tab.id, { action: "sanitized", url: sanitizedUrl });
      }
    });
  });
}