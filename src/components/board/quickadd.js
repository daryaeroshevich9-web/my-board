/* board v3.0 stage-1 */

import { byId, clear, el } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import * as store from '../../core/store.js';
import { parseMagicDate } from '../../core/dates.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';

let pendingLines = [];

export function initQuickAdd() {
  const input = byId(IDS.quickAddInput);

  if (!input) return;

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitInput();
    }
  });

  input.addEventListener('paste', (event) => {
    const text = event.clipboardData.getData('text');

    if (text.includes('\n')) {
      event.preventDefault();

      addLines(text.split(/\r?\n/));
      input.value = '';
    }
  });

  const quickZoneModal = byId(IDS.quickZoneModal);

  if (quickZoneModal) {
    quickZoneModal.addEventListener('modal:closed', () => {
      pendingLines = [];
    });
  }
}

export function handleQuickAddAction(action, target) {
  if (action === 'quick-add-submit') {
    submitInput();
    return;
  }

  if (action === 'quick-zone-select') {
    const zoneKey = target.dataset.zoneKey;

    if (pendingLines.length && zoneKey) {
      addTasksToZone(pendingLines, zoneKey);
      pendingLines = [];
    }

    closeModal(IDS.quickZoneModal);
  }
}

function submitInput() {
  const input = byId(IDS.quickAddInput);

  if (!input) return;

  const lines = input.value.split(/\r?\n/);

  if (lines.some((line) => line.trim())) {
    addLines(lines);
  }

  input.value = '';
}

function addLines(lines) {
  const cleaned = lines
    .map((line) => line.trim())
    .filter(Boolean);

  if (!cleaned.length) return;

  const state = store.getState();
  const other = state.zones.find((zone) => zone.key === 'other');

  if (other && !other.hidden) {
    addTasksToZone(cleaned, other.key);
    return;
  }

  pendingLines = cleaned;

  renderQuickZoneList();
  openModal(IDS.quickZoneModal);
}

function addTasksToZone(lines, zoneKey) {
  let added = 0;

  store.mutate((state) => {
    lines.forEach((line) => {
      const parsed = parseMagicDate(line);

      const title =
        parsed.cleanText ||
        'Без темы';

      state.tasks.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        zone: zoneKey,
        title,
        desc: '',
        done: false,
        created: new Date().toISOString(),
        doneAt: null,
        archived: false,
        deleted: false,
        due: parsed.due || null,
        tags: [],
        pinned: false,
        subtasks: [],
        subOpen: false,
      });

      added += 1;
    });
  });

  if (added) {
    showToast(`Добавлено задач: ${added}`, 'success');
  }
}

function renderQuickZoneList() {
  const list = byId(IDS.quickZoneList);

  if (!list) return;

  clear(list);

  const zones = store.getState().zones;

  if (!zones.length) {
    list.appendChild(el('p', 'empty', 'Разделы не найдены.'));
    return;
  }

  zones.forEach((zone) => {
    const button = el('button', 'list-row');
    button.type = 'button';
    button.dataset.action = 'quick-zone-select';
    button.dataset.zoneKey = zone.key;
    button.textContent = `${zone.emoji || '🗂️'} ${zone.label}${
      zone.hidden ? ' (скрыт)' : ''
    }`;

    list.appendChild(button);
  });
}
