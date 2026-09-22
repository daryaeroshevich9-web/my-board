/* board v3.0 stage-1 */

import { byId, clear, el } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import * as store from '../../core/store.js';
import { htmlToPlain } from '../../core/text.js';
import { openModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { openConfirm } from '../ui/confirm.js';

export function initArchive() {
  const search = byId(IDS.archiveSearch);

  if (search) {
    search.addEventListener('input', () => {
      renderArchiveList();
    });
  }
}

export function openArchive() {
  renderArchiveList();
  openModal(IDS.archiveModal);
}

export function handleArchiveAction(action, target) {
  if (action === 'open-archive') {
    openArchive();
    return;
  }

  if (action === 'sweep-done') {
    sweepDone();
    return;
  }

  if (action === 'restore-archived') {
    restoreTask(Number(target.dataset.taskId));
    return;
  }

  if (action === 'purge-archived') {
    purgeTask(Number(target.dataset.taskId));
  }
}

export function autoArchiveOldDone() {
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;

  const current = store.getState();

  const ids = current.tasks
    .filter((task) => {
      if (!task.done || task.archived || !task.doneAt) {
        return false;
      }

      const doneAt = Date.parse(task.doneAt);

      return Number.isFinite(doneAt) && doneAt <= cutoff;
    })
    .map((task) => task.id);

  if (!ids.length) {
    return false;
  }

  store.mutate((state) => {
    state.tasks.forEach((task) => {
      if (ids.includes(task.id)) {
        task.archived = true;
      }
    });
  });

  return true;
}

function sweepDone() {
  const current = store.getState();

  const ids = current.tasks
    .filter((task) => task.done && !task.archived)
    .map((task) => task.id);

  if (!ids.length) {
    showToast('Нет выполненных задач для переноса в архив', 'info');
    return;
  }

  openConfirm({
    message: 'Переместить все выполненные задачи в архив?',
    confirmText: 'Переместить',
  }).then((confirmed) => {
    if (!confirmed) return;

    store.mutate((state) => {
      state.tasks.forEach((task) => {
        if (ids.includes(task.id)) {
          task.archived = true;
        }
      });
    });

    showToast(`В архив перемещено: ${ids.length}`, 'success');
    renderArchiveIfOpen();
  });
}

function restoreTask(taskId) {
  if (!taskId) return;

  store.mutate((state) => {
    const task = state.tasks.find((item) => item.id === taskId);

    if (!task) return;

    task.archived = false;
  });

  showToast('Задача возвращена из архива', 'success');
  renderArchiveIfOpen();
}

function purgeTask(taskId) {
  if (!taskId) return;

  openConfirm({
    message: 'Удалить задачу навсегда? Действие необратимо.',
    confirmText: 'Удалить',
    danger: true,
  }).then((confirmed) => {
    if (!confirmed) return;

    store.mutate((state) => {
      state.tasks = state.tasks.filter((task) => task.id !== taskId);
    });

    showToast('Задача удалена навсегда', 'success');
    renderArchiveIfOpen();
  });
}

function renderArchiveIfOpen() {
  const modal = byId(IDS.archiveModal);

  if (modal && !modal.hidden) {
    renderArchiveList();
  }
}

function renderArchiveList() {
  const list = byId(IDS.archiveList);
  const search = byId(IDS.archiveSearch);

  if (!list) return;

  clear(list);

  const query = String(search?.value || '')
    .toLowerCase()
    .trim();

  const tasks = store
    .getState()
    .tasks.filter((task) => task.archived && !task.deleted);

  const filtered = tasks.filter((task) => {
    if (!query) return true;

    const haystack = [
      task.title,
      htmlToPlain(task.desc),
      ...task.subtasks.map(
        (subtask) => `${subtask.title} ${htmlToPlain(subtask.text)}`
      ),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  if (!filtered.length) {
    list.appendChild(el('p', 'empty', 'В архиве пусто.'));
    return;
  }

  filtered.forEach((task) => {
    const row = el('div', 'archive-row');

    const title = el('div', 'archive-title', task.title || 'Без темы');
    title.title = task.title || 'Без темы';

    const actions = el('div', 'archive-actions');

    const restore = el('button', 'btn', 'Вернуть');
    restore.type = 'button';
    restore.dataset.action = 'restore-archived';
    restore.dataset.taskId = String(task.id);

    const purge = el('button', 'btn btn-danger', 'Удалить');
    purge.type = 'button';
    purge.dataset.action = 'purge-archived';
    purge.dataset.taskId = String(task.id);

    actions.append(restore, purge);
    row.append(title, actions);

    list.appendChild(row);
  });
}
