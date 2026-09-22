/* board v3.0 stage-1-fix */

import { IDS } from './core/ids.js';
import { byId } from './core/dom.js';
import * as store from './core/store.js';
import { cloudRead, cloudWrite } from './core/sync.js';
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
import {
  initBackup,
  downloadBackup,
  triggerBackupUpload,
} from './components/settings/backup.js';
import { handleConfirmAction } from './components/ui/confirm.js';
import {
  handleCollapseToggle,
  applyCollapse,
} from './components/ui/collapse.js';
import { renderSummary, renderBoard } from './components/board/zones.js';
import { handleCardAction, handleDueAction } from './components/board/card.js';
import { initDnd } from './components/board/dnd.js';
import {
  initQuickAdd,
  handleQuickAddAction,
} from './components/board/quickadd.js';
import {
  initArchive,
  handleArchiveAction,
  autoArchiveOldDone,
} from './components/board/archive.js';
import {
  initZonesManager,
  handleZonesAction,
} from './components/board/zones-manager.js';

let applyingRemote = false;
let booted = false;
let pushTimer = null;
let boardQuery = '';

function init() {
  initModal();

  initSettings({
    onSaved: () => {
      void boot();
    },
  });

  initBackup();
  initQuickAdd();
  initZonesManager();
  initArchive();
  initSidebarPin();
  bindSearch();
  bindActions();

  store.load();
  render(store.getState());

  initDnd(byId(IDS.board), moveTask);

  store.subscribe(onStateChange);

  void boot();
}

function bindSearch() {
  const search = byId(IDS.boardSearch);

  if (!search) return;

  search.addEventListener('input', () => {
    boardQuery = search.value.trim().toLowerCase();
    render(store.getState());
  });
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

    if (action === 'upload-backup') {
      triggerBackupUpload();
      return;
    }

    if (action === 'toggle-sidebar-pin') {
      toggleSidebarPin();
      return;
    }

    if (action === 'modal-close') {
      const modal = trigger.closest('.modal');

      if (modal?.id) {
        closeModal(modal.id);
      }

      return;
    }

    if (action === 'collapse-toggle') {
      handleCollapseToggle(trigger);
      return;
    }

    if (
      [
        'toggle-task-done',
        'toggle-subtask-done',
        'toggle-pin',
        'archive-task',
        'open-due',
      ].includes(action)
    ) {
      handleCardAction(action, trigger);
      return;
    }

    if (['due-save', 'due-clear'].includes(action)) {
      handleDueAction(action);
      return;
    }

    if (['quick-add-submit', 'quick-zone-select'].includes(action)) {
      handleQuickAddAction(action, trigger);
      return;
    }

    if (['open-zones', 'create-zone', 'set-zone-tint'].includes(action)) {
      handleZonesAction(action, trigger);
      return;
    }

    if (
      [
        'open-archive',
        'sweep-done',
        'restore-archived',
        'purge-archived',
      ].includes(action)
    ) {
      handleArchiveAction(action, trigger);
      return;
    }

    if (['confirm-ok', 'confirm-cancel'].includes(action)) {
      handleConfirmAction(action);
    }
  });
}

function initSidebarPin() {
  const sidebar = byId(IDS.sidebar);
  const button = byId(IDS.sidebarPin);

  if (!sidebar) return;

  const pinned = localStorage.getItem('darya_board_sbpinned') === '1';

  sidebar.classList.toggle('sidebar-pinned', pinned);

  if (button) {
    button.classList.toggle('is-active', pinned);
  }
}

function toggleSidebarPin() {
  const sidebar = byId(IDS.sidebar);
  const button = byId(IDS.sidebarPin);

  if (!sidebar) return;

  const pinned = !sidebar.classList.contains('sidebar-pinned');

  sidebar.classList.toggle('sidebar-pinned', pinned);

  if (button) {
    button.classList.toggle('is-active', pinned);
  }

  localStorage.setItem('darya_board_sbpinned', pinned ? '1' : '0');
}

function onStateChange(state) {
  render(state);
  schedulePush();
}

function render(state) {
  renderSummary(state);
  renderBoard(state, boardQuery);

  requestAnimationFrame(() => {
    applyCollapse(document);
  });
}

function moveTask(taskId, zoneKey, index) {
  if (!zoneKey) {
    render(store.getState());
    return;
  }

  store.mutate((state) => {
    const fromIndex = state.tasks.findIndex((task) => task.id === taskId);

    if (fromIndex === -1) return;

    const task = state.tasks[fromIndex];

    state.tasks.splice(fromIndex, 1);
    task.zone = zoneKey;

    const zoneTasks = state.tasks.filter((item) => item.zone === zoneKey);
    const insertBeforeTask = zoneTasks[index];

    if (!insertBeforeTask) {
      let lastIndex = -1;

      for (let i = state.tasks.length - 1; i >= 0; i -= 1) {
        if (state.tasks[i].zone === zoneKey) {
          lastIndex = i;
          break;
        }
      }

      state.tasks.splice(lastIndex + 1, 0, task);
      return;
    }

    const globalIndex = state.tasks.findIndex(
      (item) => item.id === insertBeforeTask.id
    );

    state.tasks.splice(globalIndex, 0, task);
  });
}

async function boot() {
  const token = store.getToken();

  if (!token) {
    if (!store.getInit()) {
      openModal(IDS.settingsModal);
    }

    booted = true;
    autoArchiveOldDone();
    render(store.getState());

    return;
  }

  applyingRemote = true;
  const result = await cloudRead();
  applyingRemote = false;

  if (result.ok) {
    if (!result.empty) {
      applyingRemote = true;
      store.replaceState(result.data || store.emptyBoard());
      applyingRemote = false;
    }
  } else if (result.status === 401) {
    showToast('Токен не подходит. Проверь доступ.', 'error');
  } else if (result.reason !== 'no-token') {
    showToast('Не удалось загрузить облако.', 'error');
  }

  booted = true;

  const changed = autoArchiveOldDone();

  if (changed) {
    schedulePush();
  }

  render(store.getState());
}

function schedulePush() {
  if (!booted || applyingRemote) return;
  if (!store.getToken()) return;

  clearTimeout(pushTimer);

  pushTimer = setTimeout(async () => {
    const result = await cloudWrite(store.getState());

    if (!result.ok) {
      showToast('Не удалось синхронизировать с облаком', 'error');
    }
  }, 800);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
