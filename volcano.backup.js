/* ═══════════════════════════════════════════════════════════════
   VOLCANO.JS — Monitoring Erupsi Gunung Api Realtime
   Sumber: MAGMA Indonesia (PVMBG/ESDM) — magma.esdm.go.id
   © 2025 Cyber Paminal Monitoring Karhutla
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────── */
  var MAGMA_BASE   = 'https://magma.esdm.go.id/v1/gunung-api';
  var CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
  ];
  var REFRESH_MS = 3 * 60 * 1000; // 3 menit

  // ── STATUS DEFAULT (data PVMBG 8 Sep 2026, diupdate saat fetch berhasil) ──
  var DEFAULT_STATUS = {
    // LEVEL III - SIAGA
    'Anak Krakatau':      'siaga',
    'Lewotobi Laki-laki': 'siaga',
    'Merapi':             'siaga',
    'Semeru':             'siaga',
    'Sinabung':           'siaga',
    // LEVEL II - WASPADA
    'Anak Ranakah':       'waspada',
    'Awu':                'waspada',
    'Banda Api':          'waspada',
    'Bromo':              'waspada',
    'Bur Ni Telong':      'waspada',
    'Dempo':              'waspada',
    'Dukono':             'waspada',
    'Gamalama':           'waspada',
    'Ibu':                'waspada',
    'Ili Lewotolok':      'waspada',
    'Iya':                'waspada',
    'Karangetang':        'waspada',
    'Kerinci':            'waspada',
    'Lokon':              'waspada',
    'Marapi':             'waspada',
    'Raung':              'waspada',
    'Rinjani':            'waspada',
    'Sangeangapi':        'waspada',
    'Slamet':             'waspada',
    'Soputan':            'waspada',
    'Sorikmarapi':        'waspada',
    'Tambora':            'waspada',
    // LEVEL I - NORMAL (gunung aktif yang dipantau)
    'Agung':              'normal',
    'Ambang':             'normal',
    'Arjuno Welirang':    'normal',
    'Batur':              'normal',
    'Batutara':           'normal',
    'Ciremai':            'normal',
    'Colo':               'normal',
    'Dieng':              'normal',
    'Ebulobo':            'normal',
    'Egon':               'normal',
    'Galunggung':         'normal',
    'Gamkonora':          'normal',
    'Gede':               'normal',
    'Guntur':             'normal',
    'Ijen':               'normal',
    'Ile Werung':         'normal',
    'Ili Boleng':         'normal',
    'Inielika':           'normal',
    'Inierie':            'normal',
    'Kaba':               'normal',
    'Kelimutu':           'normal',
    'Kelud':              'normal',
    'Kie Besi':           'normal',
    'Lamongan':           'normal',
    'Lereboleng':         'normal',
    'Lewotobi Perempuan': 'normal',
    'Mahawu':             'normal',
    'Papandayan':         'normal',
    'Ruang':              'normal',
    'Salak':              'normal',
    'Rokatenda':          'normal',
    'Sirung':             'normal',
    'Sumbing':            'normal',
    'Sundoro':            'normal',
    'Talang':             'normal',
    'Tandikat':           'normal',
    'Tangkoko':           'normal',
    'Tangkuban Parahu':   'normal',
    'Wurlali':            'normal',
  };

  /* ── KOORDINAT 60+ GUNUNG API ───────────────────────────── */
  var COORDS = {
    'Agung':               { lat:-8.342,  lng:115.508 },
    'Ambang':              { lat:0.733,   lng:124.417 },
    'Anak Krakatau':       { lat:-6.102,  lng:105.423 },
    'Anak Ranakah':        { lat:-8.618,  lng:120.521 },
    'Arjuno Welirang':     { lat:-7.729,  lng:112.576 },
    'Awu':                 { lat:3.689,   lng:125.497 },
    'Banda Api':           { lat:-4.525,  lng:129.871 },
    'Batur':               { lat:-8.242,  lng:115.375 },
    'Batutara':            { lat:-7.792,  lng:123.579 },
    'Bromo':               { lat:-7.942,  lng:112.950 },
    'Bur Ni Telong':       { lat:4.917,   lng:96.817  },
    'Ciremai':             { lat:-6.891,  lng:108.400 },
    'Colo':                { lat:-0.170,  lng:121.607 },
    'Dempo':               { lat:-4.033,  lng:103.133 },
    'Dieng':               { lat:-7.208,  lng:109.908 },
    'Dukono':              { lat:1.693,   lng:127.894 },
    'Ebulobo':             { lat:-8.817,  lng:121.192 },
    'Egon':                { lat:-8.676,  lng:122.454 },
    'Galunggung':          { lat:-7.250,  lng:108.058 },
    'Gamalama':            { lat:0.800,   lng:127.325 },
    'Gamkonora':           { lat:1.379,   lng:127.527 },
    'Gede':                { lat:-6.783,  lng:106.983 },
    'Guntur':              { lat:-7.143,  lng:107.837 },
    'Ibu':                 { lat:1.488,   lng:127.630 },
    'Ijen':                { lat:-8.058,  lng:114.242 },
    'Ili Boleng':          { lat:-8.342,  lng:123.258 },
    'Ili Lewotolok':       { lat:-8.274,  lng:123.505 },
    'Ile Werung':          { lat:-8.608,  lng:123.613 },
    'Inielika':            { lat:-8.726,  lng:120.989 },
    'Inierie':             { lat:-8.875,  lng:120.962 },
    'Iya':                 { lat:-8.887,  lng:121.645 },
    'Kaba':                { lat:-3.519,  lng:102.618 },
    'Karangetang':         { lat:2.781,   lng:125.408 },
    'Kelimutu':            { lat:-8.767,  lng:121.817 },
    'Kelud':               { lat:-7.933,  lng:112.308 },
    'Kerinci':             { lat:-1.697,  lng:101.264 },
    'Kie Besi':            { lat:0.267,   lng:127.467 },
    'Lamongan':            { lat:-8.000,  lng:113.342 },
    'Lereboleng':          { lat:-8.358,  lng:122.770 },
    'Lewotobi Laki-laki':  { lat:-8.544,  lng:122.776 },
    'Lewotobi Perempuan':  { lat:-8.553,  lng:122.771 },
    'Lokon':               { lat:1.358,   lng:124.792 },
    'Mahawu':              { lat:1.358,   lng:124.858 },
    'Marapi':              { lat:-0.381,  lng:100.473 },
    'Merapi':              { lat:-7.542,  lng:110.442 },
    'Papandayan':          { lat:-7.319,  lng:107.731 },
    'Peut Sague':          { lat:4.908,   lng:96.329  },
    'Raung':               { lat:-8.125,  lng:114.042 },
    'Rinjani':             { lat:-8.412,  lng:116.467 },
    'Rokatenda':           { lat:-8.618,  lng:121.706 },
    'Ruang':               { lat:2.303,   lng:125.367 },
    'Salak':               { lat:-6.717,  lng:106.733 },
    'Sangeangapi':         { lat:-8.200,  lng:119.070 },
    'Semeru':              { lat:-8.108,  lng:112.922 },
    'Seulawah Agam':       { lat:5.448,   lng:95.658  },
    'Sinabung':            { lat:3.170,   lng:98.392  },
    'Sirung':              { lat:-8.508,  lng:124.148 },
    'Slamet':              { lat:-7.242,  lng:109.208 },
    'Soputan':             { lat:1.112,   lng:124.737 },
    'Sorikmarapi':         { lat:0.683,   lng:99.535  },
    'Sumbing':             { lat:-7.385,  lng:110.063 },
    'Sundoro':             { lat:-7.300,  lng:109.992 },
    'Talang':              { lat:-0.978,  lng:100.679 },
    'Tambora':             { lat:-8.250,  lng:117.992 },
    'Tandikat':            { lat:-0.437,  lng:100.310 },
    'Tangkoko':            { lat:1.563,   lng:125.192 },
    'Tangkuban Parahu':    { lat:-6.770,  lng:107.600 },
    'Wurlali':             { lat:-6.633,  lng:126.487 },
  };

  /* ── LEVEL ─────────────────────────────────────────────── */
  var LVL = {
    awas:    { color:'#ff1010', bg:'rgba(255,16,16,.15)',   label:'AWAS',    size:22 },
    siaga:   { color:'#ff7800', bg:'rgba(255,120,0,.15)',   label:'SIAGA',   size:18 },
    waspada: { color:'#ffd600', bg:'rgba(255,214,0,.12)',   label:'WASPADA', size:14 },
    normal:  { color:'#00d890', bg:'rgba(0,216,144,.1)',    label:'NORMAL',  size:10 },
  };

  /* ── STATE ─────────────────────────────────────────────── */
  var VS = {
    eruptions:   [],
    statuses:    {},
    markers:     [],
    initialized: false,
    lastIds:     {},
  };

  /* ── SAFE TEXT ─────────────────────────────────────────── */
  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  /* ── CORS FETCH ────────────────────────────────────────── */
  async function corsGet(url) {
    for (var i = 0; i < CORS_PROXIES.length; i++) {
      try {
        var r = await fetch(CORS_PROXIES[i] + encodeURIComponent(url), {
          signal: AbortSignal.timeout(12000),
        });
        if (r.ok) { var t = await r.text(); if (t.length > 200) return t; }
      } catch(e) {
        console.warn('[Volcano] proxy gagal:', CORS_PROXIES[i]);
      }
    }
    throw new Error('Semua proxy gagal');
  }

  /* ── PARSE STATUS ──────────────────────────────────────── */
  function parseStatus(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var result = {};
    var currentLevel = 'normal';
    var rows = doc.querySelectorAll('table tbody tr');

    rows.forEach(function(row) {
      var levelCell = row.querySelector('td a.tx-inverse');
      if (levelCell) {
        var txt = levelCell.textContent.toLowerCase();
        if      (txt.includes('iv')  || txt.includes('awas'))    currentLevel = 'awas';
        else if (txt.includes('iii') || txt.includes('siaga'))   currentLevel = 'siaga';
        else if (txt.includes('ii')  || txt.includes('waspada')) currentLevel = 'waspada';
        else                                                      currentLevel = 'normal';
      }
      row.querySelectorAll('td').forEach(function(td) {
        var txt = td.textContent.trim();
        var m = txt.match(/^([A-Za-z][A-Za-z\u00C0-\u024F\s\-]+?)\s+-\s+[A-Z]/);
        if (m) {
          var nama = m[1].trim();
          if (COORDS[nama]) result[nama] = currentLevel;
        }
      });
    });
    return result;
  }

  /* ── PARSE ERUPTIONS ───────────────────────────────────── */
  function parseEruptions(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = [];

    doc.querySelectorAll('.timeline-item:not(.timeline-day)').forEach(function(el) {
      try {
        var timeEl   = el.querySelector('.timeline-time small');
        var titleEl  = el.querySelector('.timeline-title a');
        var textEl   = el.querySelector('.timeline-text');
        var imgEl    = el.querySelector('.bd.img-fluid');
        var detailEl = el.querySelector('.btn-outline-primary');

        if (!titleEl || !textEl) return;

        var nama   = titleEl.textContent.trim();
        var time   = timeEl   ? timeEl.textContent.trim()        : '';
        var desc   = textEl.textContent.trim().replace(/\s+/g,' ');
        var img    = imgEl    ? imgEl.getAttribute('src')        : '';
        var detail = detailEl ? detailEl.getAttribute('href')    : '';

        var ampM   = desc.match(/amplitudo maksimum (\d+(?:\.\d+)?) mm/i);
        var durM   = desc.match(/durasi (\d+) detik/i);
        var tngM   = desc.match(/tinggi kolom[^±]*[±]?\s*(\d+)\s*m/i);
        var id     = (detail || '').replace(/.*\/([^/]+)\/show.*/, '$1') || (nama + '_' + time);

        items.push({
          id:     id,
          nama:   nama,
          time:   time,
          desc:   desc,
          img:    (img   && img.startsWith('http'))    ? img    : null,
          detail: (detail && detail.startsWith('http'))? detail : null,
          amp:    ampM   ? parseInt(ampM[1])   : null,
          dur:    durM   ? parseInt(durM[1])   : null,
          tinggi: tngM   ? parseInt(tngM[1])   : null,
          coords: COORDS[nama] || null,
          lv:     VS.statuses[nama] || 'siaga',
        });
      } catch(e) {}
    });

    return items;
  }

  /* ── RENDER MARKERS ────────────────────────────────────── */
  function renderMarkers() {
    var map = window.S && window.S.map;
    if (!map) return;

    VS.markers.forEach(function(m) { try { map.removeLayer(m); } catch(e){} });
    VS.markers = [];

    Object.entries(VS.statuses).forEach(function([nama, lvKey]) {
      var coord = COORDS[nama];
      if (!coord) return;
      var lv  = LVL[lvKey] || LVL.normal;
      var had = VS.eruptions.some(function(e){ return e.nama === nama; });
      var sz  = lv.size;

      var el = document.createElement('div');
      el.style.cssText = [
        'width:' + sz + 'px;height:' + sz + 'px;',
        'border-radius:50%;cursor:pointer;',
        'background:radial-gradient(circle at 35% 35%,' + lv.color + 'dd,' + lv.color + '55);',
        'border:2px solid ' + lv.color + ';',
        'box-shadow:0 0 ' + (had ? 14 : 5) + 'px ' + lv.color + (had ? 'cc' : '66') + ';',
        had ? 'animation:blink 1.2s step-end infinite;' : '',
      ].join('');

      var icon = L.divIcon({
        html:       el.outerHTML,
        className:  '',
        iconSize:   [sz, sz],
        iconAnchor: [sz/2, sz/2],
        popupAnchor:[0, -sz/2 - 2],
      });

      // Popup pakai data-attribute, bukan inline onclick
      var recentErup = VS.eruptions.filter(function(e){ return e.nama === nama; }).slice(0,2);
      var erupHtml = recentErup.map(function(e) {
        return '<div style="margin-top:6px;padding-top:5px;border-top:1px solid #0c1520">'
          + '<div style="font-size:7.5px;color:#486080">' + esc(e.time) + '</div>'
          + '<div style="font-size:8.5px;color:#d8eaf8;line-height:1.4;margin-top:2px">' + esc(e.desc.slice(0,100)) + '...</div>'
          + (e.amp ? '<div style="font-size:7.5px;color:' + lv.color + ';margin-top:2px">⚡ Amp: ' + e.amp + ' mm &nbsp;·&nbsp; ' + e.dur + 's</div>' : '')
          + (e.img ? '<img src="' + esc(e.img) + '" style="width:100%;border-radius:2px;margin-top:4px;border:1px solid #1e2e42" />' : '')
          + '</div>';
      }).join('');

      var popupHtml = '<div style="min-width:230px;max-width:290px">'
        + '<div style="font-size:7px;text-transform:uppercase;letter-spacing:.14em;color:' + lv.color + ';font-weight:700;margin-bottom:4px">🌋 GUNUNG API · PVMBG MAGMA</div>'
        + '<div style="font-size:13px;font-weight:800;color:#d8eaf8;margin-bottom:5px">' + esc(nama) + '</div>'
        + '<div style="display:inline-flex;align-items:center;gap:4px;background:' + lv.bg + ';color:' + lv.color + ';border:1px solid ' + lv.color + '44;padding:2px 8px;border-radius:2px;font-size:8px;font-weight:700;margin-bottom:6px">'
        + lv.label + (had ? ' ⚠ ERUPSI HARI INI' : '') + '</div>'
        + '<div style="font-size:8px;color:#486080;margin-bottom:5px">📍 ' + coord.lat.toFixed(3) + '°, ' + coord.lng.toFixed(3) + '°</div>'
        + (erupHtml || '<div style="font-size:8.5px;color:#486080">Tidak ada laporan erupsi terbaru</div>')
        + '<button data-vol-ai="' + esc(nama) + '" data-vol-lv="' + esc(lv.label) + '" '
        + 'style="margin-top:8px;background:rgba(0,216,144,.1);border:1px solid rgba(0,216,144,.3);color:#00d890;'
        + 'padding:3px 10px;border-radius:2px;cursor:pointer;font-size:8px;font-family:monospace;letter-spacing:.05em;width:100%">'
        + '🤖 Analisis AI</button>'
        + '</div>';

      var m = L.marker([coord.lat, coord.lng], { icon: icon })
        .bindPopup(popupHtml, { maxWidth: 310, className: '' });

      m.addTo(map);
      VS.markers.push(m);
    });

    // Event delegation — handle tombol AI di popup (aman, tanpa inline onclick)
    document.removeEventListener('click', _onVolAI);
    document.addEventListener('click', _onVolAI);
  }

  function _onVolAI(e) {
    var btn = e.target.closest('[data-vol-ai]');
    if (!btn) return;
    var nama = btn.getAttribute('data-vol-ai');
    var lv   = btn.getAttribute('data-vol-lv');
    if (window.quickAsk) {
      quickAsk('Analisis status Gunung ' + nama + ' tingkat ' + lv + ' menurut PVMBG. Apa risiko bahaya dan rekomendasinya bagi masyarakat sekitar?');
    }
  }

  /* ── RENDER PANEL ──────────────────────────────────────── */
  function renderPanel() {
    var panel = document.getElementById('volcano-eruption-list');
    if (!panel) return;

    if (!VS.eruptions.length) {
      panel.innerHTML = '<div style="padding:14px 10px;font-size:8.5px;color:#283848;text-align:center">Belum ada laporan erupsi hari ini</div>';
      return;
    }

    panel.innerHTML = VS.eruptions.slice(0, 20).map(function(e) {
      var lv  = LVL[e.lv] || LVL.siaga;
      var isN = !VS.lastIds[e.id];
      return '<div class="vol-item" data-vol-fly="' + esc(e.nama) + '" '
        + 'style="padding:7px 10px;border-bottom:1px solid #0c1520;cursor:pointer;transition:background .1s">'
        + '<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">'
        + '<div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + lv.color + ';box-shadow:0 0 4px ' + lv.color + '"></div>'
        + '<span style="font-size:8.5px;font-weight:700;color:#d8eaf8;flex:1">' + esc(e.nama) + '</span>'
        + (isN ? '<span style="font-size:6px;font-weight:700;background:#e63946;color:#fff;padding:1px 4px;border-radius:1px">BARU</span>' : '')
        + '<span style="font-size:7px;color:#486080">' + esc(e.time) + '</span>'
        + '</div>'
        + '<div style="font-size:7.5px;color:#486080;line-height:1.4;padding-left:11px">' + esc(e.desc.slice(0,100)) + '...</div>'
        + (e.amp ? '<div style="font-size:7px;color:' + lv.color + ';padding-left:11px;margin-top:2px">⚡ ' + e.amp + ' mm &nbsp;·&nbsp; ' + e.dur + ' detik</div>' : '')
        + '</div>';
    }).join('');

    // Event delegation fly-to
    panel.removeEventListener('click', _onVolFly);
    panel.addEventListener('click', _onVolFly);
  }

  function _onVolFly(e) {
    var item = e.target.closest('[data-vol-fly]');
    if (!item) return;
    var nama  = item.getAttribute('data-vol-fly');
    var coord = COORDS[nama];
    var map   = window.S && window.S.map;
    if (coord && map) map.flyTo([coord.lat, coord.lng], 9, { duration: 1.2 });
  }

  /* ── STATUS BAR ────────────────────────────────────────── */
  function renderStatusBar() {
    var el = document.getElementById('vol-status-bar');
    if (!el) return;
    var counts = { awas:0, siaga:0, waspada:0, normal:0 };
    Object.values(VS.statuses).forEach(function(l) { if (counts[l] !== undefined) counts[l]++; });
    el.innerHTML = Object.entries(counts).filter(function([,v]){ return v > 0; }).map(function([k, v]) {
      var lv = LVL[k];
      return '<span style="font-size:7px;font-weight:700;padding:2px 6px;border-radius:1px;'
        + 'background:' + lv.bg + ';color:' + lv.color + ';border:1px solid ' + lv.color + '44">'
        + lv.label + ' ' + v + '</span>';
    }).join('');
    var cnt = document.getElementById('vol-erup-cnt');
    if (cnt) cnt.textContent = VS.eruptions.length;
    var chip = document.getElementById('c-vol');
    if (chip) chip.textContent = Object.keys(VS.statuses).length;
  }

  /* ── INJECT PANEL ──────────────────────────────────────── */
  function injectPanel() {
    if (document.getElementById('volcano-eruption-list')) return; // sudah ada

    var style = document.createElement('style');
    style.textContent = [
      '#vol-panel-outer{position:fixed;top:0;right:0;bottom:0;width:300px;',
      'background:#000;border-left:1px solid #0c1520;z-index:1000;',
      'display:flex;flex-direction:column;',
      'transform:translateX(100%);transition:transform .25s ease;}',
      '#vol-panel-outer.open{transform:translateX(0);}',
      '#vol-panel-hd{padding:6px 10px;border-bottom:1px solid #0c1520;',
      'display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
      '#vol-status-bar{display:flex;flex-wrap:wrap;gap:4px;padding:5px 10px;',
      'border-bottom:1px solid #0c1520;flex-shrink:0;}',
      '#volcano-eruption-list{flex:1;overflow-y:auto;}',
      '.vol-item:hover{background:rgba(255,255,255,.025)!important}',
    ].join('');
    document.head.appendChild(style);

    var outer = document.createElement('div');
    outer.id  = 'vol-panel-outer';
    outer.innerHTML = [
      '<div id="vol-panel-hd">',
      '  <span style="font-size:7.5px;font-weight:700;color:#486080;text-transform:uppercase;letter-spacing:.14em">🌋 ERUPSI GUNUNG API · PVMBG</span>',
      '  <div style="display:flex;align-items:center;gap:8px">',
      '    <span style="font-size:8px;color:#e63946;font-weight:700"><span id="vol-erup-cnt">0</span> laporan</span>',
      '    <button id="vol-close-btn" style="background:none;border:none;color:#486080;cursor:pointer;font-size:13px;line-height:1;padding:0">✕</button>',
      '  </div>',
      '</div>',
      '<div id="vol-status-bar"></div>',
      '<div id="volcano-eruption-list"></div>',
    ].join('');
    document.body.appendChild(outer);

    document.getElementById('vol-close-btn').addEventListener('click', function() {
      outer.classList.remove('open');
      var btn = document.getElementById('btn-vol-toggle');
      if (btn) btn.classList.remove('on');
    });
  }

  /* ── INJECT TOMBOL TOPBAR ──────────────────────────────── */
  function injectTopbarBtn() {
    if (document.getElementById('btn-vol-toggle')) return;
    var segs = document.querySelectorAll('.tb-seg');
    var seg  = segs[segs.length - 1];
    if (!seg) return;

    var btn = document.createElement('button');
    btn.id        = 'btn-vol-toggle';
    btn.className = 'tb-btn';
    btn.innerHTML = '🌋 Erupsi';
    btn.title     = 'Monitoring Erupsi PVMBG MAGMA';
    btn.style.cssText = 'border-color:rgba(230,57,70,.4);color:#e63946;';
    btn.addEventListener('click', function() {
      var outer = document.getElementById('vol-panel-outer');
      if (!outer) return;
      var isOpen = outer.classList.contains('open');
      if (isOpen) {
        outer.classList.remove('open');
        btn.classList.remove('on');
      } else {
        outer.classList.add('open');
        btn.classList.add('on');
        renderStatusBar();
        renderPanel();
      }
    });

    var fsBtn = seg.querySelector('#btnFs');
    fsBtn ? seg.insertBefore(btn, fsBtn) : seg.appendChild(btn);
  }

  /* ── FETCH ─────────────────────────────────────────────── */
  async function fetchStatus() {
    try {
      var html = await corsGet(MAGMA_BASE + '/tingkat-aktivitas');
      var parsed = parseStatus(html);
      if (Object.keys(parsed).length > 5) {
        VS.statuses = parsed;
        console.log('[Volcano] Status LIVE dari MAGMA:', Object.keys(parsed).length, 'gunung');
      } else {
        console.warn('[Volcano] Parse status gagal/kosong, pakai data default');
      }
    } catch(e) {
      console.warn('[Volcano] fetchStatus gagal:', e.message, '— pakai data default');
    }
  }

  async function fetchEruptions() {
    try {
      var html = await corsGet(MAGMA_BASE + '/informasi-letusan');
      var list = parseEruptions(html);
      var prevIds = VS.lastIds;
      var newOnes = list.filter(function(e){ return !prevIds[e.id]; });

      VS.eruptions = list;

      if (newOnes.length && VS.initialized) {
        newOnes.slice(0,3).forEach(function(e) {
          if (window.showToast)
            showToast('🌋', 'Erupsi G. ' + e.nama, (e.time || '') + ' — ' + e.desc.slice(0,60) + '...', 'volcano');
        });
      }

      var ids = {};
      list.forEach(function(e){ ids[e.id] = 1; });
      VS.lastIds     = ids;
      VS.initialized = true;
      console.log('[Volcano] Erupsi:', list.length, '| Baru:', newOnes.length);
    } catch(e) { console.warn('[Volcano] fetchEruptions gagal:', e.message); }
  }

  /* ── REFRESH ALL ───────────────────────────────────────── */
  async function refreshAll() {
    await Promise.allSettled([fetchStatus(), fetchEruptions()]);
    renderMarkers();
    renderStatusBar();
    // Kalau panel sedang terbuka, update juga
    var outer = document.getElementById('vol-panel-outer');
    if (outer && outer.classList.contains('open')) renderPanel();
  }

  /* ── INIT ──────────────────────────────────────────────── */
  async function init() {
    console.log('[Volcano] Init...');

    // Tunggu Leaflet map siap
    for (var i = 0; i < 40; i++) {
      if (window.S && window.S.map && window.L) break;
      await new Promise(function(r){ setTimeout(r, 300); });
    }

    injectPanel();
    injectTopbarBtn();

    // ▶ Langsung tampilkan data default dulu (tidak tunggu fetch)
    VS.statuses = Object.assign({}, DEFAULT_STATUS);
    renderMarkers();
    renderStatusBar();
    console.log('[Volcano] Data default dimuat:', Object.keys(VS.statuses).length, 'gunung');

    // ▶ Fetch data LIVE dari MAGMA (override default jika berhasil)
    await refreshAll();

    // ▶ Auto refresh tiap 3 menit
    setInterval(refreshAll, REFRESH_MS);
    console.log('[Volcano] Siap ✅ Refresh tiap', REFRESH_MS/60000, 'menit');
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 2500); });
  else
    setTimeout(init, 2500);

})();
