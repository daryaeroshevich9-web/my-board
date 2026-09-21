(function(){
'use strict';
var mem = {};
var storage;
try {
  localStorage.setItem('__t','1'); localStorage.removeItem('__t');
  storage = localStorage;
} catch(e) {
  console.warn('localStorage недоступен');
  storage = {
    getItem: function(k){ return k in mem ? mem[k] : null; },
    setItem: function(k,v){ mem[k] = String(v); },
    removeItem: function(k){ delete mem[k]; }
  };
}
var FALLBACK = [
  ["SVO","Москва","RU",55.9726,37.4146],["LED","Санкт-Петербург","RU",59.8003,30.2625],
  ["KZN","Казань","RU",55.6062,49.2787],["AER","Сочи","RU",43.4499,39.9566],
  ["OVB","Новосибирск","RU",55.0126,82.6507],["VVO","Владивосток","RU",43.399,132.1482],
  ["KHV","Хабаровск","RU",48.528,135.1883],["KGD","Калининград","RU",54.89,20.5926],
  ["TAS","Ташкент","UZ",41.2579,69.2812],["ALA","Алматы","KZ",43.3521,77.0405],
  ["KBP","Киев","UA",50.345,30.8947],["MSQ","Минск","BY",53.8825,28.0307],
  ["TBS","Тбилиси","GE",41.6692,44.9547],["EVN","Ереван","AM",40.1473,44.3959],
  ["GYD","Баку","AZ",40.4675,50.0467],["LHR","London","GB",51.47,-0.4543],
  ["CDG","Paris","FR",49.0097,2.5479],["FRA","Frankfurt","DE",50.0379,8.5622],
  ["MUC","Munich","DE",48.3537,11.775],["BER","Berlin","DE",52.3667,13.5033],
  ["AMS","Amsterdam","NL",52.3105,4.7683],["BRU","Brussels","BE",50.9014,4.4844],
  ["ZRH","Zurich","CH",47.4647,8.5492],["VIE","Vienna","AT",48.1103,16.5697],
  ["MAD","Madrid","ES",40.4719,-3.5626],["BCN","Barcelona","ES",41.2971,2.0785],
  ["LIS","Lisbon","PT",38.7813,-9.1359],["FCO","Rome","IT",41.8003,12.2389],
  ["MXP","Milan","IT",45.6306,8.7281],["ATH","Athens","GR",37.9364,23.9445],
  ["IST","Istanbul","TR",41.2753,28.7519],["CPH","Copenhagen","DK",55.6181,12.6561],
  ["ARN","Stockholm","SE",59.6519,17.9186],["OSL","Oslo","NO",60.1939,11.1004],
  ["HEL","Helsinki","FI",60.3172,24.9633],["KEF","Reykjavik","IS",63.985,-22.6056],
  ["WAW","Warsaw","PL",52.1657,20.9671],["PRG","Prague","CZ",50.1008,14.26],
  ["BUD","Budapest","HU",47.4369,19.2556],["OTP","Bucharest","RO",44.5711,26.085],
  ["DXB","Dubai","AE",25.2532,55.3657],["DOH","Doha","QA",25.2731,51.608],
  ["TLV","Tel Aviv","IL",32.0114,34.8867],["CAI","Cairo","EG",30.1219,31.4056],
  ["HKG","Hong Kong","HK",22.308,113.9185],["PEK","Beijing","CN",40.0799,116.6031],
  ["PVG","Shanghai","CN",31.1443,121.8083],["CAN","Guangzhou","CN",23.3924,113.2988],
  ["NRT","Tokyo Narita","JP",35.772,140.3929],["HND","Tokyo Haneda","JP",35.5494,139.7798],
  ["KIX","Osaka","JP",34.4273,135.2442],["ICN","Seoul","KR",37.4602,126.4407],
  ["TPE","Taipei","TW",25.0777,121.2328],["SIN","Singapore","SG",1.3644,103.9915],
  ["BKK","Bangkok","TH",13.69,100.7501],["KUL","Kuala Lumpur","MY",2.7456,101.7099],
  ["CGK","Jakarta","ID",-6.1256,106.6559],["MNL","Manila","PH",14.5086,121.0194],
  ["DEL","Delhi","IN",28.5562,77.1],["BOM","Mumbai","IN",19.0887,72.8679],
  ["BLR","Bangalore","IN",13.1989,77.7069],["CMB","Colombo","LK",7.1808,79.8841],
  ["JNB","Johannesburg","ZA",-26.1392,28.246],["CPT","Cape Town","ZA",-33.9689,18.6017],
  ["NBO","Nairobi","KE",-1.3192,36.9278],["ADD","Addis Ababa","ET",8.9779,38.7993],
  ["LOS","Lagos","NG",6.5774,3.3212],["CMN","Casablanca","MA",33.3675,-7.59],
  ["JFK","New York","US",40.6413,-73.7781],["LAX","Los Angeles","US",33.9416,-118.4085],
  ["SFO","San Francisco","US",37.6213,-122.379],["ORD","Chicago","US",41.9742,-87.9073],
  ["ATL","Atlanta","US",33.6407,-84.4277],["DFW","Dallas","US",32.8998,-97.0403],
  ["DEN","Denver","US",39.8561,-104.6737],["SEA","Seattle","US",47.4502,-122.3088],
  ["BOS","Boston","US",42.3656,-71.0096],["MIA","Miami","US",25.7959,-80.287],
  ["IAD","Washington","US",38.9531,-77.4565],["LAS","Las Vegas","US",36.084,-115.1537],
  ["HNL","Honolulu","US",21.3187,-157.9225],["YYZ","Toronto","CA",43.6777,-79.6248],
  ["YVR","Vancouver","CA",49.1967,-123.1815],["YUL","Montreal","CA",45.4706,-73.7408],
  ["MEX","Mexico City","MX",19.4363,-99.0721],["CUN","Cancun","MX",21.0365,-86.8771],
  ["GRU","Sao Paulo","BR",-23.4356,-46.4731],["GIG","Rio de Janeiro","BR",-22.8099,-43.2506],
  ["EZE","Buenos Aires","AR",-34.8222,-58.5358],["SCL","Santiago","CL",-33.393,-70.7858],
  ["LIM","Lima","PE",-12.0219,-77.1143],["BOG","Bogota","CO",4.7016,-74.1469],
  ["SYD","Sydney","AU",-33.9399,151.1753],["MEL","Melbourne","AU",-37.6733,144.8433],
  ["BNE","Brisbane","AU",-27.3842,153.1175],["PER","Perth","AU",-31.9403,115.9669],
  ["AKL","Auckland","NZ",-37.0082,174.785],["CHC","Christchurch","NZ",-43.4894,172.5322],
  ["KTM","Kathmandu","NP",27.6966,85.3591],["DAC","Dhaka","BD",23.8433,90.3978],
  ["SGN","Ho Chi Minh","VN",10.8188,106.652],["HAN","Hanoi","VN",21.2212,105.8072],
  ["DPS","Bali","ID",-8.7482,115.1672],["HKT","Phuket","TH",8.1132,98.3169],
  ["RAK","Marrakesh","MA",31.6069,-8.0363],["TUN","Tunis","TN",36.8511,10.2272]
].map(function(r){return {code:r[0],city:r[1],country:r[2],lat:r[3],lon:r[4]};});
var CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
var SPEED_KMH = 800;
var DUR_MIN = 15, DUR_MAX = 12*60;
var LS = {airports:'ff_airports_v1',visited:'ff_visited_v1',home:'ff_home_v1',history:'ff_history_v1',active:'ff_active_v1'};
var state = {
  airports: [], byCode: {}, visited: new Set(),
  home: null, durationMin: 90, history: [],
  timerId: null, activeFlight: null,
  sortMode: 'time', onlyNew: true,
  selected: null, searchQuery: '', allOptions: [],
  view: null, lastMapPts: null
};
var FF_CSS = '' +
'#flightPage input.ff-search{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font:inherit;font-size:14px;background:#fff;color:var(--text);margin-bottom:8px}' +
'#flightPage input.ff-search:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring)}' +
'#flightPage .item.selected{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);background:#fff}' +
'.ff-preview{margin-top:12px;padding:14px;border:1px solid var(--accent);border-radius:12px;background:var(--accent-ring)}' +
'.ff-preview-route{font-size:15px;font-weight:700;color:var(--text);text-align:center}' +
'.ff-preview-sub{font-size:12px;color:var(--text-secondary);text-align:center;margin-top:4px}' +
'.ff-preview-actions{display:flex;gap:8px;justify-content:center;margin-top:12px}' +
'.ff-menu{position:fixed;top:10px;left:10px;z-index:250;width:40px;height:40px;border:1px solid var(--border);border-radius:10px;background:var(--card);display:none;align-items:center;justify-content:center;font-size:18px;cursor:pointer}' +
'body.ff-flight .topbar{display:none!important}' +
'@media(max-width:720px){body.ff-flight .ff-menu{display:flex}}';
function $(id){ return document.getElementById(id); }
function hideAll(){ ['loader','setup','results','flight','done'].forEach(function(i){ var el=$(i); if(el) el.classList.add('hidden'); }); }
function show(id){ var el=$(id); if(el) el.classList.remove('hidden'); }
var DN = null;
try { DN = new Intl.DisplayNames(['ru'], {type:'region'}); } catch(e){}
var countryCache = {};
function countryName(code){
  if(!code) return '';
  if(countryCache[code]) return countryCache[code];
  var name = code;
  if(DN){ try { name = DN.of(code) || code; } catch(e){} }
  countryCache[code] = name;
  return name;
}
function hav(a,b){
  var R=6371, toRad=function(d){return d*Math.PI/180;};
  var dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
  var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return 2*R*Math.asin(Math.sqrt(x));
}
function fmtMin(m){
  if(m<60) return Math.round(m)+' мин';
  var h=Math.floor(m/60), r=Math.round(m%60);
  return r===0 ? h+' ч' : h+' ч '+r+' мин';
}
function fmtTime(sec){
  var h=Math.floor(sec/3600);
  var m=Math.floor((sec%3600)/60).toString().padStart(2,'0');
  var s=(sec%60).toString().padStart(2,'0');
  return h>0 ? h+':'+m+':'+s : m+':'+s;
}
function sliderMax(){
  var s = $('duration');
  var m = s ? parseInt(s.max, 10) : 0;
  return (isFinite(m) && m > 0) ? m : 1000;
}
function sliderToMinutes(v){
  var max = sliderMax();
  return Math.round(DUR_MIN * Math.pow(DUR_MAX / DUR_MIN, v / max));
}
function minutesToSlider(m){
  var max = sliderMax();
  var c = Math.max(DUR_MIN, Math.min(DUR_MAX, m));
  return Math.round(max * Math.log(c / DUR_MIN) / Math.log(DUR_MAX / DUR_MIN));
}
function parseCSV(t){
  var rows=[],row=[],field='',inQ=false,i=0;
  while(i<t.length){
    var c=t[i];
    if(inQ){
      if(c==='"'){ if(t[i+1]==='"'){field+='"';i+=2;continue;} inQ=false;i++;continue; }
      field+=c;i++;continue;
    }
    if(c==='"'){ inQ=true;i++;continue; }
    if(c===','){ row.push(field);field='';i++;continue; }
    if(c==='\r'){ i++;continue; }
    if(c==='\n'){ row.push(field);rows.push(row);row=[];field='';i++;continue; }
    field+=c;i++;
  }
  if(field.length||row.length){ row.push(field);rows.push(row); }
  return rows;
}
function buildByCode(arr){ var m={}; for(var i=0;i<arr.length;i++) m[arr[i].code]=arr[i]; return m; }
function startWithFallback(){
  state.airports = FALLBACK.slice();
  state.byCode = buildByCode(state.airports);
  bootstrap();
  tryLoadFull();
}
function tryLoadFull(){
  var cached = storage.getItem(LS.airports);
  if(cached){
    try{ var arr = JSON.parse(cached); if(arr && arr.length>500){ applyFull(arr); return; } }catch(e){}
  }
  if(typeof fetch !== 'function') return;
  fetch(CSV_URL).then(function(res){
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.text();
  }).then(function(text){
    var rows = parseCSV(text);
    if(!rows.length) throw new Error('empty CSV');
    var h = rows[0].map(function(s){return s.trim();});
    var idx = {type:h.indexOf('type'),iata:h.indexOf('iata_code'),name:h.indexOf('name'),
      city:h.indexOf('municipality'),country:h.indexOf('iso_country'),
      lat:h.indexOf('latitude_deg'),lon:h.indexOf('longitude_deg')};
    var out=[];
    for(var i=1;i<rows.length;i++){
      var r=rows[i];
      if(r[idx.type]!=='large_airport') continue;
      var code=(r[idx.iata]||'').trim();
      if(code.length<3) continue;
      var lat=parseFloat(r[idx.lat]), lon=parseFloat(r[idx.lon]);
      if(!isFinite(lat)||!isFinite(lon)) continue;
      out.push({code:code,city:(r[idx.city]||'').trim()||(r[idx.name]||'').trim(),
        country:(r[idx.country]||'').trim(),lat:Math.round(lat*10000)/10000,lon:Math.round(lon*10000)/10000});
    }
    if(out.length<500) throw new Error('too few: '+out.length);
    out.sort(function(a,b){ return a.code.localeCompare(b.code); });
    try { storage.setItem(LS.airports, JSON.stringify(out)); } catch(e){}
    applyFull(out);
  }).catch(function(e){
    console.warn('Полный список не загружен, работаю на 100 базовых:', e.message);
  });
}
function applyFull(arr){
  state.airports = arr;
  state.byCode = buildByCode(arr);
  if(!state.home || !state.byCode[state.home.code]){
    var hc = storage.getItem(LS.home);
    state.home = state.byCode[hc] || state.airports[0];
  }
  renderSetup();
  renderStats();
}
function bootstrap(){
  try { state.visited = new Set(JSON.parse(storage.getItem(LS.visited) || '[]')); } catch(e){}
  try { state.history = JSON.parse(storage.getItem(LS.history) || '[]'); } catch(e){}
  var hc = storage.getItem(LS.home);
  state.home = state.byCode[hc] || state.airports[0];
  var activeSaved = storage.getItem(LS.active);
  if(activeSaved){
    try {
      var af = JSON.parse(activeSaved);
      var from = state.byCode[af.fromCode], to = state.byCode[af.toCode];
      if(from && to){
        if(af.paused){
          state.activeFlight = {from:from,to:to,totalSec:af.totalSec,remainSec:af.remainSec,distance:af.distance,paused:true,startedAt:Date.now()};
          state.home = from;
          storage.setItem(LS.home, from.code);
          hideAll(); show('flight');
          $('fromCode').textContent = from.code;
          $('toCode').textContent = to.code;
          $('destCity').textContent = to.city + (to.country ? ', '+countryName(to.country) : '');
          $('timer').textContent = fmtTime(af.remainSec);
          var pp = 1 - af.remainSec/af.totalSec;
          $('progressFill').style.width = (pp*100)+'%';
          $('progressPct').textContent = Math.round(pp*100)+'%';
          state.timerId = setInterval(tick, 1000);
          updatePauseBtn();
          renderMap([from,to]);
          return;
        }
        var elapsed = Math.floor((Date.now() - af.startedAt) / 1000);
        var remain = af.totalSec - elapsed;
        if(remain <= 0){
          state.activeFlight = {from:from,to:to,totalSec:af.totalSec,remainSec:0,distance:af.distance,paused:false};
          state.home = from;
          finishFlight();
          return;
        } else {
          state.activeFlight = {from:from,to:to,totalSec:af.totalSec,remainSec:remain,distance:af.distance,paused:false,startedAt:af.startedAt};
          state.home = from;
          storage.setItem(LS.home, from.code);
          hideAll(); show('flight');
          $('fromCode').textContent = from.code;
          $('toCode').textContent = to.code;
          $('destCity').textContent = to.city + (to.country ? ', '+countryName(to.country) : '');
          $('timer').textContent = fmtTime(remain);
          var p = 1 - remain/af.totalSec;
          $('progressFill').style.width = (p*100)+'%';
          $('progressPct').textContent = Math.round(p*100)+'%';
          state.timerId = setInterval(tick, 1000);
          updatePauseBtn();
          renderMap([from,to]);
          return;
        }
      }
    } catch(e){ console.warn('Не удалось восстановить полёт', e); }
  }
  hideAll();
  renderSetup();
  renderStats();
}
function ensureExtraUI(){
  if(!document.getElementById('ff-extra-style')){
    var st = document.createElement('style');
    st.id = 'ff-extra-style';
    st.textContent = FF_CSS;
    document.head.appendChild(st);
  }
  var hs = $('homeSearch');
  if(!hs && $('homeSelect')){
    hs = document.createElement('input');
    hs.type = 'text'; hs.id = 'homeSearch'; hs.className = 'ff-search';
    hs.placeholder = 'Поиск аэропорта: город, код или страна…';
    hs.autocomplete = 'off';
    $('homeSelect').parentNode.insertBefore(hs, $('homeSelect'));
    hs.oninput = function(){ state.searchQuery = hs.value.trim().toLowerCase(); rebuildSelect(); };
    hs.onkeydown = function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        var sel = $('homeSelect');
        if(sel && sel.options.length){ sel.value = sel.options[0].value; sel.onchange(); }
      }
    };
  }
  var pv = $('routePreview');
  if(!pv && $('setup')){
    pv = document.createElement('div');
    pv.id = 'routePreview'; pv.className = 'ff-preview hidden';
    pv.innerHTML = '<div class="ff-preview-route"></div><div class="ff-preview-sub"></div>' +
      '<div class="ff-preview-actions"><button type="button" class="ff-start">✈ Начать полёт</button> ' +
      '<button type="button" class="ghost ff-cancel">Отмена</button></div>';
    $('setup').appendChild(pv);
    pv.querySelector('.ff-start').onclick = function(){ if(state.selected) startFlight(state.selected); };
    pv.querySelector('.ff-cancel').onclick = function(){ cancelSelection(); };
  }
  var pb = $('pauseBtn');
  if(!pb && $('abortBtn')){
    pb = document.createElement('button');
    pb.type = 'button'; pb.id = 'pauseBtn'; pb.className = 'ghost';
    pb.textContent = '⏸ Пауза';
    $('abortBtn').parentNode.insertBefore(pb, $('abortBtn'));
    pb.onclick = pauseToggle;
  }
  var mb = document.querySelector('.ff-menu');
  if(!mb){
    mb = document.createElement('button');
    mb.type = 'button'; mb.className = 'ff-menu'; mb.textContent = '☰';
    mb.onclick = function(){
      if(typeof openSbMobile === 'function'){ openSbMobile(); }
      else {
        var sb = document.getElementById('sidebar'), bd = document.getElementById('sbBackdrop');
        if(sb) sb.classList.add('open');
        if(bd) bd.classList.add('show');
      }
    };
    document.body.appendChild(mb);
  }
}
function buildAllOptions(){
  var sorted = state.airports.slice().sort(function(a,b){
    var av = state.visited.has(a.code) ? 1 : 0;
    var bv = state.visited.has(b.code) ? 1 : 0;
    if(av !== bv) return av - bv;
    return a.city.localeCompare(b.city);
  });
  state.allOptions = sorted.map(function(a){
    return {code:a.code, label:a.code+' — '+a.city+' ('+countryName(a.country)+')'+(state.visited.has(a.code)?' ✓':'')};
  });
}
function rebuildSelect(){
  var sel = $('homeSelect');
  if(!sel) return;
  var q = state.searchQuery;
  var opts = q ? state.allOptions.filter(function(o){ return o.label.toLowerCase().indexOf(q) >= 0; }) : state.allOptions;
  var html = '';
  for(var i=0;i<opts.length;i++){
    html += '<option value="'+opts[i].code+'"'+(opts[i].code===state.home.code?' selected':'')+'>'+opts[i].label+'</option>';
  }
  if(!opts.length) html = '<option value="">Ничего не найдено</option>';
  sel.innerHTML = html;
}
function renderSetup(){
  hideAll();
  show('setup'); show('stats'); show('results');
  ensureExtraUI();
  updateCurrentHomeLabel();
  buildAllOptions();
  rebuildSelect();
  var sel = $('homeSelect');
  if(sel) sel.onchange = function(){
    if(!sel.value) return;
    state.home = state.byCode[sel.value];
    storage.setItem(LS.home, state.home.code);
    updateCurrentHomeLabel();
    cancelSelection();
    renderDestinations();
  };
  var slider = $('duration');
  if(slider && !slider.dataset.init){
    slider.value = minutesToSlider(state.durationMin);
    slider.dataset.init = '1';
    slider.oninput = function(){
      state.durationMin = sliderToMinutes(+slider.value);
      $('durationLabel').textContent = fmtMin(state.durationMin);
      renderDestinations();
    };
  }
  if($('durationLabel')) $('durationLabel').textContent = fmtMin(state.durationMin);
  var chips = document.querySelectorAll('#setup .chip[data-min]');
  for(var c=0;c<chips.length;c++){
    chips[c].onclick = function(){
      var m = parseInt(this.dataset.min,10);
      state.durationMin = m;
      slider.value = minutesToSlider(m);
      $('durationLabel').textContent = fmtMin(m);
      renderDestinations();
    };
  }
  var rb = $('randomBtn');
  if(rb) rb.onclick = function(){
    var items = $('list').querySelectorAll('.item');
    if(items.length === 0){ alert('Нет доступных направлений'); return; }
    var pick = items[Math.floor(Math.random()*items.length)];
    selectDestination(pick.dataset.code);
  };
  var sortChips = document.querySelectorAll('#setup .chip[data-sort]');
  for(var s=0;s<sortChips.length;s++){
    sortChips[s].classList.toggle('active', sortChips[s].dataset.sort === state.sortMode);
    sortChips[s].onclick = function(){
      state.sortMode = this.dataset.sort;
      for(var k=0;k<sortChips.length;k++) sortChips[k].classList.toggle('active', sortChips[k].dataset.sort === state.sortMode);
      renderDestinations();
    };
  }
  var on = $('onlyNew');
  if(on){
    on.checked = state.onlyNew;
    on.onchange = function(){
      state.onlyNew = this.checked;
      renderDestinations();
    };
  }
  renderDestinations();
}
function updateCurrentHomeLabel(){
  var el = $('currentHome');
  if(el && state.home) el.textContent = state.home.city + ' (' + state.home.code + ')';
}
function selectDestination(code){
  var dest = state.byCode[code];
  if(!dest) return;
  state.selected = code;
  var km = hav(state.home, dest);
  var mins = Math.max(1, Math.round(km/SPEED_KMH*60));
  var pv = $('routePreview');
  if(pv){
    pv.classList.remove('hidden');
    pv.querySelector('.ff-preview-route').textContent = state.home.code + ' → ' + dest.code + ' · ' + dest.city;
    pv.querySelector('.ff-preview-sub').textContent = Math.round(km) + ' км · в пути ~' + fmtMin(mins) + ' · ' + countryName(dest.country);
  }
  var items = $('list').querySelectorAll('.item');
  for(var i=0;i<items.length;i++) items[i].classList.toggle('selected', items[i].dataset.code === code);
}
function cancelSelection(){
  state.selected = null;
  var pv = $('routePreview');
  if(pv) pv.classList.add('hidden');
  var items = $('list') ? $('list').querySelectorAll('.item') : [];
  for(var i=0;i<items.length;i++) items[i].classList.remove('selected');
}
function renderDestinations(){
  var target = state.durationMin/60 * SPEED_KMH;
  var pool = [];
  for(var i=0;i<state.airports.length;i++){
    var a = state.airports[i];
    if(a.code === state.home.code) continue;
    if(state.onlyNew && state.visited.has(a.code)) continue;
    pool.push({a:a, d:hav(state.home, a)});
  }
  if(state.sortMode === 'time'){
    pool.sort(function(x,y){ return Math.abs(x.d-target) - Math.abs(y.d-target); });
  } else if(state.sortMode === 'alpha'){
    pool.sort(function(x,y){ return x.a.city.localeCompare(y.a.city); });
  } else if(state.sortMode === 'country'){
    pool.sort(function(x,y){
      var c = countryName(x.a.country).localeCompare(countryName(y.a.country), 'ru');
      return c !== 0 ? c : x.a.city.localeCompare(y.a.city);
    });
  }
  var list = pool.slice(0, 20);
  var el = $('list');
  if(!el) return;
  if(list.length === 0){
    el.innerHTML = '<div class="empty">'+(state.onlyNew ? '🎉 Все аэропорты посещены!<br>Снимите галочку или сбросьте прогресс.' : 'Нет доступных аэропортов')+'</div>';
    renderMap([state.home]);
    return;
  }
  var html = '';
  for(var i=0;i<list.length;i++){
    var it = list[i];
    var mins = Math.round(it.d/SPEED_KMH*60);
    var visited = state.visited.has(it.a.code);
    var vmark = visited ? ' <span style="color:var(--accent)">✓</span>' : '';
    var cls = 'item' + (visited ? ' visited' : '') + (state.selected === it.a.code ? ' selected' : '');
    html += '<div class="'+cls+'" data-code="'+it.a.code+'">'+
      '<div class="code">'+it.a.code+'</div>'+
      '<div>'+
        '<div class="city">'+it.a.city+vmark+'</div>'+
        (it.a.country ? '<div class="country">'+countryName(it.a.country)+'</div>' : '')+
      '</div>'+
      '<div class="info">'+Math.round(it.d)+' км<br>'+fmtMin(mins)+'</div>'+
    '</div>';
  }
  el.innerHTML = html;
  var items = el.querySelectorAll('.item');
  for(var j=0;j<items.length;j++){
    items[j].onclick = function(){ selectDestination(this.dataset.code); };
  }
  renderMap([state.home].concat(list.map(function(x){ return x.a; })));
}
function saveActive(f){
  storage.setItem(LS.active, JSON.stringify({
    fromCode:f.from.code, toCode:f.to.code,
    totalSec:f.totalSec, distance:f.distance,
    startedAt:f.startedAt || Date.now(),
    paused:!!f.paused, remainSec:f.remainSec
  }));
}
function startFlight(code){
  var dest = state.byCode[code];
  if(!dest) return;
  var km = hav(state.home, dest);
  var mins = Math.max(1, Math.round(km/SPEED_KMH*60));
  state.activeFlight = {from: state.home, to: dest, totalSec: mins*60, remainSec: mins*60, distance: km, paused:false, startedAt: Date.now()};
  saveActive(state.activeFlight);
  cancelSelection();
  hideAll(); show('flight');
  $('fromCode').textContent = state.home.code;
  $('toCode').textContent = dest.code;
  $('destCity').textContent = dest.city + (dest.country ? ', '+countryName(dest.country) : '');
  $('progressFill').style.width = '0%';
  $('progressPct').textContent = '0%';
  $('timer').textContent = fmtTime(state.activeFlight.totalSec);
  updatePauseBtn();
  state.timerId = setInterval(tick, 1000);
  renderMap([state.home, dest]);
}
function pauseToggle(){
  var f = state.activeFlight;
  if(!f) return;
  f.paused = !f.paused;
  if(!f.paused) f.startedAt = Date.now();
  saveActive(f);
  updatePauseBtn();
}
function updatePauseBtn(){
  var b = $('pauseBtn');
  var f = state.activeFlight;
  if(b) b.textContent = (f && f.paused) ? '▶ Продолжить' : '⏸ Пауза';
}
function tick(){
  var f = state.activeFlight;
  if(!f || f.paused) return;
  f.remainSec--;
  if(f.remainSec <= 0) return finishFlight();
  $('timer').textContent = fmtTime(f.remainSec);
  var p = 1 - f.remainSec/f.totalSec;
  $('progressFill').style.width = (p*100)+'%';
  $('progressPct').textContent = Math.round(p*100)+'%';
}
function finishFlight(){
  var f = state.activeFlight;
  clearInterval(state.timerId); state.timerId = null;
  storage.removeItem(LS.active);
  state.visited.add(f.from.code);
  state.visited.add(f.to.code);
  storage.setItem(LS.visited, JSON.stringify(Array.from(state.visited)));
  state.history.push({
    from:f.from.code, to:f.to.code,
    fromCity:f.from.city, toCity:f.to.city,
    minutes:Math.round(f.totalSec/60),
    distance:Math.round(f.distance),
    date:new Date().toISOString()
  });
  storage.setItem(LS.history, JSON.stringify(state.history));
  state.home = f.to;
  storage.setItem(LS.home, f.to.code);
  state.activeFlight = null;
  hideAll(); show('done'); show('stats');
  $('doneMsg').textContent = 'Вы в '+f.to.city+' ('+f.to.code+')';
  $('doneStats').innerHTML =
    '<div class="stat"><b>'+Math.round(f.distance)+'</b> <span>км пройдено</span></div>'+
    '<div class="stat"><b>'+fmtMin(Math.round(f.totalSec/60))+'</b> <span>в воздухе</span></div>'+
    '<div class="stat"><b>'+state.visited.size+'</b> <span>посещено</span></div>'+
    '<div class="stat"><b>'+state.history.length+'</b> <span>полётов всего</span></div>';
  renderStats();
  renderMap([f.from, f.to]);
}
function abortFlight(){
  if(!state.timerId && !state.activeFlight) return;
  if(!confirm('Прервать полёт? Прогресс не сохранится.')) return;
  clearInterval(state.timerId); state.timerId = null;
  storage.removeItem(LS.active);
  state.activeFlight = null;
  renderSetup();
}
function renderStats(){
  show('stats');
  var totalMin=0, totalKm=0;
  for(var i=0;i<state.history.length;i++){
    totalMin += state.history[i].minutes || 0;
    totalKm  += state.history[i].distance || 0;
  }
  var total = state.airports.length;
  var visited = state.visited.size;
  var pct = total>0 ? Math.round(visited/total*100) : 0;
  var sg = $('statsGrid');
  if(sg) sg.innerHTML =
    '<div class="stat"><b>'+visited+' / '+total+'</b> <span>аэропортов ('+pct+'%)</span></div>'+
    '<div class="stat"><b>'+state.history.length+'</b> <span>полётов</span></div>'+
    '<div class="stat"><b>'+Math.round(totalMin/60)+'</b> <span>часов в воздухе</span></div>'+
    '<div class="stat"><b>'+totalKm.toLocaleString('ru-RU')+'</b> <span>км пройдено</span></div>';
  renderAchievements();
  renderRecent();
  updateCurrentHomeLabel();
}
function renderAchievements(){
  var h = state.history;
  var totalMin = 0, maxDist = 0, maxDur = 0;
  for(var i=0;i<h.length;i++){
    totalMin += h[i].minutes || 0;
    if((h[i].distance||0) > maxDist) maxDist = h[i].distance;
    if((h[i].minutes||0) > maxDur) maxDur = h[i].minutes;
  }
  var visited = state.visited.size;
  var list = [
    {name:'🥇 Первый полёт',     on: h.length >= 1},
    {name:'✈️ 5 полётов',        on: h.length >= 5},
    {name:'🛩 10 полётов',       on: h.length >= 10},
    {name:'⏱ 10 часов',          on: totalMin >= 600},
    {name:'⌛ 50 часов',          on: totalMin >= 3000},
    {name:'🏃 Полёт > 4 ч',      on: maxDur >= 240},
    {name:'🌍 Полёт > 8000 км',  on: maxDist >= 8000},
    {name:'🧭 50 аэропортов',    on: visited >= 50},
    {name:'🌏 200 аэропортов',   on: visited >= 200},
    {name:'👑 Все аэропорты',    on: state.airports.length>0 && visited >= state.airports.length}
  ];
  var html = '';
  for(var i=0;i<list.length;i++){
    html += '<span class="ach-badge'+(list[i].on?' on':'')+'">'+list[i].name+'</span>';
  }
  var al = $('achList');
  if(al) al.innerHTML = html;
}
function renderRecent(){
  var el = $('recentList');
  if(!el) return;
  var h = state.history.slice(-5).reverse();
  if(h.length === 0){
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">Ещё нет завершённых полётов</div>';
    return;
  }
  var html = '';
  for(var i=0;i<h.length;i++){
    var f = h[i];
    var d = new Date(f.date);
    var ds = d.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'});
    html += '<div class="recent-item">'+
      '<b>'+f.from+' → '+f.to+'</b>'+
      '<span>'+fmtMin(Math.round(f.minutes))+' · '+f.distance+' км · '+ds+'</span>'+
    '</div>';
  }
  el.innerHTML = html;
}
function fitView(pts){
  if(!pts || !pts.length) return {lonMin:-180,lonMax:180,latMin:-90,latMax:90};
  var lonMin=180,lonMax=-180,latMin=90,latMax=-90;
  for(var i=0;i<pts.length;i++){
    var p = pts[i];
    if(p.lon<lonMin)lonMin=p.lon; if(p.lon>lonMax)lonMax=p.lon;
    if(p.lat<latMin)latMin=p.lat; if(p.lat>latMax)latMax=p.lat;
  }
  var dlon = Math.max(lonMax-lonMin, 24);
  var dlat = Math.max(latMax-latMin, dlon/2);
  var cx = (lonMin+lonMax)/2, cy = (latMin+latMax)/2;
  lonMin = cx - dlon*0.65; lonMax = cx + dlon*0.65;
  latMin = cy - dlat*0.65; latMax = cy + dlat*0.65;
  if(lonMin<-180){ lonMax += (-180-lonMin); lonMin = -180; }
  if(lonMax>180){ lonMin -= (lonMax-180); lonMax = 180; }
  if(latMin<-90){ latMax += (-90-latMin); latMin = -90; }
  if(latMax>90){ latMin -= (latMax-90); latMax = 90; }
  lonMin=Math.max(lonMin,-180); lonMax=Math.min(lonMax,180);
  latMin=Math.max(latMin,-90); latMax=Math.min(latMax,90);
  return {lonMin:lonMin,lonMax:lonMax,latMin:latMin,latMax:latMax};
}
function renderMap(pts){
  if(pts && pts.length) state.lastMapPts = pts;
  var canvas = $('worldMap');
  var wrap = $('mapWrap');
  if(!canvas || !wrap) return;
  var W = wrap.clientWidth;
  var H = wrap.clientHeight;
  if(W < 10 || H < 10) return;
  var view = fitView(state.lastMapPts);
  state.view = view;
  var bg = wrap.querySelector('.map-bg');
  if(bg){
    var sx = 360/(view.lonMax-view.lonMin);
    var sy = 180/(view.latMax-view.latMin);
    bg.style.backgroundSize = (W*sx)+'px '+(H*sy)+'px';
    bg.style.backgroundPosition = (-((view.lonMin+180)/360)*(W*sx))+'px '+(-((90-view.latMax)/180)*(H*sy))+'px';
  }
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  function X(lon){ return (lon-view.lonMin)/(view.lonMax-view.lonMin)*W; }
  function Y(lat){ return (view.latMax-lat)/(view.latMax-view.latMin)*H; }
  ctx.strokeStyle = 'rgba(58,95,138,.25)';
  ctx.lineWidth = 1;
  for(var h=0; h<state.history.length; h++){
    var f = state.history[h];
    var a = state.byCode[f.from], b = state.byCode[f.to];
    if(!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(X(a.lon), Y(a.lat));
    ctx.lineTo(X(b.lon), Y(b.lat));
    ctx.stroke();
  }
  for(var k=0; k<state.airports.length; k++){
    var ap = state.airports[k];
    var px = X(ap.lon), py = Y(ap.lat);
    if(px < -5 || px > W+5 || py < -5 || py > H+5) continue;
    var visited = state.visited.has(ap.code);
    if(visited){
      ctx.fillStyle = '#3A5F8A';
      ctx.beginPath();
      ctx.arc(px, py, 2.8, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(120,128,140,.4)';
      ctx.beginPath();
      ctx.arc(px, py, 1.3, 0, Math.PI*2);
      ctx.fill();
    }
  }
  if(state.home){
    var hx = X(state.home.lon), hy = Y(state.home.lat);
    if(hx >= -5 && hx <= W+5 && hy >= -5 && hy <= H+5){
      ctx.fillStyle = '#B04A5E';
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
var resizeTimer = null;
window.addEventListener('resize', function(){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function(){
    var fp = document.getElementById('flightPage');
    if(fp && !fp.classList.contains('page-hidden')) renderMap();
  }, 200);
});
var ab = $('abortBtn'); if(ab) ab.onclick = abortFlight;
var cb = $('continueBtn'); if(cb) cb.onclick = function(){ renderSetup(); };
var rb = $('resetBtn'); if(rb) rb.onclick = function(){
  if(!confirm('Сбросить весь прогресс?')) return;
  storage.removeItem(LS.visited);
  storage.removeItem(LS.history);
  storage.removeItem(LS.home);
  storage.removeItem(LS.airports);
  storage.removeItem(LS.active);
  location.reload();
};
(function initPageVisibility(){
  try {
    var page = localStorage.getItem('darya_board_page');
    var fp = document.getElementById('flightPage');
    if (fp) {
      if (page === 'flight') fp.classList.remove('page-hidden');
      else fp.classList.add('page-hidden');
    }
    if (page === 'flight') document.body.classList.add('ff-flight');
  } catch(e){}
})();
window.FocusFlight = {
  init: startWithFallback,
  onShow: function(){ setTimeout(function(){ renderMap(); }, 60); }
};
startWithFallback();
})();
// ---------- Перехват кликов по навигации ----------
(function(){
function flightNavBtn(){
  return document.querySelector('[onclick*="switchPage(\'flight\')"]');
}
function showFlightPage(){
  var bp = document.getElementById('boardPage');
  var pp = document.getElementById('personalPage');
  var fp = document.getElementById('flightPage');
  if(bp) bp.classList.add('page-hidden');
  if(pp) pp.classList.add('page-hidden');
  if(fp) fp.classList.remove('page-hidden');
  document.body.classList.add('ff-flight');
  var nb = document.getElementById('navBoard');
  var np = document.getElementById('navPersonal');
  if(nb) nb.classList.remove('active');
  if(np) np.classList.remove('active');
  var fn = flightNavBtn();
  if(fn) fn.classList.add('active');
  var pt = document.getElementById('pageTitle');
  var ps = document.getElementById('pageSubtitle');
  if(pt) pt.textContent = 'FocusFlight';
  if(ps) ps.textContent = 'Симулятор перелётов';
  try { localStorage.setItem('darya_board_page', 'flight'); } catch(e){}
  if(window.FocusFlight && window.FocusFlight.onShow) window.FocusFlight.onShow();
}
function hideFlightPage(){
  var fp = document.getElementById('flightPage');
  if(fp) fp.classList.add('page-hidden');
  document.body.classList.remove('ff-flight');
  var fn = flightNavBtn();
  if(fn) fn.classList.remove('active');
}
document.addEventListener('click', function(e){
  var el = e.target && e.target.closest ? e.target.closest('[onclick]') : null;
  if(!el) return;
  var oc = el.getAttribute('onclick') || '';
  if(oc.indexOf("switchPage('flight')") >= 0){
    e.stopImmediatePropagation();
    e.preventDefault();
    showFlightPage();
  } else if(oc.indexOf('switchPage(') >= 0){
    hideFlightPage();
  }
}, true);
window.addEventListener('load', function(){
  try {
    if(localStorage.getItem('darya_board_page') === 'flight'){
      showFlightPage();
    }
  } catch(e){}
});
})();
