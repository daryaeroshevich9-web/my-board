/* board v3.0 stage-0 */

import { byId } from '../../core/dom.js';

let stack = [];

export function initModal() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && stack.length) {
      event.preventDefault();
      closeTop();
    }
  });
}

export function openModal(id) {
  const modal = byId(id);

  if (!modal) return;
  if (stack.some((item) => item.id === id)) return;

  const opener = document.activeElement;

  stack.push({
    id,
    opener,
  });

  modal.hidden = false;
  applyZIndexes();

  const focusable = modal.querySelector(
    '[data-autofocus], input, textarea, select, button:not([data-action="modal-close"])'
  );

  if (focusable) {
    setTimeout(() => {
      focusable.focus();
    }, 0);
  }
}

export function closeModal(id) {
  const index = stack.findIndex((item) => item.id === id);

  if (index === -1) return;

  const entry = stack[index];
  const modal = byId(id);

  if (modal) {
    modal.hidden = true;
  }

  stack.splice(index, 1);
  applyZIndexes();

  if (entry.opener && typeof entry.opener.focus === 'function') {
    entry.opener.focus();
  }
}

export function closeTop() {
  if (!stack.length) return;

  const top = stack[stack.length - 1];
  closeModal(top.id);
}

function applyZIndexes() {
  stack.forEach((item, index) => {
    const modal = byId(item.id);

    if (!modal) return;

    modal.style.zIndex = String(1000 + index * 10);
  });
}
