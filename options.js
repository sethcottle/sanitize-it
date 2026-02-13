// Cross-browser namespace: Chrome <144 uses chrome.*, Firefox and Chrome 144+ use browser.*
const api = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="defaultAction"]');
  const saveIndicator = document.getElementById('saveIndicator');
  let hideTimeout;

  // Load current setting
  api.storage.sync.get({ defaultAction: 'copy' }).then((result) => {
    const radio = document.querySelector(
      'input[name="defaultAction"][value="' + result.defaultAction + '"]'
    );
    if (radio) radio.checked = true;
  });

  // Save on change
  radios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      api.storage.sync.set({ defaultAction: e.target.value }).then(() => {
        // Show save indicator
        clearTimeout(hideTimeout);
        saveIndicator.classList.remove('hiding');
        saveIndicator.classList.add('visible');

        hideTimeout = setTimeout(() => {
          saveIndicator.classList.remove('visible');
          saveIndicator.classList.add('hiding');
          setTimeout(() => saveIndicator.classList.remove('hiding'), 300);
        }, 1500);
      });
    });
  });
});
