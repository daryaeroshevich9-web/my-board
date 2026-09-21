const STORAGE_KEY = 'darya_board_tasks';
const PERSONAL_KEY = 'darya_personal_notes';
const DAYNOTES_KEY = 'darya_board_daynotes';
const DAYREPORTS_KEY = 'darya_board_dayreports';
const ZONES_KEY = 'darya_board_zones';
const TOKEN_KEY = 'darya_board_token';
const INIT_KEY = 'darya_board_init';
const PIN_KEY = 'darya_board_sbpinned';
const PAGE_KEY = 'darya_board_page';
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
let editingReportDate = null;
function migrateZone(z){ return {key:z.key, label:z.label||z.key, emoji:z.emoji||'🗂️', hidden:!!z.hidden, tint:(typeof z.tint==='number'?z.tint:0), color:z.color||null}; }
function loadZones(){
  try{
    const raw = localStorage.getItem(ZONES_KEY);
    if(raw){ const z=JSON.parse(raw); if(Array.isArray(z)&&z.length) return z.map(migrateZone); }
  }catch(e){}
  return DEFAULT_ZONES.map(z=>Object.assign({},z));
}
function migratePersonalNote(t){
  if (!t.id) t.id = Date.now() + Math.floor(Math.random()*10000);
  if (!t.created) t.created = new Date().toISOString();
  if (t.done === undefined) t.done = false;
  if (t.doneAt === undefined) t.doneAt = t.done ? new Date().toISOString() : null;
  if (!Array.isArray(t.subtasks)) t.subtasks = [];
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
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
function zoneStyle(z){
  if (z.color) return '--zone-color:' + z.color + ';--z-bg:' + hexA(z.color,.22) + ';--z-bd:' + hexA(z.color,.5);
  const n = tintIndex(z);
  return '--zone-color:var(--tint-c-' + n + ');--z-bg:var(--tint-bg-' + n + ');--z-bd:var(--tint-bd-' + n + ')';
}
function zoneTagStyle(z){
  if (z.color) return 'background:' + hexA(z.color,.22) + ';border-color:' + hexA(z.color,.5) + ';color:' + z.color;
  const n = tintIndex(z);
  return 'background:var(--tint-bg-' + n + ');border-color:var(--tint-bd-' + n + ');color:var(--tint-c-' + n + ')';
}
function isoOf(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function todayISO(){ return isoOf(new Date()); }
function parseLocal(s){ const p = s.split('-'); return new Date(Number(p[0]), Number(p[1])-1, Number(p[2])); }
function fmtDate(s){ return s.slice(8,10) + '.' + s.slice(5,7); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function dueState(t){
  if (!t.due) return null;
  if (t.done) return 'done';
  const today = parseLocal(todayISO());
  const d = parseLocal(t.due);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return 'over';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'later';
}
const WEEKDAYS = {'понедельник':1,'вторник':2,'среда':3,'четверг':4,'пятница':5,'суббота':6,'воскресенье':0};
function parseMagic(raw){
  let text = String(raw||'');
  let due = null;
  const today = parseLocal(todayISO());
  if (/\bпослезавтра\b/i.test(text)) { due = isoOf(addDays(today,2)); text = text.replace(/послезавтра/ig,' '); }
  else if (/\bзавтра\b/i.test(text)) { due = isoOf(addDays(today,1)); text = text.replace(/завтра/ig,' '); }
  else if (/\bсегодня\b/i.test(text)) { due = isoOf(today); text = text.replace(/сегодня/ig,' '); }
  if (!due) {
    const wdRe = /\b(?:в|во)\s+(понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)\b/i;
    const m = text.match(wdRe);
    if (m) {
      const target = WEEKDAYS[m[1].toLowerCase()];
      const cur = today.getDay();
      const diff = (target - cur + 7) % 7;
      due = isoOf(addDays(today, diff));
      text = text.replace(wdRe, ' ');
    }
  }
  if (!due) {
    const dm = text.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
    if (dm) {
      const day = +dm[1], mon = +dm[2];
      let year = dm[3] ? +dm[3] : today.getFullYear();
      if (year < 100) year += 2000;
      let d = new Date(year, mon-1, day);
      if (!dm[3] && d < today) d = new Date(year+1, mon-1, day);
      due = isoOf(d);
      text = text.replace(/\b\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\b/, ' ');
    }
  }
  text = text.replace(/\s{2,}/g,' ').trim();
  return {text: text, due: due};
}
// --- HTML: детекция, санитизация, рендер, конвертация в текст ---
function isHtmlText(t){
  return /<\/?(p|ul|ol|li|table|thead|tbody|tr|td|th|div|br|b|strong|i|em|u|s|h[1-6]|blockquote|pre|hr|span|a)\b/i.test(String(t||''));
}
const ALLOWED_TAGS = {P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,S:1,UL:1,OL:1,LI:1,BLOCKQUOTE:1,PRE:1,CODE:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,TABLE:1,THEAD:1,TBODY:1,TFOOT:1,TR:1,TD:1,TH:1,A:1,SPAN:1,DIV:1,HR:1};
const ALLOWED_ATTRS = {A:{href:1,target:1,rel:1},TD:{colspan:1,rowspan:1},TH:{colspan:1,rowspan:1},SPAN:{style:1},DIV:{style:1}};
const KILL_TAGS = {SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,LINK:1,META:1,TITLE:1,FORM:1,INPUT:1,BUTTON:1};
function cleanStyle(v){
  const s = String(v||'');
  if (/expression|javascript:|url\s*\(/i.test(s)) return '';
  return s;
}
function cleanHref(v){
  const s = String(v||'').trim();
  if (/^(https?:|mailto:|#|\/)/i.test(s)) return s;
  return '#';
}
function sanitizeNode(node){
  const kids = Array.from(node.childNodes);
  for (const child of kids) {
    if (child.nodeType === 1) {
      const tag = child.tagName;
      if (KILL_TAGS[tag]) { child.remove(); continue; }
      if (!ALLOWED_TAGS[tag]) {
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      const allowed = ALLOWED_ATTRS[tag] || {};
      for (const attr of Array.from(child.attributes)) {
        const n = attr.name.toLowerCase();
        if (n.startsWith('on') || !allowed[n]) { child.removeAttribute(attr.name); continue; }
        if (n === 'href') child.setAttribute('href', cleanHref(attr.value));
        if (n === 'style') { const c = cleanStyle(attr.value); if (c) child.setAttribute('style', c); else child.removeAttribute('style'); }
      }
      if (tag === 'A') { child.setAttribute('rel','noopener'); }
      sanitizeNode(child);
    }
  }
}
function sanitizeHtml(html){
  try {
    const doc = new DOMParser().parseFromString(String(html||''), 'text/html');
    sanitizeNode(doc.body);
    return doc.body.innerHTML;
  } catch(e) { return escapeHtml(String(html||'')); }
}
function inlinePlain(node){
  let out = '';
  node.childNodes.forEach(ch => {
    if (ch.nodeType === 3) out += ch.textContent;
    else if (ch.nodeType === 1) {
      if (ch.tagName === 'BR') out += '\n';
      else out += inlinePlain(ch);
    }
  });
  return out;
}
function htmlToPlain(html){
  if (!isHtmlText(html)) return String(html||'');
  try {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const lines = [];
    const walk = (node) => {
      node.childNodes.forEach(ch => {
        if (ch.nodeType === 3) { const t = ch.textContent.trim(); if (t) lines.push(t); return; }
        if (ch.nodeType !== 1) return;
        const tag = ch.tagName;
        if (tag === 'LI') lines.push('- ' + inlinePlain(ch).trim());
        else if (tag === 'TR') lines.push(Array.from(ch.querySelectorAll('td,th')).map(c => inlinePlain(c).trim()).join(' | '));
        else if (tag === 'P' || tag === 'DIV' || tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6' || tag === 'BLOCKQUOTE') { const t = inlinePlain(ch).trim(); if (t) lines.push(t); }
        else if (tag === 'PRE') lines.push(ch.textContent);
        else if (tag === 'BR') lines.push('');
        else walk(ch);
      });
    };
    walk(doc.body);
    return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  } catch(e) { return String(html||''); }
}
function renderRich(raw){
  const lines = String(raw == null ? '' : raw).split('\n');
  let html = '';
  let listType = null;
  const closeList = () => { if (listType) { html += '</' + listType + '>'; listType = null; } };
  const inline = s => escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ul = line.match(/^\s*[-•*]\s+(.*)$/);
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ul) { if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; } html += '<li>' + inline(ul[1]) + '</li>'; continue; }
    if (ol) { if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; } html += '<li>' + inline(ol[2]) + '</li>'; continue; }
    closeList();
    html += '<div class="rich-line">' + inline(line) + '</div>';
  }
  closeList();
  return html;
}
function renderContent(text){
  return isHtmlText(text) ? sanitizeHtml(text) : renderRich(text);
}
// --- Редактор: Summernote (таблицы, списки, отступы) + textarea-фолбэк для офлайна ---
const SN_TOOLBAR = [
  ['undo',['undo','redo']],
  ['style',['style']],
  ['font',['bold','italic','underline','strike','clear']],
  ['color',['color']],
  ['para',['ul','ol','indent','outdent']],
  ['table',['table']],
  ['insert',['link','hr']],
  ['view',['codeview']]
];
function snAvailable(){ return !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.summernote); }
const FALLBACK_TABLE = '<table><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>';
function indentLines(ta, dir){
  const s = ta.selectionStart || 0, e = ta.selectionEnd || 0, v = ta.value;
  const ls = v.lastIndexOf('\n', s - 1) + 1;
  let le = v.indexOf('\n', e); if (le === -1) le = v.length;
  const block = v.slice(ls, le).split('\n').map(l => dir > 0 ? '  ' + l : l.replace(/^ {1,2}/, '')).join('\n');
  ta.value = v.slice(0, ls) + block + v.slice(le);
  ta.focus();
  ta.selectionStart = ls; ta.selectionEnd = ls + block.length;
  autoGrow(ta);
}
function makeEditor(hostId){
  const host = document.getElementById(hostId);
  let snEl = null, ta = null;
  return {
    init(content, asHtml){
      this.destroy();
      if (!host) return;
      const html = asHtml ? sanitizeHtml(content||'') : (content ? renderRich(content) : '');
      if (snAvailable()) {
        try {
          snEl = window.jQuery('<div></div>');
          window.jQuery(host).append(snEl);
          snEl.summernote({lang:'ru-RU', placeholder:'Текст…', toolbar:SN_TOOLBAR, disableDragAndDrop:true, height:220});
          snEl.summernote('code', html || '');
          return;
        } catch(e) {
          snEl = null;
          host.innerHTML = '';
        }
      }
      const tb = document.createElement('div');
      tb.className = 'fmt-toolbar';
      tb.innerHTML = '<button class="fmt-btn" data-f="b" title="Жирный">Ж</button>' +
        '<button class="fmt-btn i" data-f="i" title="Курсив">К</button>' +
        '<button class="fmt-btn" data-f="l" title="Список">•</button>' +
        '<button class="fmt-btn" data-f="ind" title="Отступ">⇥</button>' +
        '<button class="fmt-btn" data-f="outd" title="Убрать отступ">⇤</button>' +
        '<button class="fmt-btn" data-f="table" title="Таблица 2×2">⊞</button>';
      ta = document.createElement('textarea');
      ta.className = 'ed-fallback';
      ta.value = asHtml ? htmlToPlain(content||'') : (content||'');
      host.appendChild(tb);
      host.appendChild(ta);
      tb.querySelectorAll('.fmt-btn').forEach(btn => {
        btn.addEventListener('mousedown', ev => ev.preventDefault());
        btn.addEventListener('click', () => {
          const f = btn.dataset.f;
          if (f === 'ind') indentLines(ta, 1);
          else if (f === 'outd') indentLines(ta, -1);
          else if (f === 'table') {
            const s = ta.selectionStart || ta.value.length;
            ta.value = ta.value.slice(0, s) + (s ? '\n' : '') + FALLBACK_TABLE + ta.value.slice(ta.selectionEnd || s);
            ta.focus();
          }
          else fmtApply(ta, f);
          autoGrow(ta);
        });
      });
      autoGrow(ta);
    },
    get(){
      if (snEl) return sanitizeHtml(snEl.summernote('code'));
      return ta ? ta.value : '';
    },
    plain(){ return htmlToPlain(this.get()).trim(); },
    appendText(chunk){
      if (!chunk) return;
      if (snEl) {
        let c = snEl.summernote('code');
        c = c.replace(/<p><br\s*\/?><\/p>\s*$/,'');
        c += '<p>' + escapeHtml(chunk).replace(/\n/g,'<br>') + '</p>';
        snEl.summernote('code', c);
      } else if (ta) {
        ta.value += (ta.value && !/\n$/.test(ta.value) ? '\n' : '') + chunk;
        autoGrow(ta);
      }
    },
    focus(){
      if (snEl) { try { snEl.summernote('focus'); } catch(e){} }
      else if (ta) ta.focus();
    },
    destroy(){
      if (snEl) { try { snEl.summernote('destroy'); } catch(e){} snEl = null; }
      if (host) host.innerHTML = '';
      ta = null;
    }
  };
}
const addEditor = makeEditor('addEditor');
const editEditor = makeEditor('editEditor');
const repEditor = makeEditor('dayReportEditor');
function autoGrow(ta){
  if (!ta || ta.tagName !== 'TEXTAREA') return;
  ta.style.height = 'auto';
  const max = parseFloat(getComputedStyle(ta).maxHeight);
  const h = Math.min(ta.scrollHeight, isNaN(max) ? ta.scrollHeight : max);
  ta.style.height = h + 'px';
}
document.addEventListener('input', e => {
  if (e.target && e.target.tagName === 'TEXTAREA') autoGrow(e.target);
});
function listKeydown(e){
  if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return false;
  const ta = e.target;
  if (!ta || ta.tagName !== 'TEXTAREA') return false;
  const pos = ta.selectionStart;
  if (pos !== ta.selectionEnd) return false;
  const before = ta.value.slice(0, pos);
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);
  const m = line.match(/^(\s*)([-•*]|\d+[.)])(\s+)(.*)$/);
  if (!m) return false;
  e.preventDefault();
  if (m[4].trim() === '') {
    ta.value = ta.value.slice(0, lineStart) + ta.value.slice(pos);
    ta.selectionStart = ta.selectionEnd = lineStart;
  } else {
    let marker;
    const num = m[2].match(/^(\d+)([.)])$/);
    if (num) marker = (parseInt(num[1], 10) + 1) + num[2] + m[3];
    else marker = m[2] + m[3];
    const ins = '\n' + m[1] + marker;
    ta.value = before + ins + ta.value.slice(pos);
    ta.selectionStart = ta.selectionEnd = pos + ins.length;
  }
  autoGrow(ta);
  return true;
}
function fmtApply(ta, type){
  if (!ta) return;
  const s = ta.selectionStart || 0, e = ta.selectionEnd || 0, v = ta.value;
  if (type === 'b' || type === 'i') {
    const sel = v.slice(s, e) || 'текст';
    const ins = type === 'b' ? '**' + sel + '**' : '*' + sel + '*';
    ta.value = v.slice(0, s) + ins + v.slice(e);
    ta.focus();
    ta.selectionStart = s;
    ta.selectionEnd = s + ins.length;
    autoGrow(ta);
    return;
  }
  if (s === e) {
    const before = v.slice(0, s);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = v.indexOf('\n', s);
    const lineEndPos = lineEnd === -1 ? v.length : lineEnd;
    const line = v.slice(lineStart, lineEndPos);
    const has = line.match(/^(\s*)[-•]\s+/);
    if (has) {
      ta.value = v.slice(0, lineStart) + line.slice(has[0].length) + v.slice(lineEndPos);
      ta.selectionStart = ta.selectionEnd = s - has[0].length;
    } else {
      ta.value = v.slice(0, lineStart) + '- ' + line + v.slice(lineEndPos);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
    ta.focus();
    autoGrow(ta);
    return;
  }
  const sel = v.slice(s, e);
  const ins = sel.split('\n').map(l => '- ' + l.replace(/^\s*[-•]\s+/, '')).join('\n');
  ta.value = v.slice(0, s) + ins + v.slice(e);
  ta.focus();
  ta.selectionStart = s;
  ta.selectionEnd = s + ins.length;
  autoGrow(ta);
}
function fmtDay(type){ fmtApply(document.getElementById('dayInput'), type); }
let toastTimer = null;
function notify(text, ok){
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.toggle('success', !!ok);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
let confirmCb = null;
function askConfirm(text, cb, yesLabel){
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmYes').textContent = yesLabel || 'Подтвердить';
  confirmCb = cb;
  document.getElementById('confirmModal').classList.add('open');
}
document.getElementById('confirmYes').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('open');
  const cb = confirmCb; confirmCb = null;
  if (cb) cb();
});
document.getElementById('confirmNo').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('open');
  confirmCb = null;
});
const sidebarEl = document.getElementById('sidebar');
const backdropEl = document.getElementById('sbBackdrop');
function togglePin(){
  const pinned = sidebarEl.classList.toggle('pinned');
  document.body.classList.toggle('sb-pinned', pinned);
  localStorage.setItem(PIN_KEY, pinned ? '1' : '0');
}
function openSbMobile(){ sidebarEl.classList.add('open'); backdropEl.classList.add('show'); }
function closeSb(){ sidebarEl.classList.remove('open'); backdropEl.classList.remove('show'); }
function closeSbMobile(){ if (window.innerWidth <= 720) closeSb(); }
document.getElementById('sbToggle').addEventListener('click', () => {
  if (sidebarEl.classList.contains('open')) closeSb(); else openSbMobile();
});
if (localStorage.getItem(PIN_KEY) === '1') {
  sidebarEl.classList.add('pinned');
  document.body.classList.add('sb-pinned');
}
const sbSearchIco = document.getElementById('sbSearchIco');
const sbSearchInput = document.getElementById('searchInput');
sbSearchIco.addEventListener('click', () => {
  sidebarEl.classList.add('search-open');
  sbSearchInput.focus();
});
sbSearchInput.addEventListener('blur', () => {
  sidebarEl.classList.remove('search-open');
});
function saveDayNotes(){
  localStorage.setItem(DAYNOTES_KEY, JSON.stringify(dayNotes));
  if (!suppressPush) schedulePush();
}
function saveDayReports(){
  localStorage.setItem(DAYREPORTS_KEY, JSON.stringify(dayReports));
  if (!suppressPush) schedulePush();
}
function dayNoteFor(date){ return dayNotes.find(d => d.date === date); }
function dayReportFor(date){ return dayReports.find(r => r.date === date); }
function doneTasksForDate(dateISO){
  return tasks.filter(t => t.done && t.doneAt && String(t.doneAt).slice(0,10) === dateISO);
}
function autoLinesForDate(dateISO){
  return doneTasksForDate(dateISO).map(t => '- [' + labelFor(t.zone) + '] ' + htmlToPlain(t.text));
}
function renderDayReportAuto(dateISO){
  const box = document.getElementById('dayReportAuto');
  if (!box) return;
  const items = doneTasksForDate(dateISO);
  box.innerHTML = items.length
    ? '<h5>✅ Закрыто на доске за этот день (попадает в выгрузки автоматически):</h5><ul>' +
      items.map(t => '<li>[' + escapeHtml(labelFor(t.zone)) + '] ' + escapeHtml(htmlToPlain(t.text)) + '</li>').join('') + '</ul>'
    : '<h5>✅ Закрыто на доске за этот день: пока ничего</h5>';
}
function calPrev(){ calMonth--; if (calMonth < 0){ calMonth = 11; calYear--; } renderCalendar(); }
function calNext(){ calMonth++; if (calMonth > 11){ calMonth = 0; calYear++; } renderCalendar(); }
function calToday(){ const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); renderCalendar(); }
function monthBlock(year, month){
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const todayStr = todayISO();
  let cells = '';
  for (let i = offset - 1; i >= 0; i--) cells += '<span class="cal-day other">' + (prevDays - i) + '</span>';
  for (let d = 1; d <= daysIn; d++) {
    const date = isoOf(new Date(year, month, d));
    const note = dayNoteFor(date);
    const cls = ['cal-day'];
    if (date === todayStr) cls.push('today');
    if (note) cls.push('has-note');
    const dot = note ? '<span class="cal-dot"></span>' : '';
    cells += '<button class="' + cls.join(' ') + '" onclick="openDay(\'' + date + '\')" onmouseenter="calHover(event,\'' + date + '\')" onmouseleave="calHide()">' + d + dot + '</button>';
  }
  const trail = (7 - ((offset + daysIn) % 7)) % 7;
  for (let i = 1; i <= trail; i++) cells += '<span class="cal-day other">' + i + '</span>';
  return '<div class="cal-month">' +
    '<h4>' + MONTHS_NOM[month] + ' ' + year + '</h4>' +
    '<div class="cal-week"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    '</div>';
}
function renderCalendar(){
  const m2 = (calMonth + 1) % 12;
  const y2 = calYear + (calMonth === 11 ? 1 : 0);
  document.getElementById('calTitle').textContent = MONTHS_NOM[calMonth] + ' — ' + MONTHS_NOM[m2] + ' ' + y2;
  document.getElementById('calGrid').innerHTML = monthBlock(calYear, calMonth) + monthBlock(y2, m2);
}
function calHover(event, date){
  if (!window.matchMedia('(hover:hover)').matches) return;
  const note = dayNoteFor(date);
  if (!note) { calHide(); return; }
  const pop = document.getElementById('calPop');
  const p = parseLocal(date);
  pop.innerHTML = '<div class="cal-pop-date">' + p.getDate() + ' ' + MONTHS_GEN[p.getMonth()] + ' ' + p.getFullYear() + '</div>' +
    '<div class="cal-pop-note">' + renderRich(capFirst(note.text)) + '</div>';
  pop.classList.add('show');
  const r = event.currentTarget.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = r.right + 8;
  if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - 8);
  let top = r.top;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}
