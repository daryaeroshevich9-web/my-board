/* board v3.0 stage-0 */

import { IDS } from './core/ids.js';
import { byId, clear, el } from './core/dom.js';
import * as store from './core/store.js';
import { cloudRead, setSuppressPush } from './core/sync.js';
import { renderContent } from './core/text.js';
import { showToast } from './components/ui/toast.js';
import {
  initModal,
  openModal,
  closeModal,
} from './components/ui/modal.js';
import {
  initSettings,
  openSettings,
  saveSettings,
} from './components/settings/settings.js';
import { downloadBackup } from './components/settings/backup.js';

function init() {
  initModal();
  initSettings({
    onSaved: refreshCloud,
  });

  bindActions();

  store.load();
  render(store.getState());

  void boot();
}

function bindActions() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');

    if (!trigger) return;

    const action = trigger.dataset.action;

    if (action === 'open-settings') {
      openSettings();
      return;
    }

    if (action === 'save-settings') {
      saveSettings();
      return;
    }

    if (action === 'download-backup') {
      downloadBackup();
      return;
    }

    if (action === 'modal-close') {
      const modal = trigger.closest('.modal');

      if (modal?.id) {
        closeModal(modal.id);
      }
    }
  });
}

async function boot() {
  const token = store.getToken();

  if (!token) {
    if (!store.getInit()) {
      openModal(IDS.settingsModal);
    }

    return;
  }

  await refreshCloud(true);
}

async function refreshCloud(isBoot = false) {
  const token = store.getToken();

  if (!token) return;

  setSuppressPush(true);
  const result = await cloudRead();
  setSuppressPush(false);

  if (result.ok) {
    if (result.empty) {
      if (isBoot) {
        showToast('Облако пустое, показаны локальные данные', 'info');
      }

      return;
    }

    store.replaceState(result.data || store.emptyBoard());
    render(store.getState());

    if (isBoot) {
      showToast('Облачные данные загружены', 'success');
    }

    return;
  }

  if (result.status === 401) {
    showToast('Токен не подходит. Проверь доступ.', 'error');
    return;
  }

  if (result.reason !== 'no-token') {
    showToast('Не удалось загрузить облако.', 'error');
  }
}

function render(state) {
  const board = byId(IDS.board);

  clear(board);

  const zones = (state.zones || []).filter((zone) => !zone.hidden);

  if (!zones.length) {
    board.appendChild(el('p', 'empty', 'Разделы не найдены.'));
    return;
  }

  zones.forEach((zone) => {
    board.appendChild(renderZone(zone, state));
  });
}

function renderZone(zone, state) {
  const section = el('section', 'zone');

  section.dataset.zone = zone.key;
  section.dataset.tint = String(zone.tint ?? 0);

  const header = el('header', 'zone-header');
  const title = el('h2', 'zone-title');

  const emoji = el('span', 'zone-emoji', zone.emoji || '🗂️');
  const label = el('span', 'zone-label', zone.label || 'Раздел');

  const tasks = (state.tasks || []).filter(
    (task) => task.zone === zone.key && !task.archived && !task.deleted
  );

  const count = el('span', 'zone-count', String(tasks.length));

  title.append(emoji, label, count);
  header.appendChild(title);
  section.appendChild(header);

  const list = el('div', 'zone-tasks');

  const sorted = [...tasks].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned)
  );

  if (!sorted.length) {
    list.appendChild(el('p', 'empty', 'Задач пока нет.'));
  }

  sorted.forEach((task) => {
    list.appendChild(renderTask(task));
  });

  section.appendChild(list);

  return section;
}

function renderTask(task) {
  const card = el('article', 'task');

  if (task.done) {
    card.classList.add('is-done');
  }

  if (task.pinned) {
    card.classList.add('is-pinned');
  }

  const title = el('div', 'task-title', task.title || 'Без темы');
  card.appendChild(title);

  if (task.desc && String(task.desc).trim()) {
    const desc = el('div', 'task-desc');
    desc.innerHTML = renderContent(task.desc);
    card.appendChild(desc);
  }

  return card;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
