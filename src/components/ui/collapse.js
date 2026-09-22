/* board v3.0 stage-1 */

import { qs, qsa } from '../../core/dom.js';

const expanded = {
  desc: new Set(),
  subtext: new Set(),
  sublist: new Set(),
};

export function handleCollapseToggle(target) {
  const kind = target.dataset.collapseKind;
  const key = target.dataset.collapseKey;

  if (!kind || !key || !expanded[kind]) return;

  if (expanded[kind].has(key)) {
    expanded[kind].delete(key);
  } else {
    expanded[kind].add(key);
  }

  applyCollapse(document);
}

export function applyCollapse(root = document) {
  qsa('[data-collapse-text]', root).forEach((element) => {
    if (element.closest('.is-hidden-extra') || element.offsetParent === null) {
      return;
    }

    const kind = element.dataset.collapseKind;
    const key = element.dataset.collapseKey;

    if (!kind || !key || !expanded[kind]) return;

    const isExpanded = expanded[kind].has(key);

    element.classList.add('is-collapsed');

    const hasOverflow = element.scrollHeight > element.clientHeight + 1;

    element.classList.toggle('is-collapsed', !isExpanded && hasOverflow);

    const toggle = qs(`[data-collapse-toggle="${kind}:${key}"]`, root);

    if (toggle) {
      toggle.hidden = !hasOverflow;
      toggle.textContent = isExpanded ? 'свернуть ▴' : 'развернуть ▾';
    }
  });

  qsa('[data-sublist]', root).forEach((list) => {
    const key = list.dataset.sublist;

    if (!key) return;

    const items = qsa(`[data-sublist-item="${key}"]`, root);
    const toggle = qs(`[data-sublist-toggle="${key}"]`, root);

    const hasOverflow = items.length > 5;
    const isExpanded = expanded.sublist.has(key);

    items.forEach((item, index) => {
      item.classList.toggle(
        'is-hidden-extra',
        hasOverflow && !isExpanded && index >= 5
      );
    });

    if (toggle) {
      toggle.hidden = !hasOverflow;
      toggle.textContent = isExpanded
        ? 'свернуть ▴'
        : `развернуть (ещё ${items.length - 5}) ▾`;
    }
  });
}
