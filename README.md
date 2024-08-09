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

Sets up an event listener that triggers when the user clicks the extension icon. It logs the click and calls the `sanitizeAndUpdateUrl` function with the current tab as an argument.

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

## Requested Permissions
Sanitize It requests a few permissions in the `manifest.json` file.

`activeTab` allows the extension to access the currently active tab when the user invokes the extension. This permission is used to access and modify the URL of the current tab when the user clicks the extension icon.

`scripting` allows the extension to inject and execute scripts in web pages. This permission is used to inject the `notifyAndCopyToClipboard` function as a content script into the active tab after sanitizing the URL.

`clipboardWrite` allows the extension to write data to the system clipboard. This permission is used in the `notifyAndCopyToClipboard` function to copy the sanitized URL to the user's clipboard.

`tabs` allows the extension access to the `chrome.tabs` API, allowing it to interact with the browser's tab system. This permission is used to update the current tab's URL with the sanitized version and to listen for tab update events to know when the new page has finished loading.

#### Privacy

Sanitize It runs completely locally in your browser. It does not collect any analytics, it does not store any information about your tabs or browser history, it does not send any data back for processing or analysis. Your data is yours and yours alone. 

## Installing Sanitize It

Sanitize It is available in the Google Chrome Web Store, the Microsoft Edge Add-ons Store, macOS App Store for Safari, and available for manual download and installation.

[![Get on the Google Chrome Web Store](https://cdn.cottle.cloud/tabcloser/buttons/button-webstore.svg)](https://chromewebstore.google.com/detail/sanitize-it/cdihhogfljcidhcpjdhhelbmbhbeafgd)

[![Get on the Microsoft Edge Store](https://cdn.cottle.cloud/tabcloser/buttons/button-edge.svg)](https://microsoftedge.microsoft.com/addons/detail/sanitize-it/agaghmjjnhddaoneohbdgmemdmekanph)

[![Get on the macOS App Store](https://cdn.cottle.cloud/tabcloser/buttons/button-macos.svg)](https://apps.apple.com/us/app/sanitize-it/id6612008481)

[![Download the Latest GitHub Release](https://cdn.cottle.cloud/tabcloser/buttons/button-latest.svg)](https://github.com/sethcottle/sanitize-it/zipball/main)

#### For Chrome
Download the latest release and unzip it. Then navigate to `chrome://extensions/` and enable "Developer mode" using the toggle in the top right corner. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

#### For Edge
Download the latest release and unzip it. Then navigate to `edge://extensions/` and enable "Developer mode" in the left sidebar, it's near the bottom. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

#### For Safari
`sanitize-it-1.3.2-macos` is available for download in the latest release. You can unzip this and drag Sanitize It.app to your Applications folder. Sanitize It.app was created using Xcode and signed for Direct Distribution, however there are a few steps you'll need to take to enable it. Once you install Sanitize It you'll need to launch Safari and go to `Safari` > `Settings` > `Advanced` and check `Show features for web developers`. Once you've done that, go to the Developer tab and enable `Allow unsigned extensions`. [Need help? Watch the installation video from my other extension, TabCloser](https://youtu.be/ZKSxBJY_g7c?si=7oH_BDfJDnXYTIY3).

## Support the Addon

You can support Sanitize It by contributing through these links:

[![Buy Me A Coffee](https://cdn.cottle.cloud/tabcloser/buttons/button-bmac.svg)](https://buymeacoffee.com/seth)

[![PayPal](https://cdn.cottle.cloud/tabcloser/buttons/button-paypal.svg)](https://www.paypal.com/paypalme/sethcottle)

[![GitHub Sponsors](https://cdn.cottle.cloud/tabcloser/buttons/button-ghs.svg)](https://github.com/sponsors/sethcottle)

Signing up through these services through these affiliate links is also a good way to support Sanitize It.

[![Try DigitalOcean](https://cdn.cottle.cloud/tabcloser/buttons/button-do.svg)](https://m.do.co/c/632b45e20266)

[![Try Fathom Analytics](https://cdn.cottle.cloud/tabcloser/buttons/button-fa.svg)](https://usefathom.com/ref/EQVZMV)

## Thanks
Thanks to [Ryan Cuppernull](https://github.com/proxemics) for inspiring this extension!

## License

Copyright (C) 2024 Seth Cottle

Sanitize It is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any later version.

Sanitize It is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
[GNU General Public License](https://www.gnu.org/licenses/quick-guide-gplv3.html) for more details.
