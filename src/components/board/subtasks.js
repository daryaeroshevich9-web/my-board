/* board v3.0 stage-1 */

import { el } from '../../core/dom.js';
import { renderContent } from '../../core/text.js';

export function renderSubtasks(task) {
  const container = el('div', 'subtasks');

  if (!task.subtasks.length) {
    return container;
  }

  const done = task.subtasks.filter((subtask) => subtask.done).length;
  const total = task.subtasks.length;

  const counter = el('div', 'subtask-count', `${done}/${total}`);
  container.appendChild(counter);

  const listKey = `task-${task.id}`;
  const list = el('ul', 'subtask-list');
  list.dataset.sublist = listKey;

  task.subtasks.forEach((subtask) => {
    const item = el('li', 'subtask');
    item.dataset.sublistItem = listKey;
    item.dataset.subtaskId = String(subtask.id);

    const header = el('div', 'subtask-header');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!subtask.done;
    checkbox.dataset.action = 'toggle-subtask-done';
    checkbox.dataset.taskId = String(task.id);
    checkbox.dataset.subtaskId = String(subtask.id);

    const title = el('div', 'subtask-title', subtask.title || 'Без темы');
    title.title = subtask.title || 'Без темы';

    header.append(checkbox, title);
    item.appendChild(header);

    if (subtask.text && String(subtask.text).trim()) {
      const text = el('div', 'subtask-text');
      text.dataset.collapseText = '';
      text.dataset.collapseKind = 'subtext';
      text.dataset.collapseKey = `sub-${subtask.id}`;
      text.innerHTML = renderContent(subtask.text);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'collapse-toggle';
      toggle.dataset.action = 'collapse-toggle';
      toggle.dataset.collapseKind = 'subtext';
      toggle.dataset.collapseKey = `sub-${subtask.id}`;
      toggle.dataset.collapseToggle = `subtext:sub-${subtask.id}`;
      toggle.textContent = 'развернуть ▾';
      toggle.hidden = true;

      item.append(text, toggle);
    }

    list.appendChild(item);
  });

  container.appendChild(list);

  if (total > 5) {
    const listToggle = document.createElement('button');
    listToggle.type = 'button';
    listToggle.className = 'collapse-toggle';
    listToggle.dataset.action = 'collapse-toggle';
    listToggle.dataset.collapseKind = 'sublist';
    listToggle.dataset.collapseKey = listKey;
    listToggle.dataset.sublistToggle = listKey;
    listToggle.textContent = `развернуть (ещё ${total - 5}) ▾`;
    listToggle.hidden = true;

    container.appendChild(listToggle);
  }

  return container;
}
