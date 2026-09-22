/* board v3.0 stage-1-fix */

import { byId, clear, el } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import { htmlToPlain } from '../../core/text.js';
import { renderTask } from './card.js';

export function renderSummary(state) {
  const summary = byId(IDS.boardSummary);

  if (!summary) return;

  const tasks = (state.tasks || []).filter(
    (task) => !task.archived && !task.deleted
  );

  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;

  summary.textContent = `Всего ${total} / В работе ${total - done} / Выполнено ${done}`;
}

export function renderBoard(state, query = '') {
  const board = byId(IDS.board);

  clear(board);

  const zones = (state.zones || []).filter((zone) => !zone.hidden);
  const normalizedQuery = String(query || '')
    .toLowerCase()
    .trim();

  if (!zones.length) {
    board.appendChild(el('p', 'empty', 'Разделы не найдены.'));
    return;
  }

  zones.forEach((zone) => {
    board.appendChild(renderZone(zone, state, normalizedQuery));
  });
}

function renderZone(zone, state, query) {
  const section = el('section', 'zone');

  section.dataset.zone = zone.key;

  if (zone.color && /^#[0-9a-f]{6}$/i.test(zone.color)) {
    section.dataset.tint = '';
    section.style.borderColor = zone.color;
    section.style.boxShadow = `inset 3px 0 0 0 ${zone.color}`;
  } else {
    section.dataset.tint = String(zone.tint ?? 0);
  }

  const header = el('header', 'zone-header');
  const title = el('h2', 'zone-title');

  const emoji = el('span', 'zone-emoji', zone.emoji || '🗂️');
  const label = el('span', 'zone-label', zone.label || 'Раздел');

  const tasks = (state.tasks || []).filter(
    (task) =>
      task.zone === zone.key &&
      !task.archived &&
      !task.deleted &&
      matchesQuery(task, query)
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
    list.appendChild(
      el('p', 'empty', query ? 'Ничего не найдено.' : 'Задач пока нет.')
    );
  }

  sorted.forEach((task) => {
    list.appendChild(renderTask(task));
  });

  section.appendChild(list);

  return section;
}

function matchesQuery(task, query) {
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
}
