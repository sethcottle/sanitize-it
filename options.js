// Cross-browser namespace: Chrome <144 uses chrome.*, Firefox and Chrome 144+ use browser.*
const api = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="defaultAction"]');
  const smartModeToggle = document.getElementById('smartMode');
  const saveIndicator = document.getElementById('saveIndicator');
  let hideTimeout;

  function showSaved() {
    clearTimeout(hideTimeout);
    saveIndicator.classList.remove('hiding');
    saveIndicator.classList.add('visible');

    hideTimeout = setTimeout(() => {
      saveIndicator.classList.remove('visible');
      saveIndicator.classList.add('hiding');
      setTimeout(() => saveIndicator.classList.remove('hiding'), 300);
    }, 1500);
  }

  // Load current settings
  api.storage.sync.get({ defaultAction: 'copy', smartMode: true }).then((result) => {
    const radio = document.querySelector(
      'input[name="defaultAction"][value="' + result.defaultAction + '"]'
    );
    if (radio) radio.checked = true;
    smartModeToggle.checked = result.smartMode;
  });

  // Save default action on change
  radios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      api.storage.sync.set({ defaultAction: e.target.value }).then(showSaved);
    });
  });

  // Save smart mode on change
  smartModeToggle.addEventListener('change', () => {
    api.storage.sync.set({ smartMode: smartModeToggle.checked }).then(showSaved);
  });
});
