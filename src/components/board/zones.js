/* board v3.0 stage-1 */

import { byId, clear, el } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
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

export function renderBoard(state) {
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
