/* ============================================================
   FOCUS FLIGHT — таймер-полёт с коллекционированием аэропортов
   Автономный модуль. Обёртывает switchPage, не трогает app.js.
   ============================================================ */

(function () {
  'use strict';

  const FLIGHT_KEYS = {
    HOME:    'flight_home_airport',
    HISTORY: 'flight_history',
  };
  const DURATION_MIN = 15;
  const DURATION_MAX = 12 * 60;
  const SPEED_KMH = 800;

  const state = {
    airports: [], visitedCodes: new Set(),
    home: null, destination: null, pendingDestination: null,
    routeCoords: [], totalSeconds: 90 * 60, remainingSeconds: 0,
    timerId: null, map: null, planeMarker: null, routeLine: null,
    startMarkers: [], clusterGroup: null, markerByCode: {},
    mode: 'auto', initialized: false, distractions: 0,
  };

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }
  function hav(a, b) {
    const R = 6371, toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function bearing(la1, lo1, la2, lo2) {
    const toRad = d => d * Math.PI / 180, toDeg = r => r * 180 / Math.PI;
    const p1 = toRad(la1), p2 = toRad(la2), dl = toRad(lo2 - lo1);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
  function fmtMin(min) {
    if (min < 60) return `${Math.round(min)} мин`;
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
  }

  function sliderToMinutes(v) {
    const t = v / 1000;
    return Math.round(DURATION_MIN * Math.pow(DURATION_MAX / DURATION_MIN, t));
  }
  function minutesToSlider(m) {
    const c = Math.max(DURATION_MIN, Math.min(DURATION_MAX, m));
    return Math.round(1000 * Math.log(c / DURATION_MIN) /
                      Math.log(DURATION_MAX / DURATION_MIN));
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(FLIGHT_KEYS.HISTORY) || '[]'); }
    catch { return []; }
  }
  function loadVisitedCodes() {
    const set = new Set();
    loadHistory().forEach(f => {
      if (f.from) set.add(f.from);
      if (f.to) set.add(f.to);
    });
    return set;
  }

  function airportIcon(visited) {
    const color = visited ? '#3A5F8A' : '#8892a6';
    const size  = visited ? 10 : 7;
    return L.divIcon({
      className: 'airport-marker',
      html: `<div style="
        background:${color};width:${size}px;height:${size}px;border-radius:50%;
        border:1.5px solid rgba(255,255,255,${visited ? 0.9 : 0.4});
        ${visited ? 'box-shadow:0 0 8px ' + color + ';' : ''}"></div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
  }
  function planeIcon(deg) {
    return L.divIcon({
      className: 'plane-icon',
      html: `<svg width="32" height="32" viewBox="0 0 24 24"
        style="transform:rotate(${deg}deg);transition:transform 1s linear;">
        <path fill="#3A5F8A" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>
      </svg>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    });
  }

  function rebuildMarkers() {
    if (!state.clusterGroup) return;
    state.clusterGroup.clearLayers();
    state.markerByCode = {};

    const markers = state.airports.map(a => {
      const visited = state.visitedCodes.has(a.code);
      const marker = L.marker([a.lat, a.lon], { icon: airportIcon(visited) });
      marker.airport = a;

      const km = state.home ? Math.round(hav(state.home, a)) : 0;
      const min = Math.round(km / SPEED_KMH * 60);
      const isHome = state.home && a.code === state.home.code;

      let html = `<b>${a.code}</b> — ${a.city}`;
      if (a.country) html += `<br><small>${a.country}</small>`;
      if (visited)   html += `<br><small style="color:#3A5F8A">✓ Посещён</small>`;
      if (isHome)    html += `<br><small style="color:#e0a020">🏠 Домашний</small>`;
      else {
        html += `<br><small>${km} км · ~${fmtMin(min)}</small>`;
        html += `<br><button class="fly-here-btn" data-code="${a.code}">Лететь сюда</button>`;
      }
      marker.bindPopup(html);
      state.markerByCode[a.code] = marker;
      return marker;
    });

    state.clusterGroup.addLayers(markers);
  }

  async function initFlightModule() {
    if (state.initialized) return;
    state.initialized = true;

    try {
      const res = await fetch('airports.json');
      state.airports = await res.json();
    } catch (e) {
      console.warn('FocusFlight: fallback-аэропорты', e);
      state.airports = [
        { code: 'SVO', city: 'Москва', lat: 55.9726, lon: 37.4146 },
        { code: 'LHR', city: 'London', lat: 51.47, lon: -0.4543 },
        { code: 'JFK', city: 'New York', lat: 40.6413, lon: -73.7781 },
      ];
    }

    state.visitedCodes = loadVisitedCodes();
    const savedHome = localStorage.getItem(FLIGHT_KEYS.HOME);
    state.home = state.airports.find(a => a.code === savedHome)
              || state.airports.find(a => a.code === 'SVO')
              || state.airports[0];

    state.map = L.map('map', { zoomControl: true })
                 .setView([state.home.lat, state.home.lon], 3);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO', maxZoom: 18,
    }).addTo(state.map);

    state.clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50, spiderfyOnMaxZoom: true,
      showCoverageOnHover: false, disableClusteringAtZoom: 7,
    });
    state.map.addLayer(state.clusterGroup);
    rebuildMarkers();

    state.map.on('popupopen', e => {
      const btn = e.popup.getElement().querySelector('.fly-here-btn');
      if (btn) btn.addEventListener('click', () => selectManually(btn.dataset.code));
    });

    const slider = document.getElementById('flightDuration');
    const label  = document.getElementById('flightDurationLabel');
    const initialMin = 90;
    slider.value = minutesToSlider(initialMin);
    label.textContent = fmtMin(initialMin);
    state.totalSeconds = initialMin * 60;
    slider.addEventListener('input', () => {
      const m = sliderToMinutes(+slider.value);
      label.textContent = fmtMin(m);
      state.totalSeconds = m * 60;
    });

    document.querySelectorAll('.flight-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    document.getElementById('startFlightBtn').addEventListener('click', startFlight);
    document.getElementById('abortFlightBtn').addEventListener('click', abortFlight);
    document.getElementById('confirmManualBtn').addEventListener('click', confirmManual);
    document.getElementById('cancelManualBtn').addEventListener('click', cancelManual);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.timerId) state.distractions++;
    });

    renderHistory();
    renderStats();
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.flight-mode-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === mode));
    document.getElementById('autoControls').style.display =
      mode === 'auto' ? 'flex' : 'none';
    document.getElementById('manualControls').style.display =
      mode === 'manual' ? 'flex' : 'none';
    document.getElementById('manualConfirm').style.display = 'none';
    state.pendingDestination = null;
  }

  function pickAuto() {
    const targetKm = (state.totalSeconds / 3600) * SPEED_KMH;
    const unvisited = state.airports.filter(a =>
      a.code !== state.home.code && !state.visitedCodes.has(a.code));
    if (unvisited.length === 0) {
      alert('🎉 Вы посетили все аэропорты! Сбросьте прогресс, чтобы начать заново.');
      return null;
    }
    let best = null, bestDiff = Infinity;
    for (const a of unvisited) {
      const diff = Math.abs(hav(state.home, a) - targetKm);
      if (diff < bestDiff) { bestDiff = diff; best = a; }
    }
    return best;
  }

  function selectManually(code) {
    if (state.timerId) return;
    const ap = state.airports.find(a => a.code === code);
    if (!ap || ap.code === state.home.code) return;
    state.pendingDestination = ap;

    const km = Math.round(hav(state.home, ap));
    const min = Math.round(km / SPEED_KMH * 60);
    document.getElementById('manualConfirm').style.display = 'flex';
    document.getElementById('manualRoute').textContent =
      `${state.home.code} → ${ap.code}`;
    document.getElementById('manualCity').textContent = ap.city;
    document.getElementById('manualDistance').textContent = `${km} км`;
    document.getElementById('manualDuration').textContent = fmtMin(min);
    state.map.closePopup();
  }
  function confirmManual() {
    if (!state.pendingDestination) return;
    const km = hav(state.home, state.pendingDestination);
    state.totalSeconds = Math.round(km / SPEED_KMH * 60) * 60;
    state.destination = state.pendingDestination;
    launch();
  }
  function cancelManual() {
    state.pendingDestination = null;
    document.getElementById('manualConfirm').style.display = 'none';
  }

  function startFlight() {
    if (state.mode === 'auto') {
      state.destination = pickAuto();
      if (!state.destination) return;
    } else {
      if (!state.pendingDestination) {
        alert('Кликните по аэропорту на карте, чтобы выбрать пункт назначения');
        return;
      }
      return;
    }
    launch();
  }

  function launch() {
    document.getElementById('flightSetup').style.display = 'none';
    document.getElementById('manualConfirm').style.display = 'none';
    state.distractions = 0;
    clearLayers();

    state.routeCoords = routeCoords(state.home, state.destination);
    state.routeLine = L.Polyline.Arc(
      [state.home.lat, state.home.lon],
      [state.destination.lat, state.destination.lon],
      { color: '#3A5F8A', weight: 3, dashArray: '8,8', vertices: 200, offset: 10 }
    ).addTo(state.map);

    state.startMarkers = [
      L.marker([state.home.lat, state.home.lon]).addTo(state.map)
        .bindPopup(`<b>${state.home.code}</b><br>${state.home.city}`),
      L.marker([state.destination.lat, state.destination.lon]).addTo(state.map)
        .bindPopup(`<b>${state.destination.code}</b><br>${state.destination.city}`),
    ];

    state.planeMarker = L.marker(state.routeCoords[0], { icon: planeIcon(0) })
                         .addTo(state.map);
    state.map.fitBounds(state.routeLine.getBounds(), { padding: [60, 60] });

    document.getElementById('fromCode').textContent = state.home.code;
    document.getElementById('toCode').textContent = state.destination.code;
    document.getElementById('flightTimer').textContent = fmtTime(state.totalSeconds);
    document.getElementById('flightProgressFill').style.width = '0%';

    const audio = document.getElementById('cabinSound');
    if (audio) { audio.volume = 0.3; audio.play().catch(() => {}); }

    state.remainingSeconds = state.totalSeconds;
    state.timerId = setInterval(tick, 1000);
  }

  function tick() {
    state.remainingSeconds--;
    if (state.remainingSeconds <= 0) return finish();

    document.getElementById('flightTimer').textContent =
      fmtTime(state.remainingSeconds);
    const p = 1 - state.remainingSeconds / state.totalSeconds;
    document.getElementById('flightProgressFill').style.width = `${p * 100}%`;

    const total = state.routeCoords.length - 1;
    const idx = Math.min(Math.floor(p * total), total - 1);
    const segP = p * total - idx;
    const [la1, lo1] = state.routeCoords[idx];
    const [la2, lo2] = state.routeCoords[idx + 1];
    state.planeMarker.setLatLng([la1 + (la2 - la1) * segP, lo1 + (lo2 - lo1) * segP]);
    state.planeMarker.setIcon(planeIcon(bearing(la1, lo1, la2, lo2)));
  }

  function finish() {
    clearInterval(state.timerId); state.timerId = null;
    const audio = document.getElementById('cabinSound');
    if (audio) audio.pause();

    const km = Math.round(hav(state.home, state.destination));
    const history = loadHistory();
    history.push({
      from: state.home.code, to: state.destination.code,
      fromCity: state.home.city, toCity: state.destination.city,
      minutes: state.totalSeconds / 60, distance: km,
      distractions: state.distractions, date: new Date().toISOString(),
    });
    localStorage.setItem(FLIGHT_KEYS.HISTORY, JSON.stringify(history));

    state.visitedCodes.add(state.destination.code);
    state.visitedCodes.add(state.home.code);
    localStorage.setItem(FLIGHT_KEYS.HOME, state.destination.code);
    state.home = state.destination;

    const visited = state.visitedCodes.size, total = state.airports.length;
    const pct = Math.round(visited / total * 100);
    const distr = state.distractions;
    alert(
      `Приземление! ✈️\n\n${state.destination.city} (${state.destination.code})\n` +
      `${km} км за ${fmtMin(Math.round(state.totalSeconds / 60))}\n` +
      (distr > 0 ? `Отвлечений: ${distr}\n` : `Отвлечений не было ✓\n`) +
      `\nПрогресс: ${visited} / ${total} аэропортов (${pct}%)`
    );

    resetUI(); rebuildMarkers(); renderHistory(); renderStats();
  }

  function abortFlight() {
    if (!state.timerId) return;
    if (!confirm('Прервать полёт? Прогресс не сохранится.')) return;
    clearInterval(state.timerId); state.timerId = null;
    const audio = document.getElementById('cabinSound');
    if (audio) audio.pause();
    resetUI();
  }

  function routeCoords(from, to) {
    const arc = L.Polyline.Arc([from.lat, from.lon], [to.lat, to.lon], { vertices: 200 });
    return arc.getLatLngs().map(ll => [ll.lat, ll.lng]);
  }
  function clearLayers() {
    if (state.routeLine)    { state.map.removeLayer(state.routeLine); state.routeLine = null; }
    if (state.planeMarker)  { state.map.removeLayer(state.planeMarker); state.planeMarker = null; }
    state.startMarkers.forEach(m => state.map.removeLayer(m));
    state.startMarkers = [];
  }
  function resetUI() {
    document.getElementById('flightSetup').style.display = 'flex';
    document.getElementById('flightTimer').textContent = fmtTime(state.totalSeconds);
    document.getElementById('flightProgressFill').style.width = '0%';
    document.getElementById('manualConfirm').style.display = 'none';
    state.pendingDestination = null;
    clearLayers();
  }

  function renderHistory() {
    const c = document.getElementById('flightHistoryList');
    if (!c) return;
    const h = loadHistory().slice().reverse();
    if (h.length === 0) { c.innerHTML = '<div class="fh-empty">Ещё нет завершённых полётов</div>'; return; }
    c.innerHTML = h.slice(0, 50).map(f => {
      const d = new Date(f.date);
      const ds = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      const ts = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return `<div class="fh-row">
        <div class="fh-route">${f.from} → ${f.to}</div>
        <div class="fh-cities">${f.fromCity || ''} → ${f.toCity || ''}</div>
        <div class="fh-meta">${fmtMin(Math.round(f.minutes))} · ${f.distance} км</div>
        <div class="fh-date">${ds}, ${ts}</div>
      </div>`;
    }).join('');
  }
  function renderStats() {
    const c = document.getElementById('flightStats');
    if (!c) return;
    const h = loadHistory();
    const totalMin = h.reduce((s, f) => s + (f.minutes || 0), 0);
    const totalKm  = h.reduce((s, f) => s + (f.distance || 0), 0);
    const visited  = state.visitedCodes.size;
    const total    = state.airports.length;
    const pct      = total > 0 ? Math.round(visited / total * 100) : 0;
    c.innerHTML = `
      <div class="fs-cell"><div class="fs-num">${h.length}</div><div class="fs-lbl">полётов</div></div>
      <div class="fs-cell"><div class="fs-num">${Math.round(totalMin / 60)}</div><div class="fs-lbl">часов</div></div>
      <div class="fs-cell"><div class="fs-num">${totalKm.toLocaleString('ru-RU')}</div><div class="fs-lbl">км</div></div>
      <div class="fs-cell"><div class="fs-num">${visited}/${total}</div><div class="fs-lbl">аэропортов (${pct}%)</div></div>`;
  }

  function wrapSwitchPage() {
    const flightPage = document.getElementById('flightPage');
    if (!flightPage) return;

    const hideAll = () => {
      document.querySelectorAll('#boardPage, #personalPage, #flightPage')
        .forEach(el => el && el.classList.add('page-hidden'));
    };
    const show = id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('page-hidden');
    };

    const original = window.switchPage;
    window.switchPage = function (page) {
      hideAll();
      if (typeof original === 'function') {
        try { original(page); } catch (e) { console.warn(e); }
      }
      if (page === 'flight') {
        show('flightPage');
        initFlightModule();
      }
    };
  }

  window.FocusFlight = {
    init: initFlightModule,
    isActive: () => state.timerId !== null,
    abort: abortFlight,
    getHistory: loadHistory,
    resetProgress: () => {
      if (!confirm('Сбросить всю историю полётов и прогресс?')) return;
      localStorage.removeItem(FLIGHT_KEYS.HISTORY);
      localStorage.removeItem(FLIGHT_KEYS.HOME);
      location.reload();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrapSwitchPage);
  } else {
    wrapSwitchPage();
  }
})();
