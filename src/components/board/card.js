/* board v3.0 stage-1 */

import { el, byId } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import * as store from '../../core/store.js';
import { todayISO, addDaysISO } from '../../core/dates.js';
import { renderContent } from '../../core/text.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { renderSubtasks } from './subtasks.js';

let currentDueTaskId = null;

export function renderTask(task) {
  const card = el('article', 'task');

  card.dataset.taskId = String(task.id);
  card.dataset.draggable = 'true';

  if (task.done) {
    card.classList.add('is-done');
  }

  if (task.pinned) {
    card.classList.add('is-pinned');
  }

  const header = el('div', 'task-header');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-done-check';
  checkbox.checked = !!task.done;
  checkbox.dataset.action = 'toggle-task-done';
  checkbox.dataset.taskId = String(task.id);

  const title = el('div', 'task-title', task.title || 'Без темы');
  title.title = task.title || 'Без темы';

  const actions = el('div', 'task-actions');

  actions.append(
    createPinButton(task),
    createDueButton(task),
    createArchiveButton(task)
  );

  header.append(checkbox, title, actions);
  card.appendChild(header);

  if (task.desc && String(task.desc).trim()) {
    const desc = el('div', 'task-desc');
    desc.dataset.collapseText = '';
    desc.dataset.collapseKind = 'desc';
    desc.dataset.collapseKey = `task-${task.id}`;
    desc.innerHTML = renderContent(task.desc);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'collapse-toggle';
    toggle.dataset.action = 'collapse-toggle';
    toggle.dataset.collapseKind = 'desc';
    toggle.dataset.collapseKey = `task-${task.id}`;
    toggle.dataset.collapseToggle = `desc:task-${task.id}`;
    toggle.textContent = 'развернуть ▾';
    toggle.hidden = true;

    card.append(desc, toggle);
  }

  card.appendChild(renderSubtasks(task));

  return card;
}

function createPinButton(task) {
  const button = el('button', 'task-pin', '📌');
  button.type = 'button';
  button.title = 'Закрепить сверху';
  button.dataset.action = 'toggle-pin';
  button.dataset.taskId = String(task.id);

  if (task.pinned) {
    button.classList.add('is-active');
  }

  return button;
}

function createArchiveButton(task) {
  const button = el('button', 'task-archive', '📦');
  button.type = 'button';
  button.title = 'В архив';
  button.dataset.action = 'archive-task';
  button.dataset.taskId = String(task.id);

  return button;
}

function createDueButton(task) {
  const button = el('button', 'due-chip');
  button.type = 'button';
  button.dataset.action = 'open-due';
  button.dataset.taskId = String(task.id);

  const info = getDueInfo(task);

  button.classList.add(info.className);
  button.textContent = info.label;

  return button;
}

function getDueInfo(task) {
  if (task.done) {
    return {
      className: 'due-done',
      label: 'выполнено',
    };
  }

  if (!task.due) {
    return {
      className: 'due-none',
      label: 'срок',
    };
  }

  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);

  if (task.due < today) {
    return {
      className: 'due-overdue',
      label: 'просрочено',
    };
  }

  if (task.due === today) {
    return {
      className: 'due-today',
      label: 'сегодня',
    };
  }

  if (task.due === tomorrow) {
    return {
      className: 'due-tomorrow',
      label: 'завтра',
    };
  }

  return {
    className: 'due-later',
    label: formatDue(task.due),
  };
}

function formatDue(iso) {
  const [, month, day] = String(iso).split('-');

  return `${day}.${month}`;
}

export function handleCardAction(action, target) {
  const taskId = Number(target.dataset.taskId);

  if (!taskId) return;

  if (action === 'toggle-task-done') {
    store.mutate((state) => {
      const task = state.tasks.find((item) => item.id === taskId);

      if (!task) return;

      task.done = !task.done;
      task.doneAt = task.done ? new Date().toISOString() : null;
    });

    return;
  }

  if (action === 'toggle-subtask-done') {
    const subtaskId = Number(target.dataset.subtaskId);

    store.mutate((state) => {
      const task = state.tasks.find((item) => item.id === taskId);

      if (!task) return;

      const subtask = task.subtasks.find((item) => item.id === subtaskId);

      if (!subtask) return;

      subtask.done = !subtask.done;
    });

    return;
  }

  if (action === 'toggle-pin') {
    store.mutate((state) => {
      const task = state.tasks.find((item) => item.id === taskId);

      if (!task) return;

      task.pinned = !task.pinned;
    });

    return;
  }

  if (action === 'archive-task') {
    store.mutate((state) => {
      const task = state.tasks.find((item) => item.id === taskId);

      if (!task) return;

      task.archived = true;
    });

    showToast('Задача перемещена в архив', 'success');
    return;
  }

  if (action === 'open-due') {
    openDue(taskId);
  }
}

function openDue(taskId) {
  const state = store.getState();
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) return;

  currentDueTaskId = taskId;

  const input = byId(IDS.dueDateInput);

  if (input) {
    input.value = task.due || '';
  }

  openModal(IDS.dueModal);
}

export function handleDueAction(action) {
  if (!currentDueTaskId) return;

  const input = byId(IDS.dueDateInput);

  if (action === 'due-save') {
    const value = input?.value || '';

    store.mutate((state) => {
      const task = state.tasks.find((item) => item.id === currentDueTaskId);

      if (!task) return;

      task.due = value || null;
    });

    closeModal(IDS.dueModal);
    showToast('Срок сохранён', 'success');
    return;
  }

  if (action === 'due-clear') {
    store.mutate((state) => {
      const task = state.tasks.find((item) => item.id === currentDueTaskId);

      if (!task) return;

      task.due = null;
    });

    closeModal(IDS.dueModal);
    showToast('Срок очищен', 'info');
  }
}
