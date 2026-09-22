/* board v3.0 stage-1 */

import { byId, clear, el } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import * as store from '../../core/store.js';
import { openModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';

export function initZonesManager() {
  const list = byId(IDS.zonesList);

  if (!list) return;

  list.addEventListener('change', (event) => {
    const target = event.target;
    const row = target.closest('[data-zone-key]');

    if (!row) return;

    const zoneKey = row.dataset.zoneKey;

    if (target.matches('[data-zone-field="hidden"]')) {
      store.mutate((state) => {
        const zone = state.zones.find((item) => item.key === zoneKey);

        if (!zone) return;

        zone.hidden = target.checked;
      });

      renderZonesModal(true);
      return;
    }

    if (target.matches('[data-zone-field="color"]')) {
      store.mutate((state) => {
        const zone = state.zones.find((item) => item.key === zoneKey);

        if (!zone) return;

        zone.color = target.value;
      });

      renderZonesModal(true);
      return;
    }

    if (target.matches('[data-zone-field="label"]')) {
      const value = target.value.trim();

      store.mutate((state) => {
        const zone = state.zones.find((item) => item.key === zoneKey);

        if (!zone) return;

        if (value) {
          zone.label = value;
        } else {
          target.value = zone.label;
        }
      });

      renderZonesModal(true);
    }
  });
}

export function openZonesManager() {
  renderZonesModal(true);
  openModal(IDS.zonesModal);
}

export function handleZonesAction(action, target) {
  if (action === 'open-zones') {
    openZonesManager();
    return;
  }

  if (action === 'create-zone') {
    createZone();
    return;
  }

  if (action === 'set-zone-tint') {
    const zoneKey = target.dataset.zoneKey;
    const tint = Number(target.dataset.tint);

    store.mutate((state) => {
      const zone = state.zones.find((item) => item.key === zoneKey);

      if (!zone) return;

      zone.tint = tint;
      zone.color = null;
    });

    renderZonesModal(true);
  }
}

function createZone() {
  const input = byId(IDS.zoneNewLabel);

  if (!input) return;

  const label = input.value.trim();

  if (!label) {
    showToast('Название раздела не может быть пустым', 'error');
    return;
  }

  store.mutate((state) => {
    state.zones.push({
      key: `z_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
      label,
      emoji: '🗂️',
      hidden: false,
      tint: state.zones.length % 6,
      color: null,
    });
  });

  input.value = '';

  showToast('Раздел создан', 'success');
  renderZonesModal(true);
}

export function renderZonesModal(force = false) {
  const modal = byId(IDS.zonesModal);
  const list = byId(IDS.zonesList);

  if (!modal || !list) return;
  if (modal.hidden && !force) return;

  clear(list);

  const zones = store.getState().zones;

  if (!zones.length) {
    list.appendChild(el('p', 'empty', 'Разделы не найдены.'));
    return;
  }

  zones.forEach((zone) => {
    const row = el('div', 'zone-row');
    row.dataset.zoneKey = zone.key;

    const top = el('div', 'zone-row-top');

    const labelInput = document.createElement('input');
    labelInput.className = 'input zone-label-input';
    labelInput.value = zone.label;
    labelInput.dataset.zoneField = 'label';
    labelInput.autocomplete = 'off';

    const hiddenLabel = document.createElement('label');
    hiddenLabel.className = 'zone-hidden-label';

    const hiddenCheckbox = document.createElement('input');
    hiddenCheckbox.type = 'checkbox';
    hiddenCheckbox.checked = !!zone.hidden;
    hiddenCheckbox.dataset.zoneField = 'hidden';

    hiddenLabel.append(hiddenCheckbox, ' скрыт');
    top.append(labelInput, hiddenLabel);
    row.appendChild(top);

    const tints = el('div', 'zone-tints');

    for (let tint = 0; tint < 6; tint += 1) {
      const tintButton = el('button', `tint-btn tint-${tint}`);
      tintButton.type = 'button';
      tintButton.dataset.action = 'set-zone-tint';
      tintButton.dataset.zoneKey = zone.key;
      tintButton.dataset.tint = String(tint);

      if (zone.color === null && zone.tint === tint) {
        tintButton.classList.add('is-active');
      }

      tints.appendChild(tintButton);
    }

    row.appendChild(tints);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.dataset.zoneField = 'color';
    colorInput.value = /^#[0-9a-f]{6}$/i.test(zone.color || '')
      ? zone.color
      : '#ffffff';

    row.appendChild(colorInput);

    list.appendChild(row);
  });
}