function calHide(){ document.getElementById('calPop').classList.remove('show'); }
function openDay(date){
  calHide();
  currentDayDate = date;
  const p = parseLocal(date);
  document.getElementById('dayTitle').textContent = '📅 ' + p.getDate() + ' ' + MONTHS_GEN[p.getMonth()] + ' ' + p.getFullYear();
  const note = dayNoteFor(date);
  const v = capFirst(note ? note.text : '');
  dayInitial = v;
  const dayTa = document.getElementById('dayInput');
  dayTa.value = v;
  document.getElementById('dayDelete').style.display = note ? '' : 'none';
  document.getElementById('dayModal').classList.add('open');
  setTimeout(() => { dayTa.focus(); autoGrow(dayTa); }, 0);
}
function closeDay(){ document.getElementById('dayModal').classList.remove('open'); }
function closeDayRequest(){
  const ta = document.getElementById('dayInput');
  if (ta.value.trim() !== dayInitial.trim()) {
    askConfirm('Закрыть без сохранения? Введённый текст будет потерян.', () => { closeDay(); notify('Закрыто без сохранения.'); }, 'Закрыть без сохранения');
  } else closeDay();
}
function saveDay(){
  const text = capFirst(document.getElementById('dayInput').value.trim());
  if (!text) { deleteDayNote(); return; }
  const ex = dayNoteFor(currentDayDate);
  if (ex) { ex.text = text; ex.updated = new Date().toISOString(); }
  else dayNotes.push({date: currentDayDate, text: text, updated: new Date().toISOString()});
  saveDayNotes(); renderCalendar(); closeDay(); notify('Заметка сохранена.', true);
}
function deleteDayNote(){
  askConfirm('Удалить заметку за эту дату? Действие необратимо.', () => {
    dayNotes = dayNotes.filter(d => d.date !== currentDayDate);
    saveDayNotes(); renderCalendar(); closeDay();
    notify('Заметка удалена.');
  }, 'Удалить');
}
document.getElementById('dayDelete').addEventListener('click', deleteDayNote);
document.getElementById('dayCancel').addEventListener('click', closeDayRequest);
document.getElementById('dayInput').addEventListener('keydown', e => {
  if (listKeydown(e)) return;
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDay(); }
});
// --- Отчёт дня (за произвольную дату) ---
function openDayReport(date){
  stopEdVoice();
  editingReportDate = date || todayISO();
  const p = parseLocal(editingReportDate);
  document.getElementById('dayReportTitle').textContent = '📄 Отчёт за ' + p.getDate() + ' ' + MONTHS_GEN[p.getMonth()] + ' ' + p.getFullYear();
  document.getElementById('dayReportModal').classList.add('open');
  const r = dayReportFor(editingReportDate);
  try {
    repEditor.init(r ? r.text : '', r ? isHtmlText(r.text) : false);
  } catch(e) {
    try { repEditor.destroy(); } catch(e2){}
    repEditor.init(r ? r.text : '', false);
  }
  dayReportInitialPlain = repEditor.plain();
  renderDayReportAuto(editingReportDate);
  setTimeout(() => repEditor.focus(), 60);
}
function closeDayReport(){ document.getElementById('dayReportModal').classList.remove('open'); stopEdVoice(); repEditor.destroy(); }
function closeDayReportRequest(){
  if (repEditor.plain() !== dayReportInitialPlain) {
    askConfirm('Закрыть без сохранения? Введённый текст будет потерян.', () => { closeDayReport(); notify('Закрыто без сохранения.'); }, 'Закрыть без сохранения');
  } else closeDayReport();
}
function saveDayReport(){
  const val = repEditor.get();
  const plain = htmlToPlain(val).trim();
  const date = editingReportDate || todayISO();
  if (!plain) {
    if (!dayReportFor(date)) { closeDayReport(); return; }
    askConfirm('Удалить отчёт за эту дату? Действие необратимо.', () => {
      dayReports = dayReports.filter(r => r.date !== date);
      saveDayReports(); closeDayReport();
      notify('Отчёт удалён.');
    }, 'Удалить');
    return;
  }
  const ex = dayReportFor(date);
  if (ex) { ex.text = val; ex.updated = new Date().toISOString(); }
  else dayReports.push({date: date, text: val, updated: new Date().toISOString()});
  saveDayReports(); closeDayReport();
  notify('Отчёт сохранён.', true);
}
function dayReportFullText(date){
  const r = dayReportFor(date);
  const manual = r ? htmlToPlain(r.text).trim() : '';
  const auto = autoLinesForDate(date);
  const p = parseLocal(date);
  const head = 'Отчёт за ' + p.getDate() + '.' + String(p.getMonth()+1).padStart(2,'0') + '.' + p.getFullYear();
  let out = '';
  if (manual) out += head + '\n' + manual;
  if (auto.length) out += (out ? '\n\n' : head + '\n') + 'Закрыто на доске:\n' + auto.join('\n');
  return out.trim();
}
function copyDayReport(){
  const t = dayReportFullText(editingReportDate || todayISO());
  if (!t) { notify('Отчёта за эту дату нет.'); return; }
  navigator.clipboard.writeText(t).then(() => notify('Отчёт скопирован.', true));
}
function downloadDayReportMd(){
  const t = dayReportFullText(editingReportDate || todayISO());
  if (!t) { notify('Отчёта за эту дату нет.'); return; }
  downloadBlob('# ' + t.split('\n')[0] + '\n\n' + t.split('\n').slice(1).join('\n') + '\n', 'otchet-' + (editingReportDate || todayISO()) + '.md', 'text/markdown;charset=utf-8');
  notify('Файл Markdown сохранён.', true);
}
document.getElementById('cancelDayReport').addEventListener('click', closeDayReportRequest);
// --- Голос: textarea (quickAdd) и редактор отчёта ---
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const micBtn = document.getElementById('micBtn');
const repMicBtn = document.getElementById('repMic');
let recog = null, listening = false, voiceBase = '', voiceTarget = null;
let voiceActive = false, voiceFinal = '';
let edVoiceActive = false;
function voiceJoin(base, add){
  if (!add) return base;
  return base + (base && !base.endsWith(' ') ? ' ' : '') + add;
}
function startRecog(){
  try { recog.start(); } catch (err) {}
  listening = true;
  updateMicUI();
}
function startVoice(el) {
  if (!SpeechRec || !el) return;
  if (voiceActive) {
    voiceActive = false; listening = false;
    try { recog.stop(); } catch (err) {}
    updateMicUI();
    return;
  }
  stopEdVoice();
  voiceTarget = el;
  voiceBase = el.value.trim();
  voiceFinal = '';
  voiceActive = true;
  el.focus();
  startRecog();
}
function startEdVoice() {
  if (!SpeechRec) return;
  if (edVoiceActive) { stopEdVoice(); return; }
  if (voiceActive) { voiceActive = false; try { recog.stop(); } catch(e){} updateMicUI(); }
  edVoiceActive = true;
  voiceFinal = '';
  updateMicUI();
  startRecog();
}
function stopEdVoice() {
  if (!edVoiceActive) return;
  edVoiceActive = false;
  listening = false;
  try { recog.stop(); } catch(e){}
  updateMicUI();
}
function updateMicUI() {
  micBtn.classList.toggle('listening', voiceActive && voiceTarget === document.getElementById('quickAdd'));
  repMicBtn.classList.toggle('listening', edVoiceActive);
}
if (!SpeechRec) { micBtn.classList.add('hidden'); repMicBtn.classList.add('hidden'); } else {
  recog = new SpeechRec();
  recog.lang = 'ru-RU'; recog.interimResults = true; recog.continuous = true; recog.maxAlternatives = 1;
  recog.onresult = e => {
    if (edVoiceActive) {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) repEditor.appendText(e.results[i][0].transcript.trim() + ' ');
      }
      return;
    }
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) voiceFinal += t + ' ';
      else interim += t;
    }
    const el = voiceTarget || document.getElementById('quickAdd');
    el.value = voiceJoin(voiceBase, (voiceFinal + interim).trim());
    autoGrow(el);
  };
  recog.onend = () => {
    listening = false;
    if (voiceActive) { setTimeout(() => { if (voiceActive) startRecog(); }, 250); }
    else if (edVoiceActive) { setTimeout(() => { if (edVoiceActive) startRecog(); }, 250); }
    else { voiceTarget = null; updateMicUI(); }
  };
  recog.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      voiceActive = false; edVoiceActive = false; listening = false; updateMicUI();
      notify('Браузер запретил доступ к микрофону. Разрешите его в настройках сайта.');
      return;
    }
    if (e.error === 'network') {
      voiceActive = false; edVoiceActive = false; listening = false; updateMicUI();
      notify('Голосовой ввод недоступен: нет соединения с сервисом распознавания.');
      return;
    }
  };
  micBtn.addEventListener('click', () => startVoice(document.getElementById('quickAdd')));
  repMicBtn.addEventListener('click', () => startEdVoice());
}
function clearTransientInputs() {
  const s = document.getElementById('searchInput');
  const qa = document.getElementById('quickAdd');
  if (s) s.value = '';
  if (qa) qa.value = '';
}
function clearSearchOnly() {
  const s = document.getElementById('searchInput');
  if (s && document.activeElement !== s) s.value = '';
}
window.addEventListener('load', clearTransientInputs);
window.addEventListener('pageshow', clearTransientInputs);
setTimeout(clearSearchOnly, 300);
setTimeout(clearSearchOnly, 1200);
function clearLeakedSearch(text) {
  if (!text) return;
  const s = document.getElementById('searchInput');
  if (s && s.value.trim() === text.trim()) s.value = '';
  setTimeout(() => {
    const s2 = document.getElementById('searchInput');
    if (s2 && s2.value.trim() === text.trim()) { s2.value = ''; render(); }
  }, 60);
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  if (!suppressPush) schedulePush();
}
function savePersonal() {
  localStorage.setItem(PERSONAL_KEY, JSON.stringify(personal));
  if (!suppressPush) schedulePush();
}
function saveZones() {
  localStorage.setItem(ZONES_KEY, JSON.stringify(zones));
  if (!suppressPush) schedulePush();
}
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { cloudWrite().catch(() => {}); }, 800);
}
function cloudRead() {
  return fetch(API_URL + '?t=' + Date.now(), {headers: {'Accept': 'application/vnd.github.v3+json'}})
    .then(r => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(d => {
      if (!d) return null;
      cloudSha = d.sha;
      const parsed = JSON.parse(b64d(d.content));
      if (parsed && Array.isArray(parsed.zones) && parsed.zones.length) {
        zones = parsed.zones.map(migrateZone);
        localStorage.setItem(ZONES_KEY, JSON.stringify(zones));
      }
      if (parsed && Array.isArray(parsed.personal)) {
        personal = parsed.personal.map(migratePersonalNote);
        localStorage.setItem(PERSONAL_KEY, JSON.stringify(personal));
      }
      if (parsed && Array.isArray(parsed.daynotes)) {
        dayNotes = parsed.daynotes.map(migrateDayNote).filter(Boolean);
        localStorage.setItem(DAYNOTES_KEY, JSON.stringify(dayNotes));
      }
      if (parsed && Array.isArray(parsed.dayreports)) {
        dayReports = parsed.dayreports.map(migrateDayReport).filter(Boolean);
        localStorage.setItem(DAYREPORTS_KEY, JSON.stringify(dayReports));
      }
      return parsed;
    });
}
function cloudWrite() {
  const token = getToken();
  if (!token) {
    openSettings('Без токена изменения останутся только на этом устройстве. Вставь токен, чтобы синхронизироваться с облаком.');
    return Promise.reject('no-token');
  }
  const payload = () => {
    const b = {message: 'board: sync ' + new Date().toISOString(), content: b64e(JSON.stringify({tasks: tasks, zones: zones, personal: personal, daynotes: dayNotes, dayreports: dayReports}, null, 2))};
    if (cloudSha) b.sha = cloudSha;
    return b;
  };
  const headers = {'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json'};
  return fetch(API_URL, {method: 'PUT', headers: headers, body: JSON.stringify(payload())})
    .then(r => {
      if (r.status === 409 || r.status === 422) {
        return cloudRead().then(() => fetch(API_URL, {method: 'PUT', headers: headers, body: JSON.stringify(payload())}));
      }
      return r;
    })
    .then(r => {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(d => { if (d && d.content) cloudSha = d.content.sha; });
}
const DONE_ARCHIVE_DELAY = 3 * 24 * 60 * 60 * 1000;
function sweepDoneToArchive() {
  const cutoff = Date.now() - DONE_ARCHIVE_DELAY;
  let changed = false;
  tasks.forEach(t => {
    if (t.done && t.doneAt && !t.archived && new Date(t.doneAt).getTime() <= cutoff) { t.archived = true; changed = true; }
  });
  if (changed) saveTasks();
}
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function splitEmoji(text) {
  const re = /^\s*(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)\s*/u;
  const m = String(text||'').match(re);
  if (m) return {emoji: m[1], rest: String(text).slice(m[0].length)};
  return {emoji: null, rest: String(text||'')};
}
function matchesQuery(t, q) {
  if (!q) return true;
  const plain = String(t.text || '').replace(/<[^>]+>/g,' ').toLowerCase();
  if (plain.includes(q)) return true;
  return (t.subtasks || []).some(s => String(s.text||'').replace(/<[^>]+>/g,' ').toLowerCase().includes(q));
}
function subtaskHtml(t, s, idx){
  const hidden = (!expandedSubs.has(t.id) && idx >= SUB_VISIBLE) ? ' sub-hidden' : '';
  const clamped = expandedSubText.has(s.id) ? '' : ' clamped-sub';
  return '<div class="subtask ' + (s.done ? 'done' : '') + hidden + '">' +
    '<input type="checkbox" ' + (s.done ? 'checked' : '') + ' onchange="toggleSub(' + t.id + ',' + s.id + ')">' +
    '<div class="sub-text">' +
      '<div class="sub-content' + clamped + '">' + renderContent(s.text) + '</div>' +
      '<button type="button" class="collapse-toggle" data-cst="' + s.id + '" style="display:none"></button>' +
    '</div>' +
    '</div>';
}
function noteHtml(t) {
  const parts = splitEmoji(t.text);
  parts.rest = capFirst(parts.rest);
  const chip = parts.emoji ? '<span class="emoji-chip">' + parts.emoji + '</span>' : '';
  const pinMark = t.pinned ? '<span class="pin-mark" title="Закреплено">📌</span>' : '';
  const subDone = t.subtasks.filter(s => s.done).length;
  const subChip = t.subtasks.length ? '<span class="sub-count">' + subDone + '/' + t.subtasks.length + '</span>' : '';
  let dueChip = '';
  if (t.due) {
    const st = dueState(t);
    let cls = 'due-chip ';
    let content = '';
    if (st === 'done') { cls += 'due-done'; content = '🔕 ' + fmtDate(t.due); }
    else if (st === 'over') { cls += 'due-r'; content = '🔔 ' + fmtDate(t.due) + ' · просрочено'; }
    else if (st === 'today') { cls += 'due-r'; content = '🔔 ' + fmtDate(t.due) + ' · сегодня'; }
    else if (st === 'tomorrow') { cls += 'due-o'; content = '🔔 ' + fmtDate(t.due) + ' · завтра'; }
    else { cls += 'due-y'; content = '🔔 ' + fmtDate(t.due); }
    dueChip = '<span class="' + cls + '">' + content + '</span>';
  }
  const metaRow = dueChip ? '<div class="due-row">' + dueChip + '</div>' : '';
  let subBlock = '';
  if (t.subtasks.length) {
    subBlock = '<div class="subtasks">' +
      t.subtasks.map((s, idx) => subtaskHtml(t, s, idx)).join('') +
      '<button type="button" class="collapse-toggle" data-cs="' + t.id + '" style="display:none"></button>' +
      '</div>';
  }
  return '<div class="note ' + (t.done ? 'done' : '') + (t.pinned ? ' pinned' : '') + '" data-id="' + t.id + '">' +
    '<input type="checkbox" class="note-checkbox" ' + (t.done ? 'checked' : '') + ' onchange="toggleDone(' + t.id + ')">' +
    '<div class="note-body">' +
      '<div class="note-content">' + pinMark + chip + '<span class="note-text' + (expandedText.has(t.id) ? '' : ' clamped') + '">' + renderContent(parts.rest) + '</span>' + subChip + '</div>' +
      '<button type="button" class="collapse-toggle" data-ct="' + t.id + '" style="display:none"></button>' +
      metaRow +
      subBlock +
    '</div>' +
    '<div class="note-actions">' +
      '<button class="note-action" onclick="openSubsModal(' + t.id + ',false)" title="Подзадачи">' + ARROW_DOWN + '</button>' +
      '<button class="note-action" onclick="openEditModal({type:\'task\',id:' + t.id + '})" title="Редактировать">' + PENCIL + '</button>' +
      '<button class="note-action" onclick="openNoteMenu(' + t.id + ', event)" title="Действия">' + ELLIPSIS + '</button>' +
    '</div>' +
    '</div>';
}
function personalNoteHtml(t) {
  const parts = splitEmoji(t.text);
  parts.rest = capFirst(parts.rest);
  const chip = parts.emoji ? '<span class="emoji-chip">' + parts.emoji + '</span>' : '';
  const subDone = t.subtasks.filter(s => s.done).length;
  const subChip = t.subtasks.length ? '<span class="sub-count">' + subDone + '/' + t.subtasks.length + '</span>' : '';
  let subBlock = '';
  if (t.subtasks.length) {
    subBlock = '<div class="subtasks">' +
      t.subtasks.map((s, idx) => subtaskHtml(t, s, idx)).join('') +
      '<button type="button" class="collapse-toggle" data-cs="' + t.id + '" style="display:none"></button>' +
      '</div>';
  }
  return '<div class="note ' + (t.done ? 'done' : '') + '" data-id="' + t.id + '">' +
    '<input type="checkbox" class="note-checkbox" ' + (t.done ? 'checked' : '') + ' onchange="togglePersonalDone(' + t.id + ')">' +
    '<div class="note-body">' +
      '<div class="note-content">' + chip + '<span class="note-text' + (expandedText.has(t.id) ? '' : ' clamped') + '">' + renderContent(parts.rest) + '</span>' + subChip + '</div>' +
      '<button type="button" class="collapse-toggle" data-ct="' + t.id + '" style="display:none"></button>' +
      subBlock +
    '</div>' +
    '<div class="note-actions">' +
      '<button class="note-action" onclick="openSubsModal(' + t.id + ',true)" title="Подзадачи">' + ARROW_DOWN + '</button>' +
      '<button class="note-action" onclick="openEditModal({type:\'personal\',id:' + t.id + '})" title="Редактировать">' + PENCIL + '</button>' +
      '<button class="note-action danger" onclick="deletePersonal(' + t.id + ')" title="Удалить навсегда">' + TRASH + '</button>' +
    '</div>' +
    '</div>';
}
function applyTextCollapse(noteEl){
  const nt = noteEl.querySelector('.note-text');
  const tog = noteEl.querySelector('.collapse-toggle[data-ct]');
  if (!nt || !tog) return;
  const id = Number(tog.getAttribute('data-ct'));
  if (expandedText.has(id)) {
    nt.classList.remove('clamped');
    tog.textContent = 'свернуть ▴';
    tog.style.display = '';
  } else {
    nt.classList.add('clamped');
    if (nt.scrollHeight > nt.clientHeight + 2) { tog.textContent = 'развернуть ▾'; tog.style.display = ''; }
    else { tog.style.display = 'none'; }
  }
}
function applySubCollapse(noteEl){
  const tog = noteEl.querySelector('.collapse-toggle[data-cs]');
  if (!tog) return;
  const id = Number(tog.getAttribute('data-cs'));
  const subs = noteEl.querySelectorAll('.subtask');
  const expanded = expandedSubs.has(id);
  subs.forEach((s, i) => s.classList.toggle('sub-hidden', !expanded && i >= SUB_VISIBLE));
  if (subs.length > SUB_VISIBLE) {
    tog.style.display = '';
    tog.textContent = expanded ? 'свернуть ▴' : 'развернуть (ещё ' + (subs.length - SUB_VISIBLE) + ') ▾';
  } else {
    tog.style.display = 'none';
  }
}
function applySubTextCollapse(noteEl){
  noteEl.querySelectorAll('.collapse-toggle[data-cst]').forEach(tog => {
    const content = tog.parentElement ? tog.parentElement.querySelector('.sub-content') : null;
    if (!content) return;
    const id = Number(tog.getAttribute('data-cst'));
    if (expandedSubText.has(id)) {
      content.classList.remove('clamped-sub');
      tog.textContent = 'свернуть ▴';
      tog.style.display = '';
    } else {
      content.classList.add('clamped-sub');
      if (content.scrollHeight > content.clientHeight + 2) { tog.textContent = 'развернуть ▾'; tog.style.display = ''; }
      else { tog.style.display = 'none'; }
    }
  });
}
function refreshCollapses(){
  document.querySelectorAll('.note').forEach(el => {
    applyTextCollapse(el);
    applySubCollapse(el);
    applySubTextCollapse(el);
  });
}
document.addEventListener('click', e => {
  const tog = e.target && e.target.closest ? e.target.closest('.collapse-toggle') : null;
  if (!tog) return;
  const noteEl = tog.closest('.note');
  if (!noteEl) return;
  if (tog.hasAttribute('data-ct')) {
    const id = Number(tog.getAttribute('data-ct'));
    if (expandedText.has(id)) expandedText.delete(id); else expandedText.add(id);
    applyTextCollapse(noteEl);
  } else if (tog.hasAttribute('data-cs')) {
    const id = Number(tog.getAttribute('data-cs'));
    if (expandedSubs.has(id)) expandedSubs.delete(id); else expandedSubs.add(id);
    applySubCollapse(noteEl);
  } else if (tog.hasAttribute('data-cst')) {
    const id = Number(tog.getAttribute('data-cst'));
    if (expandedSubText.has(id)) expandedSubText.delete(id); else expandedSubText.add(id);
    applySubTextCollapse(noteEl);
  }
});
function render() {
  const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const active = tasks.filter(t => !t.archived);
  document.getElementById('totalCount').textContent = active.length;
  document.getElementById('progressCount').textContent = active.filter(t => !t.done).length;
  document.getElementById('doneCount').textContent = active.filter(t => t.done).length;
  const wrap = document.getElementById('zonesWrap');
  const visible = zones.filter(z => !z.hidden);
  wrap.innerHTML = visible.map(z => {
    const zoneActive = active.filter(x => x.zone === z.key);
    const zoneTasks = zoneActive.filter(x => matchesQuery(x, q)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    let notesHtml;
    if (zoneTasks.length === 0) notesHtml = '<div class="empty">' + (zoneActive.length ? 'Ничего не найдено' : 'Пока пусто') + '</div>';
    else notesHtml = zoneTasks.map(noteHtml).join('');
    return '<section class="zone" data-zone="' + z.key + '" style="' + zoneStyle(z) + '">' +
      '<header class="zone-head">' +
        '<div class="zone-emoji">' + (z.emoji || '🗂️') + '</div>' +
        '<h2>' + escapeHtml(z.label) + '</h2>' +
        '<span class="count">' + zoneTasks.length + '</span>' +
        '<button class="add-btn" onclick="openAddFor(\'' + z.key + '\')" title="Добавить задачу">+</button>' +
        '<button class="zone-hide-btn" onclick="hideZone(\'' + z.key + '\')" title="Скрыть раздел">' + EYE_OFF + '</button>' +
      '</header>' +
      '<div class="notes">' + notesHtml + '</div>' +
    '</section>';
  }).join('');
  renderPersonal();
}
function renderPersonal() {
  const list = document.getElementById('personalNotes');
  const n = personal.length;
  document.getElementById('personalCount').textContent = n + (n === 1 ? ' заметка' : (n > 1 && n < 5 ? ' заметки' : ' заметок'));
  if (!n) {
    list.innerHTML = '<div class="empty">Пока нет личных заметок — добавьте через поле в шапке</div>';
  } else {
    list.innerHTML = personal.slice().reverse().map(personalNoteHtml).join('');
  }
  renderCalendar();
  refreshCollapses();
}
function switchPage(page) {
  currentPage = page;
  localStorage.setItem(PAGE_KEY, page);
  const isBoard = page === 'board';
  document.getElementById('boardPage').classList.toggle('page-hidden', !isBoard);
  document.getElementById('personalPage').classList.toggle('page-hidden', isBoard);
  document.getElementById('navBoard').classList.toggle('active', isBoard);
  document.getElementById('navPersonal').classList.toggle('active', !isBoard);
  document.querySelectorAll('.sb-board-only').forEach(el => el.classList.toggle('page-hidden', !isBoard));
  document.getElementById('fabReport').classList.toggle('page-hidden', !isBoard);
  document.getElementById('pageTitle').textContent = isBoard ? 'Доска Дарьи' : 'Личное';
  document.getElementById('pageSubtitle').textContent = isBoard ? 'Авиабит · Портал 2.0 · Прочее' : 'Заметки только для меня';
  document.getElementById('quickAdd').placeholder = isBoard ? 'Быстрая задача' : 'Личная заметка';
  calHide();
  if (!isBoard) renderCalendar();
}
function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.doneAt = t.done ? new Date().toISOString() : null;
  saveTasks(); render();
}
function togglePersonalDone(id) {
  const t = personal.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.doneAt = t.done ? new Date().toISOString() : null;
  savePersonal(); renderPersonal();
}
// --- Модалка редактирования ---
function storeFor(mode){ return mode.type === 'personal' ? personal : tasks; }
function openEditModal(mode){
  editMode = mode;
  let content = '', asHtml = false, title = 'Редактирование';
  if (mode.type === 'task' || mode.type === 'personal') {
    const t = storeFor(mode).find(x => x.id === mode.id);
    if (!t) return;
    content = t.text; asHtml = isHtmlText(t.text);
    title = mode.type === 'personal' ? '✏️ Личная заметка' : '✏️ Задача';
  } else if (mode.type === 'sub') {
    const t = storeFor({type: mode.isPersonal ? 'personal' : 'task'}).find(x => x.id === mode.tid);
    const s = t && t.subtasks.find(y => y.id === mode.sid);
    if (!s) return;
    content = s.text; asHtml = isHtmlText(s.text);
    title = '✏️ Подзадача';
  } else if (mode.type === 'subnew') {
    title = '＋ Новая подзадача';
  }
  document.getElementById('editTitle').textContent = title;
  document.getElementById('editModal').classList.add('open');
  try {
    editEditor.init(content, asHtml);
  } catch(e) {
    try { editEditor.destroy(); } catch(e2){}
    editEditor.init(content, false);
  }
  editInitialPlain = editEditor.plain();
  setTimeout(() => editEditor.focus(), 60);
}
function closeEdit(){ document.getElementById('editModal').classList.remove('open'); editEditor.destroy(); editMode = null; }
function closeEditRequest(){
  if (editEditor.plain() !== editInitialPlain) {
    askConfirm('Закрыть без сохранения? Изменения будут потеряны.', () => { closeEdit(); notify('Закрыто без сохранения.'); }, 'Закрыть без сохранения');
  } else closeEdit();
}
function saveEdit(){
  if (!editMode) return;
  const val = editEditor.get();
  const plain = htmlToPlain(val).trim();
  if (!plain) { notify('Пустой текст не сохраняется.'); return; }
  const m = editMode;
  if (m.type === 'task' || m.type === 'personal') {
    const t = storeFor(m).find(x => x.id === m.id);
    if (t) { t.text = val; }
    if (m.type === 'personal') { savePersonal(); renderPersonal(); } else { saveTasks(); render(); }
  } else if (m.type === 'sub') {
    const t = storeFor({type: m.isPersonal ? 'personal' : 'task'}).find(x => x.id === m.tid);
    const s = t && t.subtasks.find(y => y.id === m.sid);
    if (s) s.text = val;
    if (m.isPersonal) { savePersonal(); renderPersonal(); } else { saveTasks(); render(); }
    renderSubsList();
  } else if (m.type === 'subnew') {
    const t = storeFor({type: m.isPersonal ? 'personal' : 'task'}).find(x => x.id === m.tid);
    if (t) t.subtasks.push({id: Date.now(), text: val, done: false});
    if (m.isPersonal) { savePersonal(); renderPersonal(); } else { saveTasks(); render(); }
    renderSubsList();
  }
  notify('Сохранено.', true);
  closeEdit();
}
document.getElementById('cancelEdit').addEventListener('click', closeEditRequest);
document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
// --- Модалка подзадач ---
function openSubsModal(tid, isPersonal){
  subsMode = {tid: tid, isPersonal: !!isPersonal};
  const t = storeFor({type: isPersonal ? 'personal' : 'task'}).find(x => x.id === tid);
  if (!t) return;
  document.getElementById('subsTitle').textContent = '📝 Подзадачи: ' + shortText(t.text, 40);
  renderSubsList();
  document.getElementById('subsModal').classList.add('open');
}
function closeSubs(){ document.getElementById('subsModal').classList.remove('open'); subsMode = null; }
function renderSubsList(){
  const list = document.getElementById('subsList');
  if (!subsMode) return;
  const t = storeFor({type: subsMode.isPersonal ? 'personal' : 'task'}).find(x => x.id === subsMode.tid);
  if (!t) { list.innerHTML = ''; return; }
  if (!t.subtasks.length) {
    list.innerHTML = '<div class="empty">Подзадач пока нет</div>';
    return;
  }
  list.innerHTML = t.subtasks.map(s =>
    '<div class="subs-row ' + (s.done ? 'done' : '') + '">' +
      '<input type="checkbox" ' + (s.done ? 'checked' : '') + ' onchange="toggleSubFromModal(' + t.id + ',' + s.id + ')">' +
      '<div class="sub-text">' + renderContent(s.text) + '</div>' +
      '<button class="sub-edit-btn" onclick="openEditModal({type:\'sub\',tid:' + t.id + ',sid:' + s.id + ',isPersonal:' + subsMode.isPersonal + '})" title="Редактировать">' + PENCIL + '</button>' +
      '<button class="sub-del" onclick="delSubFromModal(' + t.id + ',' + s.id + ')" title="Удалить">×</button>' +
    '</div>'
  ).join('');
}
function toggleSubFromModal(tid, sid){
  const t = tasks.find(x => x.id === tid) || personal.find(x => x.id === tid);
  if (!t) return;
  const s = t.subtasks.find(y => y.id === sid);
  if (!s) return;
  s.done = !s.done;
  if (personal.includes(t)) { savePersonal(); renderPersonal(); } else { saveTasks(); render(); }
  renderSubsList();
}
function delSubFromModal(tid, sid){
  const t = tasks.find(x => x.id === tid) || personal.find(x => x.id === tid);
  if (!t) return;
  const s = t.subtasks.find(y => y.id === sid);
  if (!s) return;
  askConfirm('Удалить подзадачу «' + shortText(s.text) + '»? Действие необратимо.', () => {
    t.subtasks = t.subtasks.filter(y => y.id !== sid);
    if (personal.includes(t)) { savePersonal(); renderPersonal(); } else { saveTasks(); render(); }
    renderSubsList();
  }, 'Удалить');
}
document.getElementById('subsAddBtn').addEventListener('click', () => {
  if (!subsMode) return;
  openEditModal({type:'subnew', tid: subsMode.tid, isPersonal: subsMode.isPersonal});
});
function toggleSub(tid, sid) {
  const t = tasks.find(x => x.id === tid);
  if (t) { const s = t.subtasks.find(y => y.id === sid); if (s) { s.done = !s.done; saveTasks(); render(); } }
}
function toggleSubP(tid, sid) {
  const t = personal.find(x => x.id === tid);
  if (t) { const s = t.subtasks.find(y => y.id === sid); if (s) { s.done = !s.done; savePersonal(); renderPersonal(); } }
}
function deletePersonal(id) {
  const t = personal.find(x => x.id === id);
  const label = t ? shortText(t.text) : '';
  askConfirm('Удалить личную заметку «' + label + '» навсегда? Это действие необратимо.', () => {
    personal = personal.filter(x => x.id !== id);
    savePersonal(); renderPersonal();
  }, 'Удалить');
}
function archiveTask(id) {
  const t = tasks.find(x => x.id === id);
  if (t) { t.archived = true; saveTasks(); render(); }
}
function unarchiveTask(id) {
  const t = tasks.find(x => x.id === id);
  if (t) { t.archived = false; saveTasks(); render(); renderArchList(); }
}
function permanentDelete(id) {
  const t = tasks.find(x => x.id === id);
  const label = t ? shortText(t.text) : '';
  askConfirm('Удалить задачу «' + label + '» навсегда? Это действие необратимо.', () => {
    tasks = tasks.filter(x => x.id !== id);
    saveTasks(); render(); renderArchList();
  }, 'Удалить');
}
function togglePinTask(id) {
  const t = tasks.find(x => x.id === id);
  if (t) { t.pinned = !t.pinned; saveTasks(); render(); }
}
const popEl = document.getElementById('notePop');
function closeNoteMenu() { popEl.classList.remove('open'); }
function openNoteMenu(id, ev) {
  ev.stopPropagation();
  currentNoteId = id;
  const t = tasks.find(x => x.id === id);
  const dueLabel = t && t.due ? ': ' + fmtDate(t.due) : '';
  popEl.innerHTML =
    '<button class="pop-item" onclick="popDue()">🔔 Срок' + dueLabel + '</button>' +
    '<button class="pop-item" onclick="popArchive()">📦 В архив</button>';
  popEl.classList.add('open');
  const r = ev.currentTarget.getBoundingClientRect();
  const pw = popEl.offsetWidth, ph = popEl.offsetHeight;
  let left = r.left;
  if (left + pw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pw - 8);
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  popEl.style.left = left + 'px';
  popEl.style.top = top + 'px';
}
function popDue(){ const id=currentNoteId; closeNoteMenu(); openDue(id); }
function popArchive(){ const id=currentNoteId; closeNoteMenu(); archiveTask(id); }
document.addEventListener('click', e => {
  if (popEl.classList.contains('open') && !e.target.closest('#notePop') && !e.target.closest('.note-action')) closeNoteMenu();
});
window.addEventListener('scroll', () => { if (popEl.classList.contains('open')) closeNoteMenu(); calHide(); }, true);
window.addEventListener('resize', () => { closeNoteMenu(); calHide(); });
function openDue(id) {
  currentNoteId = id;
  const t = tasks.find(x => x.id === id);
  document.getElementById('dueInput').value = t && t.due ? t.due : '';
  document.getElementById('dueModal').classList.add('open');
}
function closeDue() { document.getElementById('dueModal').classList.remove('open'); }
function saveDue() {
  const t = tasks.find(x => x.id === currentNoteId);
  if (t) { t.due = document.getElementById('dueInput').value || null; saveTasks(); render(); }
  closeDue();
}
function clearDue() {
  const t = tasks.find(x => x.id === currentNoteId);
  if (t) { t.due = null; saveTasks(); render(); }
  closeDue();
}
document.getElementById('clearDoneBtn').addEventListener('click', () => {
  const n = tasks.filter(t => t.done && !t.archived).length;
  if (!n) { notify('Нет выполненных задач для отправки в архив.'); return; }
  document.getElementById('broomText').textContent = 'Отправить все выполненные задачи (' + n + ') в архив? В любой момент их можно вернуть из архива.';
  document.getElementById('broomModal').classList.add('open');
});
function closeBroom() { document.getElementById('broomModal').classList.remove('open'); }
function confirmBroom() {
  tasks.filter(t => t.done && !t.archived).forEach(t => { t.archived = true; });
  saveTasks(); render(); closeBroom();
}
function openArchive() {
  document.getElementById('archSearch').value = '';
  renderArchList();
  document.getElementById('archiveModal').classList.add('open');
  closeSbMobile();
}
function closeArchive() { document.getElementById('archiveModal').classList.remove('open'); }
function renderArchList() {
  const q = (document.getElementById('archSearch').value || '').trim().toLowerCase();
  const list = document.getElementById('archList');
  const arch = tasks.filter(t => t.archived && matchesQuery(t, q))
    .sort((a, b) => (b.doneAt || b.created || '').localeCompare(a.doneAt || a.created || ''));
  if (!arch.length) {
    list.innerHTML = '<div class="empty">' + (q ? 'Ничего не найдено' : 'Архив пуст') + '</div>';
    return;
  }
  list.innerHTML = arch.map(t => {
    const z = zoneByKey(t.zone);
    const dateLabel = t.done ? (t.doneAt ? ' (' + t.doneAt.slice(0, 10) + ')' : '') : '';
    return '<div class="list-note"><span class="zone-tag" style="' + (z ? zoneTagStyle(z) : '') + '">' + escapeHtml(labelFor(t.zone)) + '</span><span class="note-text">' + escapeHtml(shortText(t.text, 120)) + ' <span style="color:var(--text-muted);font-size:12px">' + dateLabel + '</span></span>' +
      '<div class="list-actions">' +
      '<button class="list-btn restore" onclick="unarchiveTask(' + t.id + ')">Вернуть</button>' +
      '<button class="list-btn delete" onclick="permanentDelete(' + t.id + ')">Удалить</button>' +
      '</div></div>';
  }).join('');
}
document.getElementById('archSearch').addEventListener('input', renderArchList);
function openAddFor(zoneKey) {
  currentAddZone = zoneKey;
  document.getElementById('addModal').classList.add('open');
  addEditor.init('', false);
  setTimeout(() => addEditor.focus(), 60);
}
function hideZone(key) {
  const z = zoneByKey(key);
  if (z) { z.hidden = true; saveZones(); render(); }
}
function toggleZone(key) {
  const z = zoneByKey(key);
  if (z) { z.hidden = !z.hidden; saveZones(); render(); renderZonesList(); }
}
function setZoneColor(key, val) {
  const z = zoneByKey(key);
  if (z) { z.color = val; saveZones(); render(); renderZonesList(); }
}
function resetZoneColor(key) {
  const z = zoneByKey(key);
  if (z) { z.color = null; saveZones(); render(); renderZonesList(); }
}
function renderZonesList() {
  const list = document.getElementById('zonesList');
  list.innerHTML = zones.map(z =>
    '<div class="zone-row">' +
      '<span class="zone-row-emoji">' + (z.emoji || '🗂️') + '</span>' +
      '<span class="zone-row-label">' + escapeHtml(z.label) + '</span>' +
      '<input type="color" class="zone-color-pick" value="' + (z.color || TINT_HEX[tintIndex(z)]) + '" onchange="setZoneColor(\'' + z.key + '\', this.value)" title="Цвет раздела">' +
      (z.color ? '<button class="modal-btn secondary" onclick="resetZoneColor(\'' + z.key + '\')">Авто</button>' : '') +
      '<button class="modal-btn secondary" onclick="toggleZone(\'' + z.key + '\')">' + (z.hidden ? 'Показать' : 'Скрыть') + '</button>' +
    '</div>'
  ).join('');
}
function openZones() { renderZonesList(); document.getElementById('zonesModal').classList.add('open'); closeSbMobile(); }
function closeZones() { document.getElementById('zonesModal').classList.remove('open'); }
document.getElementById('addZoneBtn').addEventListener('click', () => {
  const label = capFirst(document.getElementById('newZoneLabel').value.trim());
  if (!label) { notify('Введите название раздела.'); return; }
  const emoji = document.getElementById('newZoneEmoji').value.trim() || '🗂️';
  zones.push({key: 'z' + Date.now(), label: label, emoji: emoji, hidden: false, tint: zones.length % TINT_COUNT, color: null});
  saveZones(); render(); renderZonesList();
  document.getElementById('newZoneLabel').value = '';
  document.getElementById('newZoneEmoji').value = '';
});
function createParsed(line, zoneKey) {
  const p = parseMagic(line);
  const text = capFirst(p.text || line.trim());
  tasks.push(migrateTask({id: Date.now() + Math.floor(Math.random()*10000), zone: zoneKey, text: text, done: false, created: new Date().toISOString(), doneAt: null, archived: false, due: p.due, tags: [], subtasks: [], subOpen: false}));
  clearLeakedSearch(text);
  saveTasks(); render();
  notify('Задача добавлена.', true);
}
function addPersonalNote(line) {
  const text = capFirst(line.trim());
  if (!text) return;
  personal.push(migratePersonalNote({id: Date.now() + Math.floor(Math.random()*10000), text: text, created: new Date().toISOString(), done: false, doneAt: null, subtasks: []}));
  savePersonal(); renderPersonal();
  notify('Заметка добавлена.', true);
}
function quickAddMany(lines) {
  if (currentPage === 'personal') {
    lines.forEach(l => addPersonalNote(l));
    return;
  }
  const other = zoneByKey('other');
  if (other && !other.hidden) {
    lines.forEach(l => createParsed(l, 'other'));
    return;
  }
  pendingQuickLines = lines;
  const wrap = document.getElementById('quickZoneList');
  wrap.innerHTML = zones.map(z =>
    '<button class="move-btn" onclick="chooseQuickZone(\'' + z.key + '\')">' + (z.emoji || '') + ' ' + escapeHtml(z.label) +
    (z.hidden ? ' (скрыт — появится при выборе)' : '') + '</button>'
  ).join('');
  document.getElementById('quickZoneModal').classList.add('open');
}
function chooseQuickZone(zoneKey) {
  const z = zoneByKey(zoneKey);
  if (!z) return;
  if (z.hidden) { z.hidden = false; saveZones(); }
  pendingQuickLines.forEach(l => createParsed(l, zoneKey));
  pendingQuickLines = [];
  document.getElementById('quickZoneModal').classList.remove('open');
}
function closeQuickZone() {
  document.getElementById('quickZoneModal').classList.remove('open');
  if (pendingQuickLines.length) {
    document.getElementById('quickAdd').value = pendingQuickLines.join('\n');
    pendingQuickLines = [];
  }
}
document.getElementById('quickAdd').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const text = e.target.value.trim();
    if (!text) return;
    e.target.value = ''; voiceBase = '';
    quickAddMany([text]);
  }
});
document.getElementById('quickAdd').addEventListener('paste', e => {
  const text = (e.clipboardData || window.clipboardData).getData('text');
  if (text && text.includes('\n')) {
    e.preventDefault();
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length) { document.getElementById('quickAdd').value = ''; voiceBase = ''; quickAddMany(lines); }
  }
});
// --- Итоги: отчёты по дням с редактированием ---
let lastResults = {md: ''};
function mondayOf(dateStr) {
  const x = parseLocal(dateStr);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return isoOf(x);
}
function setResultsPeriod(kind) {
  const today = todayISO();
  const d = parseLocal(today);
  if (kind === 'week') {
    const mon = mondayOf(today);
    const sun = isoOf(addDays(parseLocal(mon), 6));
    document.getElementById('resFrom').value = mon;
    document.getElementById('resTo').value = sun;
  } else if (kind === 'lastweek') {
    const mon = isoOf(addDays(parseLocal(mondayOf(today)), -7));
    const sun = isoOf(addDays(parseLocal(mon), 6));
    document.getElementById('resFrom').value = mon;
    document.getElementById('resTo').value = sun;
  } else if (kind === 'month') {
    const y = d.getFullYear(), m = d.getMonth();
    document.getElementById('resFrom').value = isoOf(new Date(y, m, 1));
    document.getElementById('resTo').value = isoOf(new Date(y, m + 1, 0));
  }
  renderResults();
}
function openResults() {
  setResultsPeriod('week');
  document.getElementById('resultsModal').classList.add('open');
  closeSbMobile();
}
function closeResults() { document.getElementById('resultsModal').classList.remove('open'); }
function reportDatesInPeriod(from, to){
  const set = new Set();
  dayReports.forEach(r => { if (r.date >= from && r.date <= to) set.add(r.date); });
  tasks.forEach(t => {
    if (t.done && t.doneAt) {
      const d = String(t.doneAt).slice(0,10);
      if (d >= from && d <= to) set.add(d);
    }
  });
  return Array.from(set).sort();
}
function buildReportsMd(from, to){
  const dates = reportDatesInPeriod(from, to);
  if (!dates.length) return '';
  let md = '# Отчёты за период ' + from + ' — ' + to + '\n\n';
  dates.forEach(d => {
    const p = parseLocal(d);
    md += '## ' + p.getDate() + ' ' + MONTHS_GEN[p.getMonth()] + ' ' + p.getFullYear() + '\n';
    const r = dayReportFor(d);
    if (r && htmlToPlain(r.text).trim()) md += htmlToPlain(r.text).trim() + '\n';
    const auto = autoLinesForDate(d);
    if (auto.length) md += 'Закрыто на доске:\n' + auto.join('\n') + '\n';
    md += '\n';
  });
  return md.trim() + '\n';
}
function renderResults() {
  const from = document.getElementById('resFrom').value;
  const to = document.getElementById('resTo').value;
  if (!from || !to) return;
  const dates = reportDatesInPeriod(from, to);
  const box = document.getElementById('resBody');
  if (!dates.length) {
    box.innerHTML = '<div class="empty">За период отчётов нет</div>';
    lastResults = {md: ''};
    return;
  }
  box.innerHTML = dates.map(d => {
    const p = parseLocal(d);
    const r = dayReportFor(d);
    const manual = (r && htmlToPlain(r.text).trim())
      ? '<div class="res-rep-body">' + sanitizeHtml(r.text) + '</div>'
      : '<div class="res-rep-body empty-inline">Отчёта пока нет — нажми «Изменить», чтобы добавить.</div>';
    const auto = autoLinesForDate(d);
    const autoHtml = auto.length ? '<div class="res-rep-auto">✅ ' + auto.map(l => escapeHtml(l.replace(/^- /,''))).join('<br>✅ ') + '</div>' : '';
    return '<div class="res-rep">' +
      '<div class="res-rep-head"><h5>' + p.getDate() + ' ' + MONTHS_GEN[p.getMonth()] + ' ' + p.getFullYear() + '</h5>' +
      '<button class="res-rep-edit" onclick="openDayReport(\'' + d + '\')">✏️ Изменить</button></div>' +
      manual + autoHtml +
    '</div>';
  }).join('');
  lastResults = {md: buildReportsMd(from, to)};
}
function downloadBlob(content, name, mime) {
  const blob = new Blob([content], {type: mime});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
function copyResultsMd() {
  if (!lastResults.md) { notify('За период отчётов нет — копировать нечего.'); return; }
  navigator.clipboard.writeText(lastResults.md).then(() => notify('Отчёты скопированы в буфер обмена!', true));
}
function downloadResultsMd() {
  const from = document.getElementById('resFrom').value;
  const to = document.getElementById('resTo').value;
  if (!lastResults.md) { notify('За период отчётов нет.'); return; }
  downloadBlob(lastResults.md, 'otchety-' + from + '-' + to + '.md', 'text/markdown;charset=utf-8');
  notify('Файл Markdown сохранён.', true);
}
document.getElementById('resFrom').addEventListener('change', renderResults);
document.getElementById('resTo').addEventListener('change', renderResults);
function backupDownload() {
  const data = JSON.stringify({tasks: tasks, zones: zones, personal: personal, daynotes: dayNotes, dayreports: dayReports}, null, 2);
  downloadBlob(data, 'darya-board-backup-' + todayISO() + '.json', 'application/json;charset=utf-8');
  notify('Резервная копия сохранена.', true);
}
function backupUploadClick() { document.getElementById('backupFile').click(); }
document.getElementById('backupFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then(raw => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks)) { notify('Файл не похож на резервную копию доски.'); return; }
      const count = parsed.tasks.length;
      const zonesBackup = Array.isArray(parsed.zones) && parsed.zones.length ? parsed.zones : null;
      const personalBackup = Array.isArray(parsed.personal) ? parsed.personal : null;
      const daynotesBackup = Array.isArray(parsed.daynotes) ? parsed.daynotes : null;
      const dayreportsBackup = Array.isArray(parsed.dayreports) ? parsed.dayreports : null;
      askConfirm('Заменить текущие данные данными из файла (' + count + ' задач)?', () => {
        tasks = parsed.tasks.map(migrateTask);
        if (zonesBackup) { zones = zonesBackup.map(migrateZone); localStorage.setItem(ZONES_KEY, JSON.stringify(zones)); }
        if (personalBackup) { personal = personalBackup.map(migratePersonalNote); localStorage.setItem(PERSONAL_KEY, JSON.stringify(personal)); }
        if (daynotesBackup) { dayNotes = daynotesBackup.map(migrateDayNote).filter(Boolean); localStorage.setItem(DAYNOTES_KEY, JSON.stringify(dayNotes)); }
        if (dayreportsBackup) { dayReports = dayreportsBackup.map(migrateDayReport).filter(Boolean); localStorage.setItem(DAYREPORTS_KEY, JSON.stringify(dayReports)); }
        saveTasks(); render();
        notify('Копия загружена.', true);
      }, 'Заменить');
    } catch (err) {
      notify('Не удалось прочитать файл: ' + err.message);
    }
    e.target.value = '';
  });
});
let dragState = null;
let justDragged = false;
function beginDrag() {
  if (!dragState) return;
  const note = dragState.note;
  const r = note.getBoundingClientRect();
  const ghost = note.cloneNode(true);
  ghost.className = 'drag-ghost';
  ghost.style.width = r.width + 'px';
  ghost.style.left = r.left + 'px';
  ghost.style.top = r.top + 'px';
  document.body.appendChild(ghost);
  dragState.ghost = ghost;
  dragState.ox = dragState.x0 - r.left;
  dragState.oy = dragState.y0 - r.top;
  dragState.lastX = dragState.x0;
  dragState.lastY = dragState.y0;
  dragState.active = true;
  note.classList.add('dragging-src');
  positionGhost(dragState.x0, dragState.y0);
}
function positionGhost(x, y) {
  if (!dragState || !dragState.ghost) return;
  dragState.ghost.style.left = (x - dragState.ox) + 'px';
  dragState.ghost.style.top = (y - dragState.oy) + 'px';
  let found = null;
  document.querySelectorAll('.zone').forEach(z => {
    const r = z.getBoundingClientRect();
    const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    z.classList.toggle('drop-hover', inside);
    if (inside) found = z;
  });
  dragState.zone = found;
}
function endDrag(commit) {
  if (!dragState) return;
  clearTimeout(dragState.timer);
  if (dragState.active) {
    if (dragState.ghost) dragState.ghost.remove();
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('drop-hover'));
    dragState.note.classList.remove('dragging-src');
    if (commit && dragState.zone) {
      const draggedId = dragState.id;
      const targetZone = dragState.zone.dataset.zone;
      const dropY = dragState.lastY;
      const t = tasks.find(x => x.id === draggedId);
      if (t && !t.archived) {
        const noteEls = Array.from(dragState.zone.querySelectorAll('.note'))
          .filter(el => Number(el.dataset.id) !== draggedId);
        let insertBeforeId = null;
        for (const el of noteEls) {
          const r = el.getBoundingClientRect();
          if (dropY < r.top + r.height / 2) { insertBeforeId = Number(el.dataset.id); break; }
        }
        const draggedIdx = tasks.findIndex(x => x.id === draggedId);
        if (draggedIdx !== -1) {
          const draggedTask = tasks.splice(draggedIdx, 1)[0];
          draggedTask.zone = targetZone;
          if (insertBeforeId !== null) {
            const refIdx = tasks.findIndex(x => x.id === insertBeforeId);
            tasks.splice(refIdx === -1 ? tasks.length : refIdx, 0, draggedTask);
          } else {
            let lastIdx = -1;
            for (let i = 0; i < tasks.length; i++) {
              if (tasks[i].zone === targetZone && !tasks[i].archived) lastIdx = i;
            }
            tasks.splice(lastIdx + 1, 0, draggedTask);
          }
          saveTasks();
        }
      }
    }
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    render();
  }
  dragState = null;
}
document.addEventListener('pointerdown', e => {
  const note = e.target.closest ? e.target.closest('.note') : null;
  if (!note) return;
  if (e.target.closest && e.target.closest('input,button,textarea,.subtask,.sub-edit,.sub-edit-wrap')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  dragState = {id: Number(note.dataset.id), x0: e.clientX, y0: e.clientY, active: false, type: e.pointerType, note: note, timer: null, ghost: null, zone: null, ox: 0, oy: 0, lastX: e.clientX, lastY: e.clientY};
  if (e.pointerType !== 'mouse') {
    dragState.timer = setTimeout(() => { if (dragState && !dragState.active) beginDrag(); }, 280);
  }
});
document.addEventListener('pointermove', e => {
  if (!dragState) return;
  if (!dragState.active) {
    const dx = e.clientX - dragState.x0, dy = e.clientY - dragState.y0;
    if (Math.hypot(dx, dy) > 6) {
      if (dragState.type === 'mouse') beginDrag();
      else { clearTimeout(dragState.timer); dragState = null; return; }
    } else return;
  }
  dragState.lastX = e.clientX;
  dragState.lastY = e.clientY;
  positionGhost(e.clientX, e.clientY);
});
document.addEventListener('pointerup', () => endDrag(true));
document.addEventListener('pointercancel', () => endDrag(false));
document.addEventListener('touchmove', e => { if (dragState && dragState.active) e.preventDefault(); }, {passive: false});
document.addEventListener('contextmenu', e => { if (dragState) e.preventDefault(); });
document.addEventListener('click', e => {
  if (justDragged) { e.stopPropagation(); e.preventDefault(); justDragged = false; }
}, true);
function openSettings(hint) {
  if (hint) document.getElementById('settingsHint').textContent = hint;
  else document.getElementById('settingsHint').textContent = 'Токен хранится только в этом браузере и нужен для записи изменений в board.json на GitHub.';
  const wrap = document.getElementById('tokenInputWrap');
  wrap.innerHTML = '';
  const inp = document.createElement('input');
  inp.type = 'password';
  inp.id = 'tokenInput';
  inp.name = 'darya_token';
  inp.placeholder = 'github_pat_...';
  inp.autocomplete = 'new-password';
  inp.value = getToken();
  wrap.appendChild(inp);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveSettings(); });
  document.getElementById('settingsModal').classList.add('open');
  setTimeout(() => inp.focus(), 0);
  closeSbMobile();
}
function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
  const wrap = document.getElementById('tokenInputWrap');
  if (wrap) wrap.innerHTML = '';
}
function saveSettings() {
  const inp = document.getElementById('tokenInput');
  const v = inp ? inp.value.trim() : '';
  if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY);
  closeSettings();
  schedulePush();
}
document.getElementById('logoBtn').addEventListener('click', () => openSettings());
document.getElementById('cancelSettings').addEventListener('click', closeSettings);
document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('cancelAdd').addEventListener('click', closeAddRequest);
function closeAddRequest(){
  if (addEditor.plain() !== '') {
    askConfirm('Закрыть без сохранения? Введённый текст будет потерян.', () => { document.getElementById('addModal').classList.remove('open'); addEditor.destroy(); notify('Закрыто без сохранения.'); }, 'Закрыть без сохранения');
  } else {
    document.getElementById('addModal').classList.remove('open');
    addEditor.destroy();
  }
}
document.getElementById('confirmAdd').addEventListener('click', () => {
  const val = addEditor.get();
  const plain = htmlToPlain(val).trim();
  if (!plain) return;
  const zoneKey = currentAddZone || 'other';
  const p = parseMagic(plain);
  let text = val;
  if (p.due) text = capFirst(p.text || plain);
  tasks.push(migrateTask({id: Date.now(), zone: zoneKey, text: text, done: false, created: new Date().toISOString(), doneAt: null, archived: false, due: p.due, tags: [], subtasks: [], subOpen: false}));
  clearLeakedSearch(plain);
  saveTasks(); render();
  document.getElementById('addModal').classList.remove('open');
  addEditor.destroy();
  notify('Задача добавлена.', true);
});
// Закрытие модалок — ТОЛЬКО кнопками: ни клик вне окна, ни Esc не закрывают.
document.getElementById('quickZoneModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeQuickZone();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    if (document.getElementById('editModal').classList.contains('open')) { e.preventDefault(); saveEdit(); }
    else if (document.getElementById('dayReportModal').classList.contains('open')) { e.preventDefault(); saveDayReport(); }
    else if (document.getElementById('addModal').classList.contains('open')) { e.preventDefault(); document.getElementById('confirmAdd').click(); }
  }
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
clearTransientInputs();
switchPage(currentPage);
render();
if (!getToken()) openSettings('Это окно появляется один раз на каждом устройстве. Вставь токен доступа, чтобы доска синхронизировалась через облако. Позже его можно открыть кликом по логотипу.');
cloudRead()
  .then(data => {
    if (data && Array.isArray(data.tasks)) {
      const cloudTasks = data.tasks.map(migrateTask);
      if (cloudTasks.length > 0) {
        tasks = cloudTasks;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        localStorage.setItem(INIT_KEY, '1');
      }
    }
  })
  .catch(() => {})
  .then(() => {
    suppressPush = false;
    sweepDoneToArchive();
    render();
  });
