chrome.action.onClicked.addListener((tab) => {
    sanitizeAndUpdateUrl(tab);
  });
  
  function sanitizeAndUpdateUrl(tab) {
    const url = new URL(tab.url);
    
    // List of common tracking parameters to remove
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_eid', 'mc_cid',
      'source', 'medium', 'campaign', 'content', 'term',
      'ref', 'referrer', 'ref_src', 'ref_url',
      'share', 'share_source',
      '_ga', '_gl', '_hsenc', '_hsmi',
      'igshid', 'sr_share',
      'yclid', 'yp_c'
    ];
  
    // Remove all listed tracking parameters
    trackingParams.forEach(param => {
      url.searchParams.delete(param);
    });
  
    // Remove any parameter that starts with 'utm_'
    for (let param of url.searchParams.keys()) {
      if (param.startsWith('utm_')) {
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
      font-weight: 600;
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