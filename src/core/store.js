/* board v3.0 stage-0 */

const STORAGE_KEYS = {
  tasks: 'darya_board_tasks',
  personal: 'darya_personal_notes',
  daynotes: 'darya_board_daynotes',
  dayreports: 'darya_board_dayreports',
  zones: 'darya_board_zones',
};

const TOKEN_KEY = 'darya_board_token';
const INIT_KEY = 'darya_board_init';

let state = emptyBoard();
let listeners = [];

export function emptyBoard() {
  return {
    tasks: [],
    zones: [],
    personal: [],
    daynotes: [],
    dayreports: [],
  };
}

export function isBoardEmpty(data) {
  if (!data) return true;

  return !(
    (Array.isArray(data.tasks) && data.tasks.length) ||
    (Array.isArray(data.zones) && data.zones.length) ||
    (Array.isArray(data.personal) && data.personal.length) ||
    (Array.isArray(data.daynotes) && data.daynotes.length) ||
    (Array.isArray(data.dayreports) && data.dayreports.length)
  );
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(value) {
  if (value) {
    localStorage.setItem(TOKEN_KEY, value);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getInit() {
  return localStorage.getItem(INIT_KEY) === '1';
}

export function setInit() {
  localStorage.setItem(INIT_KEY, '1');
}

function safeParseArray(raw, fallback = []) {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function defaultZones() {
  return [
    {
      key: 'other',
      label: 'Прочее',
      emoji: '🗂️',
      hidden: false,
      tint: 0,
      color: null,
    },
    {
      key: 'portal2',
      label: 'Портал 2.0',
      emoji: '🧭',
      hidden: false,
      tint: 1,
      color: null,
    },
    {
      key: 'aviabit',
      label: 'Авиабит',
      emoji: '✈️',
      hidden: false,
      tint: 2,
      color: null,
    },
  ];
}

function migrateSubtask(subtask) {
  const copy = { ...(subtask || {}) };

  if (typeof copy.title !== 'string') {
    const raw = copy.text ?? '';
    const lines = String(raw).split(/\r?\n/);

    copy.title = lines[0]?.trim() ?? '';
    copy.text = lines.length > 1 ? lines.slice(1).join('\n') : '';
  } else {
    copy.text = copy.text ?? '';
  }

  return copy;
}

function ensureSubtask(subtask) {
  const base = migrateSubtask(subtask);

  return {
    id: Number(base.id) || makeId(),
    title: String(base.title || '').trim() || 'Без темы',
    text: String(base.text || ''),
    done: !!base.done,
  };
}

function migrateTask(task) {
  const copy = { ...(task || {}) };

  if (typeof copy.title !== 'string') {
    const raw = copy.text ?? '';
    const lines = String(raw).split(/\r?\n/);

    copy.title = lines[0]?.trim() ?? '';
    copy.desc = lines.length > 1 ? lines.slice(1).join('\n') : '';
  } else {
    copy.desc = copy.desc ?? '';
  }

  delete copy.text;
  copy.subtasks = Array.isArray(copy.subtasks) ? copy.subtasks : [];

  return copy;
}

function ensureTask(task) {
  const base = migrateTask(task);

  return {
    id: Number(base.id) || makeId(),
    zone: base.zone || 'other',
    title: String(base.title || '').trim() || 'Без темы',
    desc: String(base.desc ?? ''),
    done: !!base.done,
    created: base.created || new Date().toISOString(),
    doneAt: base.doneAt || null,
    archived: !!base.archived,
    deleted: false,
    due: base.due || null,
    tags: Array.isArray(base.tags) ? base.tags.map(String) : [],
    pinned: !!base.pinned,
    subtasks: base.subtasks.map(ensureSubtask),
    subOpen: !!base.subOpen,
  };
}

function ensureZone(zone, index = 0) {
  const base = zone || {};

  return {
    key: String(base.key || `z_${Date.now()}_${index}`),
    label: String(base.label || 'Раздел'),
    emoji: base.emoji ?? '🗂️',
    hidden: !!base.hidden,
    tint: Number.isInteger(base.tint) ? base.tint : index % 6,
    color: base.color ?? null,
  };
}

function ensureZones(zones) {
  let list = Array.isArray(zones) ? zones.map(ensureZone) : [];

  if (!list.length) {
    list = defaultZones();
  }

  const seen = new Set();

  list = list.filter((zone) => {
    if (seen.has(zone.key)) return false;
    seen.add(zone.key);
    return true;
  });

  return list;
}

function ensurePersonal(note) {
  const base = note || {};

  return {
    id: Number(base.id) || makeId(),
    text: String(base.text ?? ''),
    created: base.created || new Date().toISOString(),
    done: !!base.done,
    doneAt: base.doneAt || null,
    subtasks: Array.isArray(base.subtasks) ? base.subtasks.map(ensureSubtask) : [],
  };
}

function ensureDaynote(note) {
  const base = note || {};

  return {
    date: String(base.date || ''),
    text: String(base.text || ''),
    updated: base.updated || new Date().toISOString(),
  };
}

function ensureDayreport(report) {
  const base = report || {};

  return {
    date: String(base.date || ''),
    text: String(base.text || ''),
    updated: base.updated || new Date().toISOString(),
  };
}

function normalizeState(raw) {
  const source = raw || emptyBoard();
  const zones = ensureZones(source.zones);
  const zoneKeys = new Set(zones.map((zone) => zone.key));

  let tasks = Array.isArray(source.tasks) ? source.tasks.map(ensureTask) : [];

  tasks = tasks.map((task) => {
    if (zoneKeys.has(task.zone)) {
      return task;
    }

    return {
      ...task,
      zone: zones[0]?.key || 'other',
    };
  });

  const personal = Array.isArray(source.personal)
    ? source.personal.map(ensurePersonal)
    : [];

  const daynotes = Array.isArray(source.daynotes)
    ? source.daynotes.map(ensureDaynote).filter((note) => note.date)
    : [];

  const dayreports = Array.isArray(source.dayreports)
    ? source.dayreports.map(ensureDayreport).filter((report) => report.date)
    : [];

  return {
    tasks,
    zones,
    personal,
    daynotes,
    dayreports,
  };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_KEYS.zones, JSON.stringify(state.zones));
    localStorage.setItem(STORAGE_KEYS.personal, JSON.stringify(state.personal));
    localStorage.setItem(STORAGE_KEYS.daynotes, JSON.stringify(state.daynotes));
    localStorage.setItem(STORAGE_KEYS.dayreports, JSON.stringify(state.dayreports));
  } catch {
    // localStorage может быть недоступен или переполнен; на Этапе 0 достаточно не ронять приложение.
  }
}

function notify() {
  const snapshot = getState();

  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

export function load() {
  const raw = {
    tasks: safeParseArray(localStorage.getItem(STORAGE_KEYS.tasks), []),
    zones: safeParseArray(localStorage.getItem(STORAGE_KEYS.zones), []),
    personal: safeParseArray(localStorage.getItem(STORAGE_KEYS.personal), []),
    daynotes: safeParseArray(localStorage.getItem(STORAGE_KEYS.daynotes), []),
    dayreports: safeParseArray(localStorage.getItem(STORAGE_KEYS.dayreports), []),
  };

  state = normalizeState(raw);
  persist();
}

export function getState() {
  return clone(state);
}

export function replaceState(nextState) {
  state = normalizeState(nextState || emptyBoard());
  persist();
  notify();
}

export function mutate(mutator, options = {}) {
  mutator(state);
  state = normalizeState(state);

  if (options.persist !== false) {
    persist();
  }

  notify();
}

export function subscribe(listener) {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}
