/**
 * SIAGA — Sistem Informasi Bencana Indonesia
 * Real-time disaster monitoring dashboard for Indonesian regions
 * Data sources: BNPB, BMKG, LAPAN/FIRMA, PVMBG, BPBD
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// DATA — Simulated real-time disaster data for Indonesian regions
// In production: connect to BNPB API, BMKG WS, LAPAN FIRMS API
// ═══════════════════════════════════════════════════════════════

const REGIONS = {
  kalimantan: { name: 'Kalimantan', center: [0.5, 114.0], bounds: [[-5, 107], [7, 120]] },
  sulawesi:   { name: 'Sulawesi',   center: [-2.0, 121.5], bounds: [[-8, 118], [3, 126]] },
  papua:      { name: 'Papua',      center: [-5.0, 138.0], bounds: [[-10, 130], [0, 142]] },
  ntt:        { name: 'NTT',        center: [-9.5, 124.0], bounds: [[-11, 119], [-8, 128]] },
  lombok:     { name: 'Lombok',     center: [-8.6, 116.3], bounds: [[-9.2, 115.7], [-8.0, 117.0]] },
  jawa:       { name: 'Jawa',       center: [-7.5, 110.0], bounds: [[-9, 105], [-5, 115]] },
  sumatra:    { name: 'Sumatra',    center: [0.5, 101.0],  bounds: [[-6, 95], [6, 108]] },
};

const DISASTER_TYPES = {
  fire:       { icon: '🔥', label: 'Kebakaran',     color: '#ff4500', cls: 'fire-m' },
  flood:      { icon: '🌊', label: 'Banjir',        color: '#0077b6', cls: 'flood-m' },
  earthquake: { icon: '🌋', label: 'Gempa Bumi',    color: '#f4a261', cls: 'quake-m' },
  landslide:  { icon: '⛰️', label: 'Tanah Longsor', color: '#6a994e', cls: 'land-m' },
  volcano:    { icon: '🌄', label: 'Aktivitas Gunung Api', color: '#e63946', cls: 'volcano-m' },
  wind:       { icon: '🌀', label: 'Puting Beliung', color: '#9b5de5', cls: 'wind-m' },
};

const SEVERITIES = {
  kritis: { label: 'KRITIS', color: '#ff2d2d', cls: 'sev-kritis' },
  tinggi: { label: 'TINGGI', color: '#ff8c00', cls: 'sev-tinggi' },
  sedang: { label: 'SEDANG', color: '#ffd600', cls: 'sev-sedang' },
  rendah: { label: 'RENDAH', color: '#00e676', cls: 'sev-rendah' },
};

// Realistic disaster event dataset for Indonesian regions
const INITIAL_EVENTS = [
  {
    id: 'e001', type: 'fire', severity: 'kritis', region: 'kalimantan',
    title: 'Kebakaran Hutan Karhutla Kalbar',
    location: 'Ketapang, Kalimantan Barat',
    lat: -1.85, lng: 109.98,
    time: minutesAgo(8),
    detail: 'Kebakaran hutan dan lahan meluas di Kabupaten Ketapang. Hotspot terpantau 312 titik. Tim BPBD bersama Manggala Agni dikerahkan.',
    hotspots: 312, area_ha: 4580, korban: 0, pengungsi: 250,
    source: 'LAPAN FIRMS / BPBD Kalbar'
  },
  {
    id: 'e002', type: 'earthquake', severity: 'kritis', region: 'sulawesi',
    title: 'Gempa M 6.2 Sulawesi Tengah',
    location: 'Donggala, Sulawesi Tengah',
    lat: -0.67, lng: 119.74,
    time: minutesAgo(22),
    detail: 'Gempa bumi tektonik berkekuatan M 6.2 mengguncang Donggala. Kedalaman 12 km. Peringatan tsunami dikeluarkan dan kemudian dicabut. BMKG memantau aktivitas susulan.',
    magnitude: 6.2, depth: 12, korban: 8, pengungsi: 1200,
    source: 'BMKG / BNPB'
  },
  {
    id: 'e003', type: 'flood', severity: 'tinggi', region: 'papua',
    title: 'Banjir Bandang Manokwari',
    location: 'Manokwari, Papua Barat',
    lat: -0.86, lng: 134.08,
    time: minutesAgo(45),
    detail: 'Banjir bandang melanda Kota Manokwari akibat luapan Sungai Prafi. Ratusan rumah terendam hingga 2 meter. Tim SAR dan BPBD Papua Barat bergerak.',
    tinggi_air: '2.3m', korban: 3, pengungsi: 870, area_terdampak: 'Kel. Sanggeng, Pabar',
    source: 'BPBD Papua Barat / BNPB'
  },
  {
    id: 'e004', type: 'volcano', severity: 'tinggi', region: 'sulawesi',
    title: 'Erupsi Gunung Soputan Sulut',
    location: 'Kab. Minahasa Tenggara, Sulawesi Utara',
    lat: 1.11, lng: 124.73,
    time: minutesAgo(120),
    detail: 'Gunung Soputan erupsi dengan kolom abu setinggi 4.500 meter. Status ditingkatkan ke Level III (Siaga). PVMBG merekomendasikan radius 6.5 km bebas aktivitas.',
    tinggi_kolom: '4500m', level: 'SIAGA (III)', radius_bahaya: '6.5 km',
    source: 'PVMBG / BNPB Sulut'
  },
  {
    id: 'e005', type: 'landslide', severity: 'tinggi', region: 'ntt',
    title: 'Longsor Flores Timur',
    location: 'Larantuka, Flores Timur, NTT',
    lat: -8.34, lng: 122.99,
    time: minutesAgo(180),
    detail: 'Tanah longsor menerjang desa Ile Ape akibat hujan deras. Jalur transportasi terputus. Tim SAR sedang melakukan pencarian korban tertimbun.',
    korban: 5, pengungsi: 430, jalan_terputus: 'Jalur Trans-Flores',
    source: 'BPBD NTT / BNPB'
  },
  {
    id: 'e006', type: 'earthquake', severity: 'sedang', region: 'lombok',
    title: 'Gempa M 4.8 Lombok Utara',
    location: 'Tanjung, Lombok Utara, NTB',
    lat: -8.35, lng: 116.13,
    time: minutesAgo(240),
    detail: 'Gempa bumi magnitudo 4.8 mengguncang Lombok Utara. Kedalaman 10 km. Tidak berpotensi tsunami. Warga diminta tetap waspada terhadap gempa susulan.',
    magnitude: 4.8, depth: 10, korban: 0, pengungsi: 0,
    source: 'BMKG'
  },
  {
    id: 'e007', type: 'fire', severity: 'tinggi', region: 'kalimantan',
    title: 'Karhutla Kapuas Hulu Kalbar',
    location: 'Putussibau, Kapuas Hulu, Kalbar',
    lat: 0.84, lng: 112.93,
    time: minutesAgo(300),
    detail: 'Kebakaran gambut di kawasan Taman Nasional Betung Kerihun. Asap tebal mengganggu penerbangan dan kesehatan warga.',
    hotspots: 187, area_ha: 2100, korban: 0, pengungsi: 120,
    source: 'LAPAN FIRMS'
  },
  {
    id: 'e008', type: 'flood', severity: 'sedang', region: 'sulawesi',
    title: 'Banjir Palu Pasca Hujan',
    location: 'Palu, Sulawesi Tengah',
    lat: -0.90, lng: 119.87,
    time: minutesAgo(360),
    detail: 'Banjir merendam beberapa kelurahan di Palu akibat curah hujan tinggi. Ketinggian air 40–80 cm. Petugas BPBD masih melakukan evakuasi warga.',
    tinggi_air: '0.8m', korban: 0, pengungsi: 320,
    source: 'BPBD Palu'
  },
  {
    id: 'e009', type: 'wind', severity: 'sedang', region: 'ntt',
    title: 'Angin Puting Beliung Kupang',
    location: 'Kupang, NTT',
    lat: -10.16, lng: 123.60,
    time: minutesAgo(420),
    detail: 'Angin puting beliung menerjang kawasan pesisir Kupang. Beberapa rumah rusak, satu kapal nelayan tenggelam. Kecepatan angin mencapai 85 km/jam.',
    kecepatan_angin: '85 km/jam', korban: 2, pengungsi: 85, rumah_rusak: 47,
    source: 'BMKG / BPBD NTT'
  },
  {
    id: 'e010', type: 'fire', severity: 'sedang', region: 'kalimantan',
    title: 'Karhutla Kalteng Palangkaraya',
    location: 'Palangkaraya, Kalimantan Tengah',
    lat: -2.21, lng: 113.92,
    time: minutesAgo(480),
    detail: 'Titik api terdeteksi di sekitar kawasan gambut Kalteng. Kualitas udara mencapai kategori Berbahaya (ISPU > 300).',
    hotspots: 94, area_ha: 800, korban: 0, pengungsi: 0,
    source: 'LAPAN FIRMS / KLHK'
  },
  {
    id: 'e011', type: 'volcano', severity: 'kritis', region: 'sulawesi',
    title: 'Letusan Gunung Lokon',
    location: 'Tomohon, Sulawesi Utara',
    lat: 1.34, lng: 124.79,
    time: minutesAgo(600),
    detail: 'Gunung Lokon mengalami letusan freatik. Radius 2.5 km wajib dikosongkan. Hujan abu mengguyur Kota Tomohon. Status AWAS diberlakukan.',
    level: 'AWAS (IV)', radius_bahaya: '2.5 km', korban: 0, pengungsi: 3400,
    source: 'PVMBG'
  },
  {
    id: 'e012', type: 'flood', severity: 'rendah', region: 'papua',
    title: 'Banjir Rob Merauke',
    location: 'Merauke, Papua Selatan',
    lat: -8.49, lng: 140.40,
    time: minutesAgo(720),
    detail: 'Banjir rob akibat pasang laut tinggi merendam pemukiman pesisir Merauke. Ketinggian air 30–50 cm.',
    tinggi_air: '0.5m', korban: 0, pengungsi: 85,
    source: 'BPBD Merauke'
  },
];

// Volcano status data
const VOLCANO_DATA = [
  { name: 'Gunung Lokon', location: 'Sulut', level: 'awas', lat: 1.34, lng: 124.79 },
  { name: 'Gunung Soputan', location: 'Sulut', level: 'siaga', lat: 1.11, lng: 124.73 },
  { name: 'Gunung Karangetang', location: 'Sulut', level: 'siaga', lat: 2.78, lng: 125.40 },
  { name: 'Gunung Rokatenda', location: 'NTT', level: 'waspada', lat: -8.62, lng: 121.71 },
  { name: 'Gunung Iya', location: 'NTT', level: 'waspada', lat: -8.89, lng: 121.64 },
  { name: 'Gunung Tambora', location: 'NTB', level: 'waspada', lat: -8.24, lng: 117.99 },
  { name: 'Gunung Rinjani', location: 'Lombok', level: 'waspada', lat: -8.41, lng: 116.47 },
  { name: 'Gunung Dukono', location: 'Maluku Utara', level: 'siaga', lat: 1.68, lng: 127.88 },
  { name: 'Gunung Ibu', location: 'Maluku Utara', level: 'siaga', lat: 1.49, lng: 127.63 },
  { name: 'Gunung Semeru', location: 'Jawa Timur', level: 'siaga', lat: -8.11, lng: 112.92 },
];

// BMKG weather alerts
const WEATHER_ALERTS = [
  { icon: '⛈️', title: 'Hujan Lebat - Badai Petir', area: 'Kalimantan Barat & Kalimantan Tengah', level: 'siaga' },
  { icon: '🌊', title: 'Gelombang Tinggi 3-4m', area: 'Laut Banda, Perairan Maluku', level: 'siaga' },
  { icon: '🌪️', title: 'Angin Kencang >60 km/jam', area: 'Sulawesi Selatan, NTT', level: 'waspada' },
  { icon: '🌧️', title: 'Potensi Banjir Bandang', area: 'Papua & Papua Barat', level: 'awas' },
  { icon: '☁️', title: 'Asap Karhutla Tebal', area: 'Kalimantan Tengah, Kalbar', level: 'siaga' },
  { icon: '🌊', title: 'Pasang Laut Ekstrem', area: 'Pesisir Timur Sulawesi', level: 'waspada' },
];

// BNPB regional status
const BNPB_STATUS = [
  { region: 'Kalimantan', events: 14, color: '#ff4500' },
  { region: 'Sulawesi', events: 9, color: '#ff8c00' },
  { region: 'Papua', events: 6, color: '#ff8c00' },
  { region: 'NTT', events: 5, color: '#ffd600' },
  { region: 'Lombok/NTB', events: 3, color: '#ffd600' },
  { region: 'Maluku', events: 4, color: '#ffd600' },
];

// Risk index data
const RISK_DATA = [
  { name: 'Kalimantan Barat', score: 92, cls: 'risk-high' },
  { name: 'Sulawesi Tengah', score: 87, cls: 'risk-high' },
  { name: 'Papua Barat', score: 78, cls: 'risk-high' },
  { name: 'NTT / Flores', score: 74, cls: 'risk-high' },
  { name: 'Lombok Utara', score: 65, cls: 'risk-medium' },
  { name: 'Sulawesi Utara', score: 62, cls: 'risk-medium' },
  { name: 'Kalimantan Tengah', score: 58, cls: 'risk-medium' },
  { name: 'Maluku Utara', score: 55, cls: 'risk-medium' },
];

// Hotspot data per island group
const HOTSPOT_DATA = [
  { label: 'Kalimantan', count: 847 },
  { label: 'Sumatra', count: 612 },
  { label: 'Sulawesi', count: 213 },
  { label: 'Papua', count: 178 },
  { label: 'NTT', count: 89 },
  { label: 'Maluku', count: 54 },
  { label: 'Jawa', count: 23 },
];

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function minutesAgo(m) {
  return new Date(Date.now() - m * 60000);
}

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
}

function formatDate(date) {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function timeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}d lalu`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  events: [...INITIAL_EVENTS],
  activeRegion: 'all',
  filterType: 'all',
  filterSeverity: 'all',
  map: null,
  markers: new Map(),
  selectedEventId: null,
  counts: { fire: 0, flood: 0, earthquake: 0, landslide: 0, volcano: 0, wind: 0 },
};

// ═══════════════════════════════════════════════════════════════
// CLOCK & DATE
// ═══════════════════════════════════════════════════════════════

function initClock() {
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date-display');

  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Jakarta', hour12: false
    });
    dateEl.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ═══════════════════════════════════════════════════════════════
// MAP INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function initMap() {
  const map = L.map('map', {
    center: [-3.0, 122.0],
    zoom: 5,
    zoomControl: true,
    attributionControl: false,
  });

  // Dark satellite tile layer
  const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© CartoDB',
    subdomains: 'abcd'
  });

  const terrainTile = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: '© OpenTopoMap',
    opacity: 0.85
  });

  darkTile.addTo(map);
  state.map = map;
  state.activeTile = darkTile;
  state.terrainTile = terrainTile;

  // Coordinate display
  map.on('mousemove', (e) => {
    const coordEl = document.getElementById('map-coords');
    if (coordEl) {
      coordEl.textContent = `${e.latlng.lat.toFixed(4)}°, ${e.latlng.lng.toFixed(4)}°`;
    }
  });

  // Map layer buttons
  document.getElementById('btn-satellite').addEventListener('click', () => {
    map.removeLayer(state.terrainTile);
    if (!map.hasLayer(darkTile)) darkTile.addTo(map);
    setMapBtn('btn-satellite');
  });
  document.getElementById('btn-terrain').addEventListener('click', () => {
    map.removeLayer(darkTile);
    if (!map.hasLayer(state.terrainTile)) state.terrainTile.addTo(map);
    setMapBtn('btn-terrain');
  });
  document.getElementById('btn-heatmap').addEventListener('click', () => {
    if (!map.hasLayer(darkTile)) darkTile.addTo(map);
    map.removeLayer(state.terrainTile);
    setMapBtn('btn-heatmap');
  });

  return map;
}

function setMapBtn(activeId) {
  ['btn-satellite','btn-terrain','btn-heatmap'].forEach(id => {
    document.getElementById(id).classList.toggle('active', id === activeId);
  });
}

// ═══════════════════════════════════════════════════════════════
// MARKERS
// ═══════════════════════════════════════════════════════════════

function createMarkerIcon(event) {
  const type = DISASTER_TYPES[event.type];
  const isCritical = event.severity === 'kritis';
  const div = document.createElement('div');
  div.className = `disaster-marker ${type.cls}${isCritical ? ' kritis-m' : ''}`;
  div.setAttribute('style', `color: currentColor;`);
  div.innerHTML = type.icon;
  div.style.fontSize = '13px';
  return L.divIcon({
    html: div.outerHTML,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function buildPopupContent(ev) {
  const type = DISASTER_TYPES[ev.type];
  const sev = SEVERITIES[ev.severity];
  const severityColor = sev.color;
  return `
    <div>
      <div class="popup-badge" style="background:${severityColor}20;color:${severityColor};border:1px solid ${severityColor}40">
        ${sev.label}
      </div>
      <div class="popup-title">${type.icon} ${ev.title}</div>
      <div class="popup-loc">📍 ${ev.location}</div>
      <div class="popup-time">⏱ ${timeAgo(ev.time)} · ${formatTime(ev.time)} WIB</div>
      <div class="popup-detail">${ev.detail.substring(0, 120)}...</div>
      <div style="margin-top:8px">
        <span style="font-size:9px;color:#7ecfff;cursor:pointer;text-decoration:underline;" onclick="openModal('${ev.id}')">Lihat detail lengkap →</span>
      </div>
    </div>
  `;
}

function addEventMarker(event) {
  if (state.markers.has(event.id)) {
    state.map.removeLayer(state.markers.get(event.id));
  }
  const marker = L.marker([event.lat, event.lng], { icon: createMarkerIcon(event) })
    .bindPopup(buildPopupContent(event), { maxWidth: 260 })
    .on('click', () => openModal(event.id));
  marker.addTo(state.map);
  state.markers.set(event.id, marker);
}

function renderAllMarkers() {
  state.markers.forEach((m) => state.map.removeLayer(m));
  state.markers.clear();
  const filtered = getFilteredEvents();
  filtered.forEach(ev => addEventMarker(ev));
}

// ═══════════════════════════════════════════════════════════════
// FILTERS & EVENT FEED
// ═══════════════════════════════════════════════════════════════

function getFilteredEvents() {
  return state.events.filter(ev => {
    if (state.activeRegion !== 'all' && ev.region !== state.activeRegion) return false;
    if (state.filterType !== 'all' && ev.type !== state.filterType) return false;
    if (state.filterSeverity !== 'all' && ev.severity !== state.filterSeverity) return false;
    return true;
  });
}

function renderEventFeed() {
  const feed = document.getElementById('events-feed');
  const events = getFilteredEvents();

  if (events.length === 0) {
    feed.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">Tidak ada kejadian yang cocok dengan filter.</div>`;
    return;
  }

  feed.innerHTML = events.map(ev => {
    const type = DISASTER_TYPES[ev.type];
    const sev = SEVERITIES[ev.severity];
    return `
      <div class="event-item" id="ev-${ev.id}" onclick="openModal('${ev.id}')">
        <div class="event-severity ${sev.cls}"></div>
        <div class="event-icon">${type.icon}</div>
        <div class="event-body">
          <div class="event-title">${ev.title}</div>
          <div class="event-loc">📍 ${ev.location}</div>
          <div class="event-meta">
            <span class="event-time">${timeAgo(ev.time)}</span>
            <span class="event-tag" style="color:${sev.color}">${sev.label}</span>
            <span class="event-tag">${type.label}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// STATS COUNTERS
// ═══════════════════════════════════════════════════════════════

function updateStats() {
  const counts = { fire: 0, flood: 0, earthquake: 0, landslide: 0, volcano: 0, wind: 0 };
  const newCounts = { fire: 0, flood: 0, earthquake: 0, landslide: 0, volcano: 0, wind: 0 };
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // last 1h = "new"

  state.events.forEach(ev => {
    counts[ev.type] = (counts[ev.type] || 0) + 1;
    if (ev.time > cutoff) newCounts[ev.type] = (newCounts[ev.type] || 0) + 1;
  });

  const map = { fire: 'fire', flood: 'flood', earthquake: 'quake', landslide: 'land', volcano: 'volcano', wind: 'wind' };

  Object.entries(map).forEach(([type, key]) => {
    const countEl = document.getElementById(`count-${key}`);
    const badgeEl = document.getElementById(`badge-${key}`);
    if (countEl) {
      animateCounter(countEl, parseInt(countEl.textContent) || 0, counts[type] || 0);
    }
    if (badgeEl) {
      const n = newCounts[type] || 0;
      badgeEl.textContent = `+${n} baru`;
      badgeEl.className = `stat-badge${n > 0 ? ' new' : ''}`;
    }
  });

  state.counts = counts;
}

function animateCounter(el, from, to) {
  const duration = 600;
  const steps = 20;
  const step = (to - from) / steps;
  let current = from;
  let count = 0;
  const interval = setInterval(() => {
    current += step;
    count++;
    el.textContent = Math.round(current);
    if (count >= steps) {
      el.textContent = to;
      clearInterval(interval);
    }
  }, duration / steps);
}

// ═══════════════════════════════════════════════════════════════
// TICKER
// ═══════════════════════════════════════════════════════════════

function renderTicker() {
  const track = document.getElementById('ticker-track');
  const critical = state.events.filter(e => e.severity === 'kritis' || e.severity === 'tinggi')
    .sort((a, b) => b.time - a.time);

  const items = [...critical, ...critical].map(ev => {
    const type = DISASTER_TYPES[ev.type];
    return `
      <span class="ticker-item">
        ${type.icon}
        <span class="t-type">${type.label.toUpperCase()}</span>
        —
        <span class="t-loc">${ev.location}</span>
        · ${timeAgo(ev.time)}
        · Status: <span style="color:${SEVERITIES[ev.severity].color}">${SEVERITIES[ev.severity].label}</span>
      </span>
    `;
  }).join('<span style="opacity:0.3;padding:0 20px">◆</span>');

  track.innerHTML = items;
}

// ═══════════════════════════════════════════════════════════════
// BMKG WEATHER ALERTS
// ═══════════════════════════════════════════════════════════════

function renderWeatherAlerts() {
  const container = document.getElementById('weather-alerts');
  container.innerHTML = WEATHER_ALERTS.map(w => `
    <div class="weather-item">
      <span class="weather-icon">${w.icon}</span>
      <div class="weather-body">
        <div class="weather-title">${w.title}</div>
        <div class="weather-area">${w.area}</div>
      </div>
      <span class="weather-level lvl-${w.level}">${w.level.toUpperCase()}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
// BNPB STATUS
// ═══════════════════════════════════════════════════════════════

function renderBNPBStatus() {
  const container = document.getElementById('bnpb-status');
  container.innerHTML = BNPB_STATUS.map(item => `
    <div class="bnpb-item">
      <div class="bnpb-status-dot" style="background:${item.color};box-shadow:0 0 6px ${item.color}"></div>
      <div class="bnpb-region">${item.region}</div>
      <div class="bnpb-count" style="color:${item.color}">${item.events}</div>
      <span style="font-size:9px;color:var(--text-muted)">kejadian</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
// RISK INDEX
// ═══════════════════════════════════════════════════════════════

function renderRiskIndex() {
  const container = document.getElementById('risk-list');
  container.innerHTML = RISK_DATA.map(r => `
    <div class="risk-item ${r.cls}">
      <div class="risk-header">
        <span class="risk-region">${r.name}</span>
        <span class="risk-score">${r.score}/100</span>
      </div>
      <div class="risk-bar-bg">
        <div class="risk-bar-fill" style="width:0%" data-target="${r.score}"></div>
      </div>
    </div>
  `).join('');

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.risk-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 100);
}

// ═══════════════════════════════════════════════════════════════
// VOLCANO STATUS
// ═══════════════════════════════════════════════════════════════

function renderVolcanoStatus() {
  const container = document.getElementById('volcano-list');
  container.innerHTML = VOLCANO_DATA.map(v => `
    <div class="volcano-item" onclick="flyToLocation(${v.lat}, ${v.lng}, 9)">
      <span style="font-size:18px">🌋</span>
      <div style="flex:1;min-width:0">
        <div class="volcano-name">${v.name}</div>
        <div class="volcano-loc">${v.location}</div>
      </div>
      <span class="volcano-level vl-${v.level}">${v.level.toUpperCase()}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
// HOTSPOT CHART
// ═══════════════════════════════════════════════════════════════

function renderHotspotChart() {
  const container = document.getElementById('hotspot-chart');
  const max = Math.max(...HOTSPOT_DATA.map(h => h.count));
  const total = HOTSPOT_DATA.reduce((sum, h) => sum + h.count, 0);

  container.innerHTML = `
    <div style="font-size:10px;color:var(--text-secondary);margin-bottom:8px;">
      Total: <strong style="color:var(--text-primary);font-family:var(--font-mono)">${total.toLocaleString('id-ID')}</strong> titik api terpantau hari ini
    </div>
    <div class="hotspot-bars">
      ${HOTSPOT_DATA.map(h => `
        <div class="hotspot-row">
          <div class="hotspot-label">${h.label}</div>
          <div class="hotspot-bar-bg">
            <div class="hotspot-bar-fill" style="width:0%" data-target="${(h.count / max * 100).toFixed(1)}"></div>
          </div>
          <div class="hotspot-count">${h.count}</div>
        </div>
      `).join('')}
    </div>
  `;

  setTimeout(() => {
    container.querySelectorAll('.hotspot-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 200);
}

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════

window.openModal = function(eventId) {
  const ev = state.events.find(e => e.id === eventId);
  if (!ev) return;

  const type = DISASTER_TYPES[ev.type];
  const sev = SEVERITIES[ev.severity];
  state.selectedEventId = eventId;

  // Fly to location on map
  if (state.map) {
    state.map.flyTo([ev.lat, ev.lng], 9, { duration: 1.5 });
  }

  // Build extra fields
  const extraFields = [];
  if (ev.magnitude) extraFields.push({ label: 'Magnitudo', value: `M ${ev.magnitude}` });
  if (ev.depth) extraFields.push({ label: 'Kedalaman', value: `${ev.depth} km` });
  if (ev.hotspots) extraFields.push({ label: 'Hotspot', value: ev.hotspots });
  if (ev.area_ha) extraFields.push({ label: 'Luas Terbakar', value: `${ev.area_ha.toLocaleString()} ha` });
  if (ev.tinggi_air) extraFields.push({ label: 'Tinggi Air', value: ev.tinggi_air });
  if (ev.tinggi_kolom) extraFields.push({ label: 'Kolom Abu', value: ev.tinggi_kolom });
  if (ev.level) extraFields.push({ label: 'Level Vulkanik', value: ev.level });
  if (ev.radius_bahaya) extraFields.push({ label: 'Radius Bahaya', value: ev.radius_bahaya });
  if (ev.kecepatan_angin) extraFields.push({ label: 'Kecepatan Angin', value: ev.kecepatan_angin });
  extraFields.push({ label: 'Korban', value: ev.korban !== undefined ? ev.korban : '-' });
  extraFields.push({ label: 'Pengungsi', value: ev.pengungsi !== undefined ? ev.pengungsi.toLocaleString() : '-' });

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-event-icon">${type.icon}</div>
    <div style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;
      background:${sev.color}20;color:${sev.color};border:1px solid ${sev.color}40;margin-bottom:8px;">
      ${sev.label}
    </div>
    <div class="modal-title">${ev.title}</div>
    <div class="modal-loc">📍 ${ev.location}</div>
    <div style="font-size:10px;color:var(--text-muted);margin-bottom:12px;font-family:var(--font-mono)">
      ⏱ ${formatDate(ev.time)} · ${formatTime(ev.time)} WIB
    </div>
    <div class="modal-body">${ev.detail}</div>
    <div class="modal-grid">
      ${extraFields.map(f => `
        <div class="modal-field">
          <div class="modal-field-label">${f.label}</div>
          <div class="modal-field-value">${f.value}</div>
        </div>
      `).join('')}
    </div>
    <div style="font-size:10px;color:var(--text-muted);margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      🗂 Sumber: ${ev.source}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="flyToLocation(${ev.lat}, ${ev.lng}, 10)" class="map-btn" style="flex:1;padding:8px;font-size:11px;text-align:center;">
        🗺️ Lihat di Peta
      </button>
      <button onclick="closeModal()" class="map-btn" style="flex:1;padding:8px;font-size:11px;text-align:center;">
        ✕ Tutup
      </button>
    </div>
  `;

  document.getElementById('modal-overlay').classList.add('visible');
};

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.remove('visible');
};

window.flyToLocation = function(lat, lng, zoom) {
  if (state.map) state.map.flyTo([lat, lng], zoom || 9, { duration: 1.5 });
  closeModal();
};

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ═══════════════════════════════════════════════════════════════
// REGION TABS
// ═══════════════════════════════════════════════════════════════

function initRegionTabs() {
  document.querySelectorAll('.region-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeRegion = tab.dataset.region;

      // Fly to region
      if (state.activeRegion !== 'all' && REGIONS[state.activeRegion]) {
        const r = REGIONS[state.activeRegion];
        state.map.flyTo(r.center, state.activeRegion === 'lombok' ? 10 : 7, { duration: 1.2 });
      } else {
        state.map.flyTo([-3.0, 122.0], 5, { duration: 1.2 });
      }

      renderEventFeed();
      renderAllMarkers();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════

function initFilters() {
  document.getElementById('filter-type').addEventListener('change', (e) => {
    state.filterType = e.target.value;
    renderEventFeed();
    renderAllMarkers();
  });
  document.getElementById('filter-severity').addEventListener('change', (e) => {
    state.filterSeverity = e.target.value;
    renderEventFeed();
    renderAllMarkers();
  });
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

function showToast(event) {
  const type = DISASTER_TYPES[event.type];
  const sev = SEVERITIES[event.severity];
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast toast-${event.type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type.icon}</div>
    <div class="toast-body">
      <div class="toast-title" style="color:${sev.color}">[${sev.label}] ${event.title}</div>
      <div class="toast-sub">${event.location} · ${timeAgo(event.time)}</div>
    </div>
  `;
  toast.addEventListener('click', () => openModal(event.id));
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// ═══════════════════════════════════════════════════════════════
// SIMULATED REAL-TIME UPDATES
// ═══════════════════════════════════════════════════════════════

const NEW_EVENT_TEMPLATES = [
  {
    type: 'fire', severity: 'tinggi', region: 'kalimantan',
    title: 'Hotspot Baru Terdeteksi Kalimantan Selatan',
    location: 'Banjarbaru, Kalimantan Selatan',
    lat: -3.44, lng: 114.83,
    detail: 'Satelit LAPAN mendeteksi titik api baru di kawasan gambut Kalsel. Tim darat sedang menuju lokasi.',
    hotspots: 45, area_ha: 320, korban: 0, pengungsi: 0,
    source: 'LAPAN FIRMS / BPBD Kalsel'
  },
  {
    type: 'earthquake', severity: 'sedang', region: 'papua',
    title: 'Gempa M 5.1 Jayapura',
    location: 'Kota Jayapura, Papua',
    lat: -2.53, lng: 140.72,
    detail: 'Gempa tektonik dangkal mengguncang Jayapura. Warga berhamburan keluar gedung. Tidak ada laporan kerusakan berarti.',
    magnitude: 5.1, depth: 15, korban: 0, pengungsi: 0,
    source: 'BMKG'
  },
  {
    type: 'flood', severity: 'sedang', region: 'sulawesi',
    title: 'Banjir Makassar Sulsel',
    location: 'Makassar, Sulawesi Selatan',
    lat: -5.15, lng: 119.41,
    detail: 'Hujan deras menyebabkan genangan di beberapa titik Kota Makassar. Ketinggian air 20-60 cm.',
    tinggi_air: '0.6m', korban: 0, pengungsi: 180,
    source: 'BPBD Makassar'
  },
  {
    type: 'wind', severity: 'rendah', region: 'ntt',
    title: 'Angin Kencang Ende NTT',
    location: 'Ende, Flores, NTT',
    lat: -8.84, lng: 121.66,
    detail: 'Angin kencang dan hujan lebat melanda wilayah Ende. Beberapa pohon tumbang di jalur utama.',
    kecepatan_angin: '55 km/jam', korban: 0, pengungsi: 0,
    source: 'BMKG / BPBD NTT'
  },
];

let templateIdx = 0;
let eventCounter = 100;

function simulateNewEvent() {
  const template = NEW_EVENT_TEMPLATES[templateIdx % NEW_EVENT_TEMPLATES.length];
  templateIdx++;

  const newEvent = {
    ...template,
    id: `e${++eventCounter}`,
    time: new Date(),
    lat: template.lat + (Math.random() - 0.5) * 0.5,
    lng: template.lng + (Math.random() - 0.5) * 0.5,
  };

  state.events.unshift(newEvent);

  // Add marker
  addEventMarker(newEvent);

  // Refresh feed & stats
  renderEventFeed();
  updateStats();
  renderTicker();

  // Show notification
  showToast(newEvent);

  // Highlight new item briefly
  setTimeout(() => {
    const el = document.getElementById(`ev-${newEvent.id}`);
    if (el) {
      el.classList.add('new-event');
      setTimeout(() => el.classList.remove('new-event'), 800);
    }
  }, 50);
}

// ═══════════════════════════════════════════════════════════════
// REFRESH INTERVALS
// ═══════════════════════════════════════════════════════════════

function startRealTimeUpdates() {
  // New event every 45 seconds (simulated)
  setInterval(simulateNewEvent, 45000);

  // Update time-ago labels every 30 seconds
  setInterval(() => {
    renderEventFeed();
    renderTicker();
  }, 30000);

  // Update stats every 10 seconds
  setInterval(updateStats, 10000);
}

// ═══════════════════════════════════════════════════════════════
// VOLCANO MARKERS ON MAP
// ═══════════════════════════════════════════════════════════════

function addVolcanoMarkersToMap() {
  VOLCANO_DATA.forEach(v => {
    const colorMap = { normal: '#00e676', waspada: '#ffd600', siaga: '#ff8c00', awas: '#ff2d2d' };
    const color = colorMap[v.level] || '#ffd600';

    const div = document.createElement('div');
    div.style.cssText = `
      width:20px;height:20px;border-radius:50%;
      background:${color}33;border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:11px;cursor:pointer;
      box-shadow:0 0 10px ${color}66;
    `;
    div.innerHTML = '🌋';

    const icon = L.divIcon({ html: div.outerHTML, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
    L.marker([v.lat, v.lng], { icon })
      .bindPopup(`
        <div>
          <div style="font-weight:700;font-size:12px;margin-bottom:4px">🌋 ${v.name}</div>
          <div style="font-size:10px;color:#7ecfff">${v.location}</div>
          <div style="margin-top:6px;font-size:10px">
            Status: <span style="color:${color};font-weight:700">${v.level.toUpperCase()}</span>
          </div>
        </div>
      `)
      .addTo(state.map);
  });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  console.log('SIAGA — Sistem Informasi Bencana Indonesia initialized');

  // Clock
  initClock();

  // Map
  initMap();

  // Render all sections
  renderTicker();
  renderWeatherAlerts();
  renderBNPBStatus();
  renderRiskIndex();
  renderVolcanoStatus();
  renderHotspotChart();
  renderEventFeed();
  updateStats();

  // Add markers to map
  state.events.forEach(ev => addEventMarker(ev));
  addVolcanoMarkersToMap();

  // Tabs and filters
  initRegionTabs();
  initFilters();

  // Start live updates
  startRealTimeUpdates();

  // First toast for demo
  setTimeout(() => showToast(state.events[0]), 2000);
  setTimeout(() => showToast(state.events[1]), 5000);

  console.log(`Loaded ${state.events.length} disaster events`);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
