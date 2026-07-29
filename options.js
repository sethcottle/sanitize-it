// Cross-browser namespace: Chrome <144 uses chrome.*, Firefox and Chrome 144+ use browser.*
const api = typeof browser !== 'undefined' ? browser : chrome;

// Smart-mode sub-options. Add an entry here (and a matching check in background.js's
// sanitize()) to introduce a new opt-in behavior — the UI below renders itself from this
// list. `id` is the stored key inside the `smartOptions` object; `default` must match
// SMART_OPTION_DEFAULTS in background.js.
const SMART_OPTIONS = [
  {
    id: 'youtubePlaylist',
    label: 'Strip YouTube playlists',
    detail: 'On a YouTube video link, also remove the playlist (list/index) for a clean link to just the video. Playlist and album pages are left intact.',
    default: false,
  },
  {
    id: 'youtubeTimestamp',
    label: 'Strip YouTube start times',
    detail: 'Remove the start time (t=) from YouTube links so they open at the beginning instead of jumping to a timestamp.',
    default: false,
  },
  {
    id: 'amazonVariant',
    label: 'Strip Amazon variant params',
    detail: "Remove Amazon's th/psc flags for the canonical product link. The item is still set by the /dp/<ASIN> path — this just drops the pre-selected size/color.",
    default: false,
  },
];

document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="defaultAction"]');
  const smartModeToggle = document.getElementById('smartMode');
  const smartOptionsContainer = document.getElementById('smartOptions');
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

  // Build the smart-mode sub-option toggles from SMART_OPTIONS.
  function renderSmartOptions() {
    if (SMART_OPTIONS.length === 0) return;

    const heading = document.createElement('p');
    heading.className = 'suboption-heading';
    heading.textContent = 'Smart mode options';
    smartOptionsContainer.appendChild(heading);

    SMART_OPTIONS.forEach((opt) => {
      const row = document.createElement('label');
      row.className = 'toggle-row';

      const labelWrap = document.createElement('span');
      labelWrap.className = 'option-label';
      const strong = document.createElement('strong');
      strong.textContent = opt.label;
      const detail = document.createElement('span');
      detail.className = 'option-detail';
      detail.textContent = opt.detail;
      labelWrap.appendChild(strong);
      labelWrap.appendChild(detail);

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'toggle-input';
      input.id = `smartopt-${opt.id}`;
      input.dataset.optionId = opt.id;

      const track = document.createElement('span');
      track.className = 'toggle-track';

      row.appendChild(labelWrap);
      row.appendChild(input);
      row.appendChild(track);
      smartOptionsContainer.appendChild(row);

      input.addEventListener('change', () => {
        // Read-modify-write so concurrent toggles don't clobber each other.
        api.storage.sync.get({ smartOptions: {} }).then(({ smartOptions }) => {
          smartOptions[opt.id] = input.checked;
          api.storage.sync.set({ smartOptions }).then(showSaved);
        });
      });
    });
  }

  // Sub-options only take effect while smart mode is on, so mirror that visually.
  function updateSmartOptionsEnabled(smartModeOn) {
    smartOptionsContainer.classList.toggle('disabled', !smartModeOn);
    smartOptionsContainer
      .querySelectorAll('.toggle-input')
      .forEach((input) => { input.disabled = !smartModeOn; });
  }

  renderSmartOptions();

  // Load current settings
  api.storage.sync.get({ defaultAction: 'copy', smartMode: true, smartOptions: {} }).then((result) => {
    const radio = document.querySelector(
      'input[name="defaultAction"][value="' + result.defaultAction + '"]'
    );
    if (radio) radio.checked = true;
    smartModeToggle.checked = result.smartMode;

    SMART_OPTIONS.forEach((opt) => {
      const input = document.getElementById(`smartopt-${opt.id}`);
      if (input) {
        const saved = result.smartOptions[opt.id];
        input.checked = typeof saved === 'boolean' ? saved : opt.default;
      }
    });
    updateSmartOptionsEnabled(result.smartMode);
  });

  // Save default action on change
  radios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      api.storage.sync.set({ defaultAction: e.target.value }).then(showSaved);
    });
  });

  // Save smart mode on change
  smartModeToggle.addEventListener('change', () => {
    updateSmartOptionsEnabled(smartModeToggle.checked);
    api.storage.sync.set({ smartMode: smartModeToggle.checked }).then(showSaved);
  });
});
