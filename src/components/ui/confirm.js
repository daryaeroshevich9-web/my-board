/* board v3.0 stage-1 */

import { byId } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import { openModal, closeModal } from './modal.js';

let resolver = null;
let settled = true;
let currentClosedListener = null;

function detachClosedListener() {
  const modal = byId(IDS.confirmModal);

  if (modal && currentClosedListener) {
    modal.removeEventListener('modal:closed', currentClosedListener);
  }

  currentClosedListener = null;
}

function settle(value) {
  if (settled) return;

  settled = true;

  const fn = resolver;
  resolver = null;

  detachClosedListener();

  if (typeof fn === 'function') {
    fn(value);
  }
}

export function openConfirm(options = {}) {
  if (!settled) {
    settle(false);
  }

  return new Promise((resolve) => {
    resolver = resolve;
    settled = false;

    const message = byId(IDS.confirmMessage);
    const okButton = byId(IDS.confirmOk);

    if (message) {
      message.textContent = options.message || 'Подтвердить действие?';
    }

    if (okButton) {
      okButton.textContent = options.confirmText || 'Подтвердить';
      okButton.classList.toggle('btn-danger', !!options.danger);
    }

    openModal(IDS.confirmModal);

    const modal = byId(IDS.confirmModal);

    currentClosedListener = () => {
      settle(false);
    };

    if (modal) {
      modal.addEventListener('modal:closed', currentClosedListener);
    }
  });
}

export function handleConfirmAction(action) {
  if (action === 'confirm-ok') {
    settle(true);
    closeModal(IDS.confirmModal);
    return;
  }

  if (action === 'confirm-cancel') {
    settle(false);
    closeModal(IDS.confirmModal);
  }
}
