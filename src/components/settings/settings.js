/* board v3.0 stage-0 */

import { byId } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import {
  getToken,
  setToken,
  setInit,
} from '../../core/store.js';
import {
  openModal,
  closeModal,
} from '../ui/modal.js';
import { showToast } from '../ui/toast.js';

let afterSaveCallback = null;

export function initSettings(deps = {}) {
  afterSaveCallback = deps.onSaved || null;
}

export function openSettings() {
  const input = byId(IDS.settingsToken);

  if (input) {
    input.value = getToken();
  }

  openModal(IDS.settingsModal);
}

export function saveSettings() {
  const input = byId(IDS.settingsToken);
  const value = (input?.value || '').trim();

  setToken(value);
  setInit();
  closeModal(IDS.settingsModal);

  showToast(value ? 'Токен сохранён' : 'Токен удалён', 'success');

  if (typeof afterSaveCallback === 'function') {
    afterSaveCallback();
  }
}
