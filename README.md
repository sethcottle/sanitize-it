![sanitizeit](https://github.com/user-attachments/assets/29507a3b-51d0-42e0-b7ba-b4698046025b)

# Sanitize It

Sanitize It allows you to quickly remove tracking information from the current page and automatically copy the URL to your clipboard with a single click.

## Does Sanitize It work automatically?
No, you'll need to manually run Sanitize It when you want to clean up the URL of the current page you're on. Once you run Sanitize It, the sanitized URL will automatically copy to your clipboard for quick and easy sharing.

![CleanShot 2024-08-05 at 22 12 19@2x](https://github.com/user-attachments/assets/3532bcce-1974-4915-8b28-11cdeb7a39d8)

## Breaking Down Sanitize It

### Event Listener for Extension Icon Click

```javascript
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  sanitizeAndUpdateUrl(tab);
});
```

Sets up an event listener that triggers when the user clicks the extension icon. It logs the click and calls the sanitizeAndUpdateUrl function with the current tab as an argument.

### URL Sanitization Function

```javascript
function sanitizeAndUpdateUrl(tab) {
```

This function takes a tab object as its parameter, which represents the current browser tab.

```javascript
let url = new URL(tab.url);
```

Creates a new `URL` object from the current tab's URL. This allows easy manipulation of different parts of the URL.

```javascript
url.search = '';
```

Sets the `search` property of the URL (everything after and including the '?') to an empty string, effectively removing all query parameters.

```javascript
let newPathname = url.pathname.replace(/\/ref\/.*$/, '');
newPathname = newPathname.replace(/\/ref=.*$/, '');
url.pathname = newPathname;
```

Removes '/ref/' or '/ref=' and everything after it from the pathname. This handles cases where 'ref' parameters are part of the path rather than query parameters.

```javascript
url.hash = '';
```

Removes the hash (fragment identifier) from the URL.

```javascript
const sanitizedUrl = url.toString();
console.log('Sanitized URL:', sanitizedUrl);
```

Converts the modified URL object back to a string.

```javascript
chrome.tabs.update(tab.id, { url: sanitizedUrl }, () => {
  // ... (callback function)
});
```

Uses Chrome's tabs API to update the current tab with the sanitized URL.

```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: notifyAndCopyToClipboard,
  args: [sanitizedUrl]
}).then(() => {
  console.log('Content script injected successfully');
}).catch((error) => {
  console.error('Error injecting content script:', error);
});
```

Once the page is loaded, this injects the `notifyAndCopyToClipboard` function as a content script, it passes the sanitized URL as an argument to this function.

```javascript
chrome.tabs.onUpdated.removeListener(listener);
```

Removes the update listener to prevent memory leaks and unnecessary processing.

### Notification and Clipboard Function

```javascript
function notifyAndCopyToClipboard(sanitizedUrl) {
  // ... (function body)
}
```

This copies the sanitized URL to the clipboard abd creates and displays a notification to inform the user that the URL has been sanitized and copied.
