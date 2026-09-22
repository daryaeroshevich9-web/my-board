/* board v3.0 stage-0 */

import { byId, el } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';

export function showToast(message, type = 'info') {
  const root = byId(IDS.toast);

  if (!root) return;

  const toast = el('div', `toast toast-${type}`, message);

  root.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
