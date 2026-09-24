const STORAGE_KEY = 'darya_board_tasks';
const PERSONAL_KEY = 'darya_personal_notes';
const DAYNOTES_KEY = 'darya_board_daynotes';
const DAYREPORTS_KEY = 'darya_board_dayreports';
const ZONES_KEY = 'darya_board_zones';
const TOKEN_KEY = 'darya_board_token';
const INIT_KEY = 'darya_board_init';
const PIN_KEY = 'darya_board_sbpinned';
const PAGE_KEY = 'darya_board_page';
const COMPACT_KEY = 'darya_board_compact';
const API_URL = 'https://api.github.com/repos/daryaeroshevich9-web/my-board/contents/board.json';
const TINT_COUNT = 6;
const TINT_HEX = ['#3A5F8A', '#B04A5E', '#A67C00', '#3E7A5E', '#6B4FA0', '#0E7490'];
const SUB_VISIBLE = 5;
const DEFAULT_ZONES = [
  {key:'other', label:'Прочее', emoji:'📋', hidden:false, tint:0, color:null},
  {key:'portal', label:'Портал 2.0', emoji:'🚪', hidden:false, tint:1, color:null},
  {key:'aviabit', label:'Авиабит', emoji:'🛩️', hidden:false, tint:2, color:null}
];
const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
const PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
const ELLIPSIS = '⋯';
let expandedText = new Set();
let expandedSubs = new Set();
let expandedSubText = new Set();
let currentReportDate = null;
let modalZ = 1000;
function showModal(el){ if(!el) return; modalZ++; el.style.zIndex = String(modalZ); el.classList.add('open'); }
function hideModal(el){ if(!el) return; el.classList.remove('open'); el.style.zIndex=''; if(modalZ>1000) modalZ--; }
function migrateZone(z){ return {key:z.key, label:z.label||z.key, emoji:z.emoji||'🗂️', hidden:!!z.hidden, tint:(typeof z.tint==='number'?z.tint:0), color:z.color||null}; }
function loadZones(){
  try{
    const raw = localStorage.getItem(ZONES_KEY);
    if(raw){ const z=JSON.parse(raw); if(Array.isArray(z)&&z.length) return z.map(migrateZone); }
  }catch(e){}
  return DEFAULT_ZONES.map(z=>Object.assign({},z));
}
function migrateSub(s){
  if (!s.id) s.id = Date.now() + Math.floor(Math.random()*10000);
  if (s.done === undefined) s.done = false;
  if (s.doneAt === undefined) s.doneAt = null;
  return s;
}
function migratePersonalNote(t){
  if (!t.id) t.id = Date.now() + Math.floor(Math.random()*10000);
  if (!t.created) t.created = new Date().toISOString();
  if (t.done === undefined) t.done = false;
  if (t.doneAt === undefined) t.doneAt = t.done ? new Date().toISOString() : null;
  if (!Array.isArray(t.subtasks)) t.subtasks = [];
  t.subtasks.forEach(migrateSub);
  return t;
}
function migrateDayNote(d){
  if (!d || !d.date) return null;
  return {date: d.date, text: String(d.text || ''), updated: d.updated || new Date().toISOString()};
}
function migrateDayReport(d){
  if (!d || !d.date) return null;
  return {date: d.date, text: String(d.text || ''), updated: d.updated || new Date().toISOString()};
}
let zones = loadZones();
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let personal = (JSON.parse(localStorage.getItem(PERSONAL_KEY) || '[]')).map(migratePersonalNote);
let dayNotes = (JSON.parse(localStorage.getItem(DAYNOTES_KEY) || '[]')).map(migrateDayNote).filter(Boolean);
let dayReports = (JSON.parse(localStorage.getItem(DAYREPORTS_KEY) || '[]')).map(migrateDayReport).filter(Boolean);
tasks.forEach(migrateTask);
let currentAddZone = null, currentNoteId = null;
let cloudSha = null, suppressPush = true, pushTimer = null;
let pendingQuickLines = [];
let currentPage = localStorage.getItem(PAGE_KEY) || 'board';
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let currentDayDate = null;
let dayInitial = '';
let dayReportInitialPlain = '';
let editMode = null;
let editInitialPlain = '';
let subsMode = null;
function migrateTask(t) {
  if (t.deleted) t.archived = true;
  t.deleted = false;
  if (!Array.isArray(t.subtasks)) t.subtasks = [];
  t.subtasks.forEach(migrateSub);
  if (!Array.isArray(t.tags)) t.tags = [];
  t.subOpen = false;
  if (t.doneAt === undefined) t.doneAt = t.done ? new Date().toISOString() : null;
  if (t.archived === undefined) t.archived = false;
  if (t.due === undefined) t.due = null;
  if (t.pinned === undefined) t.pinned = false;
  if (!t.created) t.created = new Date().toISOString();
  return t;
}
function capFirst(s){
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shortText(s, n){
  const t = String(s || '').replace(/<[^>]+>/g,' ');
  return t.length > (n || 40) ? t.slice(0, (n || 40)) + '…' : t;
}
function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function zoneByKey(key){ return zones.find(z=>z.key===key); }
function tintIndex(z){ return (z.tint||0) % TINT_COUNT; }
function labelFor(key){ const z=zoneByKey(key); return z? z.label : key; }
function b64e(str) { const b = new TextEncoder().encode(str); let s = ''; b.forEach(x => s += String.fromCharCode(x)); return btoa(s); }
function b64d(str) { const bin = atob(str.replace(/\n/g, '')); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
function hexA(hex, a){
  let h = String(hex||'').replace('#','');
  if (h.length === 3) h = h.split('').map(x=>x+x).join('');
  if (h.length !== 6) return 'rgba(127,127,127,' + a + ')';
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return '
