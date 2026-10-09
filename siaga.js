/**
 * CYBER PAMINAL MONITORING KARHUTLA v3.1 — siaga.js
 * Realtime: BMKG Gempa | BNPB Bencana | Mediaanalis News API | Gemini AI
 */
'use strict';

// ═══════════════════════════════════════════════════════════
//  CONFIG — API KEYS & ENDPOINTS
// ═══════════════════════════════════════════════════════════

// Semua model Gemini yang mungkin tersedia (urutan: terbaru → terlama)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
];
// Endpoint: coba v1beta dulu, fallback ke v1
const GEMINI_BASES = [
  'https://generativelanguage.googleapis.com/v1beta/models/',
  'https://generativelanguage.googleapis.com/v1/models/',
];
let activeGeminiModel = GEMINI_MODELS[0];
let activeGeminiBase = GEMINI_BASES[0];

// Gemini API key (format AQ. adalah format VALID untuk project Google AI Studio baru)
const _savedGeminiKey = localStorage.getItem('siaga_gemini_key') || 'AQ.Ab8RN6KX97Z_QUC5OG0sMIuAVJlKP8xVtiqeGsbTm3SgTjpezQ';

const CFG = {
  geminiKey: _savedGeminiKey,
  get geminiUrl(){ return `https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent`; },

  newsToken:  'tmk_c07397c6b8be74c8f04576fa33830a3484aa16060554222b',
  newsToken2: 'tmk_a2c7aa84a341b07d7abb41a18f052dcce93fac36b2b81306', // token gempa/bencana
  newsUrl:    'https://mediaanalis.jayaciptadigital.com/api/public/news',

  bmkgGempa:     'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
  bmkgDirasakan: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json',
  bmkgAuto:      'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',

  refreshNews: 90000,
  refreshBmkg: 30000,   // 30 detik — realtime
};

// ═══════════════════════════════════════════════════════════
//  ICON & MARKER HELPERS  (tanpa emoji — SVG sprite di index.html)
// ═══════════════════════════════════════════════════════════

/** SVG icon dari sprite (#i-<name>) */
// Ikon bencana multi-warna (gradient, vektor HD). Nama lain tetap ikon garis biasa.
const RICH_ICO = new Set(['flame','quake','waves','mountain','volcano','wind','target','shield']);
function ico(name,size){
  const st = size ? ` style="width:${size}px;height:${size}px"` : '';
  if(RICH_ICO.has(name)) return `<svg class="ico rich"${st}><use href="#m-${name}"/></svg>`;
  return `<svg class="ico"${st}><use href="#i-${name}"/></svg>`;
}
window.ico = ico;

/** Warna gempa berdasarkan magnitudo */
function magColor(m){
  return m>=6.5 ? '#ff2e4d'
       : m>=5.5 ? '#ff7a1a'
       : m>=4.5 ? '#ffb020'
       : m>=3.5 ? '#ffe14a'
       :          '#8fb3d9';
}
function hexRgb(h){
  h=String(h).replace('#','');
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}
/** Escape string untuk dipakai di dalam onclick="fn('...')" */
function jsq(s){
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/[\r\n]+/g,' ');
}
function titleCase(s){
  return String(s||'').replace(/\b\w/g,c=>c.toUpperCase());
}

/**
 * Beacon marker menyala untuk kejadian gempa / kebakaran.
 *  kind  : 'quake' | 'fire'
 *  live  : kedip aktif (kejadian < 30 menit)
 *  hot   : kedip cepat + halo/sweep (< 10 menit, atau gempa besar/tsunami sampai 30 menit)
 *  glow/old : fase setelah 30 menit — denyut lembut (< 24 jam) lalu redup (otomatis lewat tickBeacons)
 */
// Siklus hidup beacon — pola kedip berubah sendiri seiring waktu, tanpa menunggu data baru:
//   < 10 menit : HOT  — kedip cepat + halo / sweep
//   < 30 menit : LIVE — kedip sedang (satu cincin riak)
//   < 24 jam   : GLOW — tetap menyala, denyut lembut (pola kedip berubah)
//   lebih lama : OLD  — redup, tanpa animasi
const BCN_HOT_MIN = 10, BCN_LIVE_MIN = 30, BCN_GLOW_MIN = 1440;
function beaconState(ageMin, boost){
  if(ageMin < BCN_HOT_MIN || (boost && ageMin < BCN_LIVE_MIN)) return 'hot';
  if(ageMin < BCN_LIVE_MIN) return 'live';
  return ageMin < BCN_GLOW_MIN ? 'glow' : 'old';
}
function bcnStateClass(st){
  return st==='hot' ? ' live hot' : st==='live' ? ' live' : st==='glow' ? ' glow' : ' old';
}
function setBcnState(el, st){
  el.classList.remove('live','hot','glow','old');
  bcnStateClass(st).trim().split(' ').forEach(c=>el.classList.add(c));
  el.dataset.st = st;
}

function beaconIcon(o){
  const size  = o.size || 32;
  const timed = o.t != null;
  const st    = timed ? beaconState((Date.now()-o.t)/60000, o.boost) : (o.hot?'hot':o.live?'live':'old');
  const cls   = `bcn bcn-${o.kind}${bcnStateClass(st)}${o.tsu?' tsu':''}`;
  const html  =
    `<div class="${cls}" data-st="${st}"${timed?` data-t="${o.t}" data-b="${o.boost?1:0}"`:''} style="--c:${o.color};--cd:${o.color}33;--s:${size}px;--d:${(Math.random()*3.5).toFixed(2)}s">`+
      (o.kind==='quake' && st==='hot' ? '<i class="bcn-sweep"></i>' : '<i class="bcn-halo"></i>')+
      '<i class="bcn-ring r1"></i><i class="bcn-ring r2"></i><i class="bcn-ring r3"></i>'+
      (o.big ? '<i class="bcn-spin"></i>' : '')+
      `<span class="bcn-core">${ico(o.kind==='fire'?'flame':'quake')}</span>`+
      (o.tag ? `<span class="bcn-tag">${o.tag}</span>` : '')+
    '</div>';
  return L.divIcon({html,className:'',iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]});
}

// ═══════════════════════════════════════════════════════════
//  DISASTER META
// ═══════════════════════════════════════════════════════════

const DT = {
  fire:       {ico:'flame',   icon:ico('flame'),   label:'Kebakaran',       color:'#ff5a1f',cls:'dm-fire'},
  flood:      {ico:'waves',   icon:ico('waves'),   label:'Banjir',          color:'#38d4ff',cls:'dm-flood'},
  earthquake: {ico:'quake',   icon:ico('quake'),   label:'Gempa Bumi',      color:'#ffb020',cls:'dm-quake'},
  landslide:  {ico:'mountain',icon:ico('mountain'),label:'Tanah Longsor',   color:'#8bc34a',cls:'dm-land'},
  volcano:    {ico:'volcano', icon:ico('volcano'), label:'Gunung Api',      color:'#ff3355',cls:'dm-volcano'},
  wind:       {ico:'wind',    icon:ico('wind'),    label:'Puting Beliung',  color:'#a06bff',cls:'dm-wind'},
  hotspot:    {ico:'target',  icon:ico('target'),  label:'Hotspot',         color:'#ff8a1a',cls:'dm-fire'},
};

const SEV = {
  kritis:{label:'KRITIS',color:'#ff2e4d'},
  tinggi:{label:'TINGGI',color:'#ff8a1a'},
  sedang:{label:'SEDANG',color:'#ffd21a'},
  rendah:{label:'RENDAH',color:'#22ffa0'},
};

const REGION_VIEW = {
  all:{c:[-3,122],z:5},kalimantan:{c:[0.5,114],z:6},sulawesi:{c:[-2,121.5],z:6},
  papua:{c:[-5,138],z:6},ntt:{c:[-9.5,124],z:7},lombok:{c:[-8.6,116.3],z:9},
  maluku:{c:[-3,128],z:7},jawa:{c:[-7.5,110],z:7},sumatra:{c:[0.5,101],z:6},
};

const LAYERS_CFG = [
  {id:'earthquake',label:'GEMPA BMKG',     ico:'quake',   color:'#ffb020',on:true},
  {id:'fire',      label:'KEBAKARAN',       ico:'flame',   color:'#ff5a1f',on:true},
  {id:'hotspot',   label:'HOTSPOT LAPAN',   ico:'target',  color:'#ff8a1a',on:true},
  {id:'flood',     label:'BANJIR BNPB',     ico:'waves',   color:'#38d4ff',on:true},
  {id:'landslide', label:'TANAH LONGSOR',   ico:'mountain',color:'#8bc34a',on:true},
  {id:'volcano',   label:'GUNUNG API',      ico:'volcano', color:'#ff3355',on:true},
  {id:'wind',      label:'ANGIN KENCANG',   ico:'wind',    color:'#a06bff',on:true},
  {id:'bnpb',      label:'POS BNPB/BPBD',  ico:'shield',  color:'#00f0ff',on:true},
];

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  BASELINE DATA — hanya gunung api (statis dari PVMBG)
// ═══════════════════════════════════════════════════════════
const VOLCANOES = [
  {n:'G. Lokon',loc:'Sulut',lat:1.34,lng:124.79,lv:'awas'},{n:'G. Soputan',loc:'Sulut',lat:1.11,lng:124.73,lv:'siaga'},
  {n:'G. Karangetang',loc:'Sulut',lat:2.78,lng:125.40,lv:'siaga'},{n:'G. Dukono',loc:'Malut',lat:1.68,lng:127.88,lv:'siaga'},
  {n:'G. Ibu',loc:'Malut',lat:1.49,lng:127.63,lv:'siaga'},{n:'G. Rokatenda',loc:'NTT',lat:-8.62,lng:121.71,lv:'waspada'},
  {n:'G. Iya',loc:'NTT',lat:-8.89,lng:121.64,lv:'waspada'},{n:'G. Tambora',loc:'NTB',lat:-8.24,lng:117.99,lv:'waspada'},
  {n:'G. Rinjani',loc:'Lombok',lat:-8.41,lng:116.47,lv:'waspada'},{n:'G. Semeru',loc:'Jatim',lat:-8.11,lng:112.92,lv:'siaga'},
  {n:'G. Merapi',loc:'DIY',lat:-7.54,lng:110.44,lv:'siaga'},{n:'G. Sinabung',loc:'Sumut',lat:3.17,lng:98.39,lv:'waspada'},
  {n:'G. Anak Krakatau',loc:'Selat Sunda',lat:-6.10,lng:105.42,lv:'waspada'},
];



// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════

const S = {
  events:[],          // kosong — tidak ada data mock
  bmkgGempa:[],
  map:null,
  mMarkers:new Map(),
  bmkgMarkers:[],
  hsMarkers:[],
  volMarkers:[],
  newsMarkers:[],
  layers:Object.fromEntries(LAYERS_CFG.map(l=>[l.id,l.on])),
  region:'all',
  tvMuted:true,
  allNews:[],
  newsFilter:{sentiment:'all',type:null,page:1},
  newsTotalPages:1,
  geminiReady:false,
  aiTyping:false,
  aiHistory:[],
  lastSimId:3000,
  updateLog:[],
  fireIncidents:[],       // kebakaran terdeteksi dari berita (untuk radar/chip/ticker)
  bmkgMarkerMap:new Map(),
  bnpbMarkers:[],
  seenInc:new Set(),      // id kejadian yang sudah pernah memicu alarm
  _incInit:{},
};

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════

function ago(m){ return new Date(Date.now()-m*60000); }
function pad(n){ return String(n).padStart(2,'0'); }
function timeAgo(d){
  const s=Math.floor((Date.now()-new Date(d))/1000);
  if(s<60) return s+'d lalu';
  const m=Math.floor(s/60); if(m<60) return m+'m lalu';
  const h=Math.floor(m/60); if(h<24) return h+'j lalu';
  return Math.floor(h/24)+'h lalu';
}
function fmtTime(d){ return new Date(d).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Jakarta',hour12:false})+' WIB'; }
function fmtDate(d){ return new Date(d).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})+' WIB'; }

function detectType(title='',body=''){
  const t=(title+' '+body).toLowerCase();
  if(/kebakaran|karhutla|titik api|hotspot|gambut/.test(t)) return 'fire';
  if(/gempa|tsunami|seismik|magnitudo/.test(t)) return 'earthquake';
  if(/banjir|rob|banjir bandang|genangan/.test(t)) return 'flood';
  if(/longsor|gerakan tanah|tanah longsor/.test(t)) return 'landslide';
  if(/gunung|erupsi|vulkanik|abu vulkanik|pvmbg|kawah/.test(t)) return 'volcano';
  if(/angin|puting beliung|topan|badai|siklon/.test(t)) return 'wind';
  return null;
}

function detectLoc(title='',body=''){
  const t=(title+' '+body).toLowerCase();
  const locs=[
    ['kalimantan barat','Kalbar'],['kalimantan tengah','Kalteng'],['kalimantan selatan','Kalsel'],
    ['kalimantan timur','Kaltim'],['kalimantan utara','Kaltara'],['kalimantan','Kalimantan'],
    ['sulawesi tengah','Sulteng'],['sulawesi selatan','Sulsel'],['sulawesi utara','Sulut'],
    ['sulawesi tenggara','Sultra'],['sulawesi barat','Sulbar'],['sulawesi','Sulawesi'],
    ['papua barat','Papua Barat'],['papua selatan','Papua Selatan'],['papua','Papua'],
    ['flores timur','Flores Timur'],['nusa tenggara timur','NTT'],['flores','Flores'],
    ['timor','Timor'],['ntt','NTT'],['lombok','Lombok'],['nusa tenggara barat','NTB'],
    ['sumbawa','Sumbawa'],['bima','Bima'],['maluku utara','Malut'],['maluku','Maluku'],
    ['ternate','Ternate'],['ambon','Ambon'],['donggala','Donggala'],['palu','Palu'],
    ['tomohon','Tomohon'],['manado','Manado'],['makassar','Makassar'],
    ['manokwari','Manokwari'],['jayapura','Jayapura'],['merauke','Merauke'],
    ['sorong','Sorong'],['kupang','Kupang'],['ende','Ende'],['maumere','Maumere'],
    ['mataram','Mataram'],['palangkaraya','Palangkaraya'],['balikpapan','Balikpapan'],
    ['samarinda','Samarinda'],['banjarmasin','Banjarmasin'],['pontianak','Pontianak'],
    ['ketapang','Ketapang'],['tarakan','Tarakan'],
  ];
  for(const [k,v] of locs) if(t.includes(k)) return v;
  return null;
}

// ── Geocoding Indonesia: kota/wilayah → [lat, lng] ──
const GEO_ID = [
  // Kalimantan
  ['pontianak',[-0.02,109.34]],['ketapang',[-1.82,109.98]],['palangkaraya',[-2.21,113.92]],
  ['banjarmasin',[-3.32,114.59]],['balikpapan',[-1.27,116.83]],['samarinda',[0.50,117.15]],
  ['tarakan',[3.30,117.58]],['tanjung selor',[2.84,117.37]],['bontang',[0.13,117.50]],
  ['kapuas hulu',[0.84,112.93]],['kutai',[0.45,116.50]],['sintang',[-0.07,111.49]],
  ['sangatta',[0.14,117.58]],['nunukan',[4.13,117.66]],['berau',[2.15,117.43]],
  ['kalimantan barat',[0.00,110.00]],['kalimantan tengah',[-1.50,113.50]],
  ['kalimantan selatan',[-2.50,115.50]],['kalimantan timur',[0.50,116.50]],
  ['kalimantan utara',[3.00,116.50]],['kalimantan',[-1.00,114.00]],
  // Sulawesi
  ['makassar',[-5.14,119.43]],['palu',[-0.90,119.87]],['donggala',[-0.67,119.74]],
  ['manado',[1.48,124.84]],['tomohon',[1.34,124.79]],['gorontalo',[0.54,123.06]],
  ['kendari',[-3.97,122.51]],['bau-bau',[-5.47,122.63]],['kolaka',[-4.05,121.58]],
  ['pare-pare',[-4.01,119.63]],['palopo',[-3.00,120.19]],['mamuju',[-2.68,118.89]],
  ['poso',[-1.39,120.75]],['luwuk',[-0.84,122.59]],['morowali',[-2.00,121.50]],
  ['sigi',[-1.20,119.90]],['sulawesi tengah',[-1.43,121.44]],
  ['sulawesi selatan',[-3.67,120.00]],['sulawesi utara',[1.00,124.50]],
  ['sulawesi tenggara',[-4.00,122.50]],['sulawesi barat',[-2.50,119.00]],
  ['sulawesi',[-2.00,121.00]],
  // Papua
  ['jayapura',[-2.53,140.72]],['sorong',[-0.87,131.25]],['manokwari',[-0.86,134.08]],
  ['merauke',[-8.49,140.40]],['biak',[-1.17,136.07]],['nabire',[-3.37,135.49]],
  ['fakfak',[-2.93,132.30]],['timika',[-4.52,136.89]],['wamena',[-4.09,138.95]],
  ['sarmi',[-1.87,138.75]],['sentani',[-2.58,140.52]],['oksibil',[-4.90,140.63]],
  ['papua',[-4.00,137.00]],['papua barat',[-1.50,133.00]],
  // NTT & NTB
  ['kupang',[-10.16,123.60]],['ende',[-8.85,121.66]],['maumere',[-8.62,122.21]],
  ['flores',[-8.60,121.00]],['flores timur',[-8.34,122.99]],['ile ape',[-8.34,122.99]],
  ['larantuka',[-8.34,122.97]],['ruteng',[-8.61,120.47]],['bajawa',[-8.79,120.96]],
  ['atambua',[-9.10,124.89]],['soe',[-9.86,124.28]],['maumere',[-8.63,122.21]],
  ['ntt',[-8.65,121.00]],['nusa tenggara timur',[-8.65,121.00]],
  ['mataram',[-8.58,116.10]],['lombok',[-8.55,116.35]],['sumbawa besar',[-8.49,117.42]],
  ['bima',[-8.47,118.74]],['sumbawa',[-8.50,117.50]],
  ['nusa tenggara barat',[-8.65,117.00]],
  // Maluku
  ['ambon',[-3.69,128.18]],['ternate',[0.79,127.38]],['sofifi',[0.73,127.57]],
  ['masohi',[-3.33,128.92]],['tual',[-5.65,132.75]],['saumlaki',[-7.98,131.30]],
  ['tobelo',[1.74,128.02]],['maluku',[-3.00,128.50]],['maluku utara',[1.50,127.80]],
  // Jawa
  ['jakarta',[-6.21,106.85]],['bandung',[-6.92,107.61]],['surabaya',[-7.25,112.75]],
  ['semarang',[-6.97,110.42]],['yogyakarta',[-7.80,110.36]],['solo',[-7.57,110.83]],
  ['malang',[-7.98,112.63]],['bogor',[-6.60,106.80]],['bekasi',[-6.24,107.00]],
  ['depok',[-6.40,106.82]],['tangerang',[-6.18,106.63]],['serang',[-6.11,106.15]],
  ['cianjur',[-6.82,107.14]],['garut',[-7.22,107.90]],['tasikmalaya',[-7.33,108.22]],
  ['purwokerto',[-7.43,109.23]],['banyumas',[-7.53,109.28]],['jepara',[-6.59,110.67]],
  ['demak',[-6.89,110.64]],['kudus',[-6.81,110.84]],['pati',[-6.75,111.03]],
  ['jawa barat',[-7.09,107.67]],['jawa tengah',[-7.15,110.14]],['jawa timur',[-7.54,112.24]],
  // Sumatra
  ['palembang',[-2.91,104.75]],['medan',[3.59,98.67]],['pekanbaru',[0.51,101.45]],
  ['bandar lampung',[-5.45,105.27]],['padang',[-0.95,100.35]],['banda aceh',[5.55,95.32]],
  ['jambi',[-1.60,103.62]],['bengkulu',[-3.80,102.26]],['palembang',[-2.92,104.75]],
  ['pangkalpinang',[-2.13,106.12]],['tanjungpinang',[0.92,104.46]],
  ['aceh',[4.70,96.75]],['sumatera utara',[2.00,99.00]],['sumatra utara',[2.00,99.00]],
  ['sumatera barat',[-0.74,100.25]],['riau',[0.29,101.71]],
  ['sumatera selatan',[-3.32,104.00]],['lampung',[-5.45,105.27]],
  ['sumatra',[-1.00,102.00]],['sumatera',[-1.00,102.00]],
  // Bali & lainnya
  ['denpasar',[-8.65,115.22]],['singaraja',[-8.11,115.09]],['bali',[-8.50,115.10]],
  ['indonesia',[-3.00,118.00]],
];

// Cari koordinat dari teks berita
function geoFromText(title='', body=''){
  const t = (title+' '+body).toLowerCase();
  // Coba dari yang paling spesifik dulu
  for(const [key, coord] of GEO_ID){
    if(t.includes(key)) return {lat: coord[0], lng: coord[1], name: key};
  }
  return null;
}

// Tampilkan berita sebagai titik di peta
function newsToMap(){
  S.newsMarkers.forEach(m => { try{ S.map.removeLayer(m); }catch(e){} });
  S.newsMarkers = [];
  S.fireIncidents = [];
  if(!S.map) return;

  // ── Filter KETAT: hanya gempa & kebakaran yang BENAR-BENAR terjadi ──
  // Deteksi kata kerja kejadian di JUDUL
  const GEMPA_OK = /gempa\s*m[\d.,]+|diguncang|mengguncang|guncang|gempa bumi|gempa tektonik|gempa landa|gempa\s+\d|gempa susulan|terasa gempa|bmkg catat|bmkg laporkan|magnitudo|scara gempa/i;
  const BAKAR_OK = /kebakaran|karhutla|terbakar|api meluas|hotspot meningkat|titik api|asap pekat|ispu berbahaya|kebakaran lahan|kebakaran hutan|kebakaran meluas|kebakaran melanda|api membakar/i;
  // Kata yang berarti bukan kejadian (rencana/analisis/mitigasi)
  const SKIP    = /antisipasi|mitigasi|anggaran|rencana|sosialisasi|simulasi|latihan|edukasi|tips|cara mencegah|waspada banjir|siapkan|persiapan|rawan|potensi|prediksi|prakiraan|outlook|isu gempa/i;

  const shown = new Map();

  S.allNews.forEach((art, i) => {
    const title = art.title || '';
    const body  = art.body  || '';
    if(SKIP.test(title)) return;

    const isGempa = GEMPA_OK.test(title);
    const isApi   = BAKAR_OK.test(title);
    if(!isGempa && !isApi) return;

    const type = isGempa ? 'earthquake' : 'fire';
    const geo  = geoFromText(title, body);
    if(!geo) return;

    const key    = `${geo.lat.toFixed(1)}_${geo.lng.toFixed(1)}_${type}`;
    const offset = (shown.get(key)||0) * 0.045;
    shown.set(key,(shown.get(key)||0)+1);
    const lat = geo.lat + offset*(i%2===0?1:-1);
    const lng = geo.lng + offset*(i%3===0?0.7:-0.7);

    const dt      = DT[type];
    const pubTime = new Date(art.publishedAt);
    const ageMin  = (Date.now() - pubTime.getTime())/60000;
    const timeStr = timeAgo(art.publishedAt);

    // catat insiden kebakaran (untuk radar, chip, ticker) — terlepas dari layer on/off
    let fireRec = null;
    if(isApi){
      fireRec = {
        id: 'fire_' + (String(art.id||title).toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,48)),
        title, lat, lng, time: pubTime, loc: titleCase(geo.name), marker: null,
      };
      S.fireIncidents.push(fireRec);
    }

    if(isGempa && !S.layers.earthquake) return;
    if(isApi   && !S.layers.fire)       return;

    const hot  = ageMin < BCN_HOT_MIN;
    const icon = beaconIcon({
      kind: isGempa ? 'quake' : 'fire',
      color: dt.color, size: isGempa ? 36 : 40,
      t: pubTime.getTime(),
    });

    const popup = `
      <div style="--c:${dt.color};--cd:${dt.color}30">
        <div class="pp-top">
          <div class="pp-badge">${ico(dt.ico)}</div>
          <div>
            <div class="pp-type">${dt.label} · LAPORAN BERITA</div>
            <div class="pp-meta" style="margin:3px 0 0">${ico('news')}<span>${art.source||'Mediaanalis'} · ${timeStr}</span></div>
          </div>
        </div>
        <div class="pp-title">${title}</div>
        <div class="pp-desc">${body.slice(0,130)}${body.length>130?'...':''}</div>
        ${art.url&&art.url!=='#'?`<a class="pp-btn" href="${art.url}" target="_blank" rel="noopener">${ico('arrow')} Baca Selengkapnya</a>`:''}
      </div>`;

    const m = L.marker([lat,lng],{icon,zIndexOffset:hot?1500:-50}).bindPopup(popup,{maxWidth:300});
    m._kind = isGempa ? 'quake' : 'fire';
    m._t = pubTime.getTime();
    m.addTo(S.map);
    S.newsMarkers.push(m);
    if(fireRec) fireRec.marker = m;
  });
}

// ═══════════════════════════════════════════════════════════
//  INCIDENT RADAR — daftar kejadian aktif + alarm menyala
// ═══════════════════════════════════════════════════════════

function buildIncidents(){
  const NOW = Date.now();
  const list = [];

  S.bmkgGempa.forEach(ev=>{
    const age = (NOW - ev.time)/60000;
    if(age < 1440 || (ev.magnitude>=5.5 && age < 4320)){
      list.push({
        kind:'quake', id:ev.id, lat:ev.lat, lng:ev.lng, time:ev.time, age,
        color: magColor(ev.magnitude), mag: ev.magnitude,
        head: 'M'+ev.magnitude.toFixed(1), title: ev.loc,
        sub: `${timeAgo(ev.time)} · ${ev.depth} km`,
        tsunami: ev.tsunami, fresh: age < BCN_LIVE_MIN,
      });
    }
  });

  (S.fireIncidents||[]).forEach(f=>{
    const age = (NOW - new Date(f.time).getTime())/60000;
    if(age < 4320){
      list.push({
        kind:'fire', id:f.id, lat:f.lat, lng:f.lng, time:f.time, age,
        color: DT.fire.color, head: 'API', title: f.title,
        sub: `${f.loc} · ${timeAgo(f.time)}`,
        fresh: age < BCN_LIVE_MIN,
      });
    }
  });

  list.sort((a,b)=> new Date(b.time) - new Date(a.time));
  return list;
}

function renderIncidentFeed(listIn){
  const wrap = document.getElementById('if-list');
  // animasi masuk hanya saat render pertama (render berikutnya tidak berkedip ulang)
  if(wrap){ const first = !wrap.dataset.painted; wrap.dataset.painted='1'; wrap.classList.toggle('noanim', !first); }
  if(!wrap) return;
  const list = listIn || buildIncidents();
  const cnt  = document.getElementById('if-cnt');
  if(cnt) cnt.textContent = list.length;

  if(!list.length){
    wrap.innerHTML = `<div class="if-empty">Tidak ada kejadian gempa / kebakaran aktif.<br/>Sistem terus memindai realtime.</div>`;
    return;
  }
  wrap.innerHTML = list.slice(0,14).map((inc,i)=>`
    <div class="if-item${inc.fresh?' fresh':''}" data-t="${+new Date(inc.time)}" style="--c:${inc.color};--cd:${inc.color}26;--p:${Math.max(0,1-inc.age/BCN_LIVE_MIN).toFixed(3)};animation-delay:${Math.min(i,8)*40}ms" onclick="focusIncident('${inc.id}')">
      <div class="if-bar"></div>
      <div class="if-ico">${ico(inc.kind==='fire'?'flame':'quake')}</div>
      <div class="if-body">
        <div class="if-t"><b>${inc.head}</b>${inc.title}</div>
        <div class="if-s">${ico('clock')}<span>${inc.sub}</span>${inc.tsunami?`<span style="color:var(--kritis);font-weight:700">· TSUNAMI</span>`:''}</div>
      </div>
    </div>`).join('');
}

window.focusIncident = function(id){
  if(!S.map) return;
  if(_is3D) window.setView2D();
  let m = S.bmkgMarkerMap && S.bmkgMarkerMap.get(id);
  let lat, lng;
  if(m){ const ll=m.getLatLng(); lat=ll.lat; lng=ll.lng; }
  else{
    const f = (S.fireIncidents||[]).find(x=>x.id===id);
    if(!f) return;
    m = f.marker; lat=f.lat; lng=f.lng;
  }
  S.map.flyTo([lat,lng],9,{duration:1.2});
  if(m) setTimeout(()=>{ try{ m.openPopup(); }catch(e){} },1300);
};

let _alarmTimer = null;
function triggerAlarm(inc, extra){
  const banner = document.getElementById('alert-banner');
  const frame  = document.getElementById('alarm-frame');
  if(!banner || !frame) return;
  const isFire = inc.kind==='fire';
  const c  = inc.color;
  banner.style.setProperty('--c', c);
  banner.style.setProperty('--cd', c+'33');
  frame.style.setProperty('--c', c+'cc');
  document.getElementById('ab-ico').innerHTML = ico(isFire?'flame':'quake');
  document.getElementById('ab-k').textContent = isFire ? 'DETEKSI KEBAKARAN / KARHUTLA' : (inc.tsunami?'PERINGATAN GEMPA + TSUNAMI':'DETEKSI GEMPA BUMI');
  document.getElementById('ab-t').textContent = isFire ? inc.title : `${inc.head} — ${inc.title}`;
  document.getElementById('ab-s').textContent = (isFire ? inc.sub : `${inc.sub} · BMKG`) + (extra>1 ? ` · +${extra-1} kejadian baru` : '');
  banner.classList.add('show');
  frame.classList.add('on');
  clearTimeout(_alarmTimer);
  _alarmTimer = setTimeout(()=>{ banner.classList.remove('show'); frame.classList.remove('on'); }, 9000);
  showToast(ico(isFire?'flame':'quake'), isFire?'Kebakaran terdeteksi':`Gempa ${inc.head}`, inc.title.slice(0,80), isFire?'fire':'earthquake');
}

function refreshIncidents(source){
  if(!S._incInit) S._incInit = {};
  const list = buildIncidents();
  const first = !S._incInit[source];
  const fresh = [];
  list.forEach(inc=>{
    if(!S.seenInc.has(inc.id)){
      S.seenInc.add(inc.id);
      // run pertama: hanya alarm bila benar-benar baru (< 15 menit)
      if(inc.fresh && (!first || inc.age < 15)) fresh.push(inc);
    }
  });
  S._incInit[source] = true;
  renderIncidentFeed(list);
  updateChips();
  renderLayerPanel();
  if(fresh.length) triggerAlarm(fresh[0], fresh.length);
}


// Perbarui status kedip marker + radar secara otomatis (tanpa fetch ulang)
function tickBeacons(){
  const now = Date.now();
  let changed = false;
  document.querySelectorAll('.bcn[data-t]').forEach(el=>{
    const st = beaconState((now - (+el.dataset.t))/60000, el.dataset.b==='1');
    if(el.dataset.st !== st){ setBcnState(el, st); changed = true; }
  });
  document.querySelectorAll('.if-item[data-t]').forEach(el=>{
    const age = (now - (+el.dataset.t))/60000;
    el.classList.toggle('fresh', age < BCN_LIVE_MIN);
    el.style.setProperty('--p', Math.max(0, 1 - age/BCN_LIVE_MIN).toFixed(3));
  });
  if(changed && typeof _is3D!=='undefined' && _is3D && typeof syncGlobe==='function') syncGlobe();
}

function magToSev(m){
  if(m>=6.5) return 'kritis';
  if(m>=5.5) return 'tinggi';
  if(m>=4.5) return 'sedang';
  return 'rendah';
}

function bmkgCoord(str){
  if(!str) return null;
  const val=parseFloat(str.replace(',','.'));
  if(isNaN(val)) return null;
  if(str.includes('LU')||str.includes('LS')){
    return str.includes('LS') ? -Math.abs(val) : Math.abs(val);
  }
  return val;
}

function logUpdate(msg){ S.updateLog.unshift({msg,time:new Date()}); S.updateLog=S.updateLog.slice(0,20); }

// ═══════════════════════════════════════════════════════════
//  CLOCK
// ═══════════════════════════════════════════════════════════

function startClock(){
  setInterval(()=>{
    const wib=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Jakarta'}));
    document.getElementById('clock').textContent=`${pad(wib.getHours())} : ${pad(wib.getMinutes())} : ${pad(wib.getSeconds())} WIB`;
  },1000);
}

// ═══════════════════════════════════════════════════════════
//  MAP
// ═══════════════════════════════════════════════════════════

function initMap(){
  const map=L.map('map',{center:[-3,122],zoom:5,zoomControl:false,attributionControl:false,preferCanvas:true,
    fadeAnimation:false,markerZoomAnimation:false,wheelPxPerZoomLevel:80,inertiaDeceleration:3400});

  // ── Basemap: HYBRID (satelit + label, gaya Google), SATELIT (Esri), GELAP (cyber) ──
  // Tanpa API key. Pilihan disimpan di localStorage.
  const BM_ERR='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
  const BASEMAPS = {
    hybrid:{ label:'HYBRID', sat:true,
      src:'Google Maps',
      layers:[{ url:'https://mt{s}.google.com/vt/lyrs=y&hl=id&gl=ID&x={x}&y={y}&z={z}', sub:'0123', maxZoom:20, hd:true }] },
    sat:{ label:'SATELIT', sat:true,
      src:'Esri World Imagery',
      layers:[
        { url:ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom:19, hd:true },
        { url:ESRI+'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', maxZoom:19, hd:true }
      ] },
    dark:{ label:'GELAP', sat:false,
      src:'OpenFreeMap / Esri',
      chain:[
        { url:'https://tiles.openfreemap.org/planet/{z}/{x}/{y}.png', maxZoom:14 },
        { url:'https://{s}.tile.openfreemap.org/planet/{z}/{x}/{y}.png', maxZoom:14, sub:'a' },
        { url:ESRI+'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', maxZoom:16 },
        { url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom:19, sub:'abc' }
      ],
      layers:[{ url:ESRI+'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', maxZoom:16, opacity:.7 }] }
  };

  let curTiles = [];
  let curBase = null;

  function mkTile(p, onFail){
    const tl = L.tileLayer(p.url, {
      maxZoom: p.maxZoom || 18,
      maxNativeZoom: p.maxZoom || 18,
      subdomains: p.sub || '',
      opacity: p.opacity || 1,
      detectRetina: !!p.hd,
      errorTileUrl: BM_ERR
    });
    if(onFail){
      let errored=false;
      tl.on('tileerror',()=>{ if(!errored){ errored=true; onFail(tl); } });
    }
    return tl;
  }

  function addDarkChain(key, idx){
    const list = BASEMAPS.dark.chain;
    if(idx>=list.length || curBase!==key) return;
    const tl = mkTile(list[idx], t=>{
      if(curBase!==key) return;
      t.remove();
      curTiles = curTiles.filter(x=>x!==t);
      addDarkChain(key, idx+1);
    });
    tl.addTo(map); tl.bringToBack();
    curTiles.push(tl);
  }

  function setBase(key){
    if(!BASEMAPS[key]) key='hybrid';
    const bm = BASEMAPS[key];
    curTiles.forEach(t=>{ try{ t.remove(); }catch(e){} });
    curTiles = [];
    curBase = key;
    if(bm.chain) addDarkChain(key, 0);
    bm.layers.forEach(p=>{
      const tl = mkTile(p);
      tl.addTo(map);
      curTiles.push(tl);
    });
    map.getContainer().classList.toggle('bm-sat', !!bm.sat);
    const src = document.querySelector('.leg-src');
    if(src) src.textContent = '\u00A9 '+bm.src+' \u00B7 BNPB \u00B7 BMKG \u00B7 NASA FIRMS';
    document.querySelectorAll('.bm-btn').forEach(b=>b.classList.toggle('on', b.dataset.bm===key));
    try{ localStorage.setItem('siaga_basemap', key); }catch(e){}
  }

  L.control.zoom({position:'bottomright'}).addTo(map);

  const BMCtl = L.control({position:'bottomleft'});
  BMCtl.onAdd = function(){
    const d = L.DomUtil.create('div','bm-switch');
    d.innerHTML = Object.keys(BASEMAPS).map(k=>
      '<button type="button" class="bm-btn" data-bm="'+k+'">'+BASEMAPS[k].label+'</button>').join('');
    L.DomEvent.disableClickPropagation(d);
    d.querySelectorAll('.bm-btn').forEach(b=>b.addEventListener('click',()=>setBase(b.dataset.bm)));
    return d;
  };
  BMCtl.addTo(map);

  // HUD: skala + koordinat kursor
  L.control.scale({position:'bottomleft',imperial:false,maxWidth:110}).addTo(map);
  const CoordCtl = L.control({position:'bottomleft'});
  CoordCtl.onAdd = function(){
    const d = L.DomUtil.create('div','coord-hud');
    d.innerHTML = '<span>LAT <b id="ch-lat">--</b></span><span>LNG <b id="ch-lng">--</b></span><span>ZOOM <b id="ch-z">--</b></span>';
    return d;
  };
  CoordCtl.addTo(map);
  let _chRaf = 0, _chLL = null;
  const chPaint = ()=>{
    _chRaf = 0; if(!_chLL) return;
    const a=document.getElementById('ch-lat'), b=document.getElementById('ch-lng');
    if(a) a.textContent = _chLL.lat.toFixed(4);
    if(b) b.textContent = _chLL.lng.toFixed(4);
  };
  map.on('mousemove', e=>{ _chLL = e.latlng; if(!_chRaf) _chRaf = requestAnimationFrame(chPaint); });
  map.on('zoomend', ()=>{ const z=document.getElementById('ch-z'); if(z) z.textContent = map.getZoom(); });
  setTimeout(()=>map.fire('zoomend'), 0);

  let saved=null; try{ saved=localStorage.getItem('siaga_basemap'); }catch(e){}
  setBase(BASEMAPS[saved]?saved:'hybrid');
  window.setBasemap = setBase;
  S.map=map;

  // Performa: jeda animasi CSS selama peta bergerak
  const mapEl = map.getContainer();
  let _mvT = null;
  const startMv = ()=>{ clearTimeout(_mvT); mapEl.classList.add('moving'); };
  const endMv = ()=>{ clearTimeout(_mvT); _mvT = setTimeout(()=>mapEl.classList.remove('moving'), 150); };
  map.on('movestart zoomstart', startMv);
  map.on('moveend zoomend', endMv);

  // Force size recalc after render
  setTimeout(()=>{ map.invalidateSize(true); },100);
  setTimeout(()=>{ map.invalidateSize(true); },500);
  setTimeout(()=>{ map.invalidateSize(true); },1500);
  window.addEventListener('resize',()=>map.invalidateSize(true));
}

// ═══════════════════════════════════════════════════════════
//  3D GLOBE — Globe.gl (sama seperti WorldMonitor)
// ═══════════════════════════════════════════════════════════

let G = null;          // Globe.gl instance
let _is3D = false;     // mode sekarang
let _globeReady = false;
let _globeAutoRotate = null;

function initGlobe(){
  const container = document.getElementById('globe-container');
  if(!container || G) return;

  // Buat Globe.gl instance
  G = Globe()
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor('#00c8ff')      // cyan neon
    .atmosphereAltitude(0.18)
    .width(container.clientWidth)
    .height(container.clientHeight)
    (container);

  // Kamera fokus ke Indonesia saat pertama kali
  G.pointOfView({ lat: -3, lng: 118, altitude: 1.8 }, 1200);

  // Kontrol interaktif
  G.controls().enableDamping = true;
  G.controls().dampingFactor = 0.08;
  G.controls().autoRotate = false;
  G.controls().autoRotateSpeed = 0.4;
  G.controls().minDistance = 150;
  G.controls().maxDistance = 900;

  // Responsive resize
  window.addEventListener('resize', ()=>{
    if(!_is3D) return;
    G.width(container.clientWidth).height(container.clientHeight);
  });

  // Click handler
  G.onPointClick(point => {
    if(!point) return;
    const msg = point._popup || `${point.label}\n${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`;
    // Quick AI analysis
    if(point._aiQuery){
      quickAsk(point._aiQuery);
    }
  });

  // Tooltip
  G.pointLabel(d => {
    const color = d.color||'#fff';
    return `<div style="background:rgba(4,10,22,.96);border:1px solid ${color};padding:7px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#eaf7ff;max-width:260px;box-shadow:0 0 18px ${color}66;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.16em;color:${color};font-weight:700;margin-bottom:3px">${d._typeLabel||'EVENT'}</div>
      <div style="font-weight:700;margin-bottom:2px;font-size:13px">${d.label||''}</div>
      <div style="font-size:10px;color:#86a6c6">${d._sub||''}</div>
    </div>`;
  });

  _globeReady = true;
  renderGlobeData();

  // Auto-rotate setelah 5 detik idle
  _startGlobeAutoRotate();
}

function _startGlobeAutoRotate(){
  clearTimeout(_globeAutoRotate);
  _globeAutoRotate = setTimeout(()=>{
    if(G && _is3D) G.controls().autoRotate = true;
  }, 5000);
}

function renderGlobeData(){
  if(!G || !_globeReady) return;

  const points = [];
  const rings  = [];
  const NOW    = Date.now();

  // ── GEMPA BMKG ──
  S.bmkgGempa.forEach(ev => {
    if(!ev.lat||!ev.lng||isNaN(ev.lat)||isNaN(ev.lng)) return;
    const mag    = ev.magnitude || 0;
    const color  = magColor(mag);
    const radius = Math.max(0.3, Math.min(2.2, mag * 0.32));
    const alt    = Math.max(0.005, Math.min(0.08, (mag-3)*0.015));
    const ageMin = (NOW - new Date(ev.time)) / 60000;

    points.push({
      lat: ev.lat, lng: ev.lng,
      size: radius,
      color,
      altitude: alt,
      label: `M${mag} — ${ev.loc}`,
      _sub: `Kedalaman ${ev.depth}km · ${Math.round(ageMin)} menit lalu${ev.tsunami?' · TSUNAMI':''}`,
      _typeLabel: 'GEMPA BUMI · BMKG',
      _aiQuery: `Analisis gempa M${mag} kedalaman ${ev.depth}km di ${ev.loc}. Apa dampak dan mitigasinya?`,
    });

    // gelombang seismik menyala untuk gempa < 24 jam
    if(ageMin < BCN_GLOW_MIN){
      rings.push({
        lat: ev.lat, lng: ev.lng, rgb: hexRgb(color),
        maxR: Math.max(2.2, mag * 1.1),
        speed: ageMin < BCN_HOT_MIN ? 3.2 : ageMin < BCN_LIVE_MIN ? 2.2 : 1.2,
        period: ageMin < BCN_HOT_MIN ? 900 : ageMin < BCN_LIVE_MIN ? 1400 : 2400,
      });
    }
  });

  // ── BERITA API (titik kebakaran & gempa dari Mediaanalis) ──
  S.newsMarkers.forEach(m => {
    try{
      const ll = m.getLatLng();
      const isfire = m._kind==='fire';
      const color  = isfire ? '#ff5a1f' : '#ffb020';
      points.push({
        lat: ll.lat, lng: ll.lng,
        size: 0.5,
        color,
        altitude: 0.01,
        label: isfire ? 'Kebakaran/Karhutla' : 'Gempa (Berita)',
        _sub: 'Sumber: Mediaanalis API',
        _typeLabel: isfire ? 'KEBAKARAN · BERITA' : 'GEMPA · BERITA',
      });
      const nAge = m._t ? (NOW - m._t)/60000 : BCN_GLOW_MIN;
      if(nAge < BCN_GLOW_MIN) rings.push({
        lat: ll.lat, lng: ll.lng, rgb: hexRgb(color),
        maxR: isfire ? 2.4 : 3,
        speed:  nAge < BCN_LIVE_MIN ? (isfire ? 1.2 : 2) : 0.8,
        period: nAge < BCN_LIVE_MIN ? (isfire ? 1100 : 1500) : 2400,
      });
    }catch(e){}
  });

  // ── GUNUNG API ──
  VOLCANOES.forEach(v => {
    const cMap={awas:'#ff2e4d',siaga:'#ff8a1a',waspada:'#ffd21a',normal:'#22ffa0'};
    const color = cMap[v.lv]||'#ffd21a';
    points.push({
      lat: v.lat, lng: v.lng,
      size: 0.35,
      color,
      altitude: 0.015,
      label: v.n,
      _sub: `Status: ${v.lv.toUpperCase()} · ${v.loc}`,
      _typeLabel: 'GUNUNG API · PVMBG',
    });
  });

  G.pointsData(points)
   .pointAltitude('altitude')
   .pointRadius('size')
   .pointColor('color')
   .pointResolution(16);

  // Ring: gelombang menyala di lokasi kejadian
  G.ringsData(rings)
   .ringLat('lat')
   .ringLng('lng')
   .ringMaxRadius('maxR')
   .ringPropagationSpeed('speed')
   .ringRepeatPeriod('period')
   .ringColor(d => t => `rgba(${d.rgb},${Math.max(0,1-t)})`);

  // Arc untuk gempa kritis (visualisasi shockwave)
  const critQuakes = S.bmkgGempa.filter(e=>e.magnitude>=6.5).slice(0,5);
  if(critQuakes.length > 0){
    const arcs = critQuakes.map(eq=>({
      startLat: eq.lat, startLng: eq.lng,
      endLat:   eq.lat + 0.001, endLng: eq.lng + 0.001,
      color: ['#ff2e4d', '#ff2e4d00'],
      label: `M${eq.magnitude} Shockwave`,
    }));
    G.arcsData(arcs)
     .arcColor('color')
     .arcStroke(0.5)
     .arcDashLength(0.4)
     .arcDashGap(2)
     .arcDashAnimateTime(3000)
     .arcAltitude(0.06);
  }

  // Update stat di globe-info
  const eqCount = S.bmkgGempa.length;
  const bigEq   = S.bmkgGempa.filter(e=>e.magnitude>=5.5).length;
  const el = document.getElementById('globe-info');
  if(el){
    const row=(c,txt,mt)=>`<div class="gi-row"${mt?` style="margin-top:${mt}px"`:''}><div class="gi-dot" style="background:${c};color:${c}"></div> ${txt}</div>`;
    el.innerHTML = `
      <div class="gi-hd">${ico('globe')} GLOBE 3D — REALTIME</div>
      ${row('#ff2e4d',`${S.bmkgGempa.filter(e=>e.magnitude>=6.5).length} Gempa M≥6.5 (Kritis)`)}
      ${row('#ff7a1a',`${S.bmkgGempa.filter(e=>e.magnitude>=5.5&&e.magnitude<6.5).length} Gempa M5.5–6.4 (Tinggi)`)}
      ${row('#ffb020',`${S.bmkgGempa.filter(e=>e.magnitude>=4.5&&e.magnitude<5.5).length} Gempa M4.5–5.4`)}
      ${row('#ffe14a',`${S.bmkgGempa.filter(e=>e.magnitude<4.5).length} Gempa &lt;M4.5`)}
      ${row('#ff5a1f',`${S.newsMarkers.length} Titik Kebakaran/Berita`,4)}
      ${row('#ff3355',`${VOLCANOES.length} Gunung Api`,2)}
      <div class="gi-foot">Total: ${eqCount} gempa · ${bigEq} M≥5.5</div>
    `;
  }
}

window.setView2D = function(){
  _is3D = false;
  document.getElementById('btn-2d').classList.add('on');
  document.getElementById('btn-3d').classList.remove('on');
  document.getElementById('globe-container').classList.remove('active');
  document.getElementById('map').style.display = '';
  document.querySelectorAll('.hud2d').forEach(e=>e.style.display='');
  if(G) G.controls().autoRotate = false;
  if(S.map) setTimeout(()=>S.map.invalidateSize(true), 100);
  logUpdate('Beralih ke mode 2D Peta');
};

window.setView3D = function(){
  _is3D = true;
  document.getElementById('btn-3d').classList.add('on');
  document.getElementById('btn-2d').classList.remove('on');
  document.getElementById('globe-container').classList.add('active');
  document.getElementById('map').style.display = 'none';
  document.querySelectorAll('.hud2d').forEach(e=>e.style.display='none');

  // Init globe jika belum
  if(!_globeReady){
    initGlobe();
  } else {
    renderGlobeData();
  }

  // Resize
  setTimeout(()=>{
    if(G){
      const c = document.getElementById('globe-container');
      G.width(c.clientWidth).height(c.clientHeight);
      G.pointOfView({lat:-3,lng:118,altitude:1.8},1000);
      _startGlobeAutoRotate();
    }
  }, 120);

  logUpdate('Beralih ke mode 3D Globe');
};

// Re-render globe saat data BMKG/News diperbarui
function syncGlobe(){
  if(_is3D && _globeReady) renderGlobeData();
}

function makeIcon(type,sev){
  const m=DT[type]||DT.fire;
  const crit=sev==='kritis';
  if(type==='fire'||type==='hotspot'){
    return beaconIcon({kind:'fire',color:m.color,size:crit?40:32,live:true,hot:crit});
  }
  if(type==='earthquake'){
    return beaconIcon({kind:'quake',color:m.color,size:crit?40:32,live:true,hot:crit});
  }
  const html=`<div class="vmk${crit?' lit':''}" style="--c:${m.color};--s:26px">${ico(m.ico)}</div>`;
  return L.divIcon({html,className:'',iconSize:[26,26],iconAnchor:[13,13],popupAnchor:[0,-16]});
}

function popupHtml(ev){
  const m=DT[ev.type]||DT.fire,sv=SEV[ev.sev]||SEV.rendah;
  return `
    <div style="--c:${m.color};--cd:${m.color}30">
      <div class="pp-top"><div class="pp-badge">${ico(m.ico)}</div><div class="pp-type">${m.label}</div></div>
      <div class="pp-sev" style="color:${sv.color};background:${sv.color}1f;border-color:${sv.color}66">${sv.label}</div>
      <div class="pp-title">${ev.title}</div>
      <div class="pp-note">${ico('pin')}<span>${ev.loc}</span></div>
      <div class="pp-desc">${(ev.desc||'').slice(0,140)}...</div>
      <div class="pp-btn" onclick="window.openModal('${ev.id}')">${ico('arrow')} Detail Lengkap + AI Analisis</div>
    </div>
  `;
}

function addEvMarker(ev){
  if(!S.layers[ev.type]) return;
  if(S.region!=='all'&&ev.region&&ev.region!==S.region) return;
  const m=L.marker([ev.lat,ev.lng],{icon:makeIcon(ev.type,ev.sev)})
    .bindPopup(popupHtml(ev),{maxWidth:290})
    .on('click',()=>openModal(ev.id));
  m.addTo(S.map);
  S.mMarkers.set(ev.id,m);
}

// NASA FIRMS WMS — data hotspot satelit realtime (sumber sama dengan SIPONGI)
const FIRMS_WMS = 'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/';
let firmsLayer1 = null, firmsLayer2 = null;

function addFirmsHotspots(){
  if(!S.map) return;
  // Layer WMS dibuat sekali dan dipakai ulang (sebelumnya dibuat ulang tiap render = unduh ulang semua tile)
  if(!S.layers.hotspot){
    [firmsLayer1,firmsLayer2].forEach(l=>{ if(l && S.map.hasLayer(l)) S.map.removeLayer(l); });
    return;
  }
  if(!firmsLayer1){
    // MODIS TERRA/AQUA 24 jam
    firmsLayer1 = L.tileLayer.wms(FIRMS_WMS+'modis_24h/', {
      layers:'fires_modis_24h', format:'image/png', transparent:true, opacity:0.85,
      attribution:'NASA FIRMS MODIS', maxZoom:12,
      tileSize:512, zoomOffset:-1, updateWhenIdle:true, updateWhenZooming:false, keepBuffer:1,
    });
    // VIIRS SNPP 24 jam (lebih presisi)
    firmsLayer2 = L.tileLayer.wms(FIRMS_WMS+'viirs_snpp_24h/', {
      layers:'fires_viirs_snpp_24h', format:'image/png', transparent:true, opacity:0.90,
      attribution:'NASA FIRMS VIIRS/SNPP', maxZoom:14,
      tileSize:512, zoomOffset:-1, updateWhenIdle:true, updateWhenZooming:false, keepBuffer:1,
    });
  }
  let added=false;
  [firmsLayer1,firmsLayer2].forEach(l=>{ if(!S.map.hasLayer(l)){ l.addTo(S.map); added=true; } });
  if(added){
    logUpdate('FIRMS: Hotspot realtime aktif (MODIS + VIIRS/SNPP)');
    updateDataStatus('fire','ok','Realtime SIPONGI/FIRMS');
  }
}

// Marker gunung api digambar oleh volcano.js (data PVMBG MAGMA, 60+ gunung).
// Jika modul itu tidak ada, gunakan data baseline VOLCANOES sebagai cadangan.
function addVolcanoes(){
  if(typeof window.refreshVolcanoMarkers==='function'){ window.refreshVolcanoMarkers(); return; }
  S.volMarkers.forEach(m=>S.map.removeLayer(m));
  S.volMarkers=[];
  if(!S.layers.volcano) return;
  const cMap={awas:'#ff2e4d',siaga:'#ff8a1a',waspada:'#ffd21a',normal:'#22ffa0'};
  VOLCANOES.forEach(v=>{
    const c=cMap[v.lv]||'#ffd21a';
    const lit=v.lv==='awas'||v.lv==='siaga';
    const html=`<div class="vmk${lit?' lit':''}" style="--c:${c};--s:22px">${ico('volcano')}</div>`;
    const icon=L.divIcon({html,className:'',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-12]});
    const m=L.marker([v.lat,v.lng],{icon})
      .bindPopup(`<div style="--c:${c};--cd:${c}30"><div class="pp-top"><div class="pp-badge">${ico('volcano')}</div><div><div class="pp-type">GUNUNG API · PVMBG</div><div class="pp-title" style="margin:2px 0 0">${v.n}</div></div></div><div class="pp-note">${ico('pin')}<span>${v.loc}</span></div><div class="pp-sev" style="color:${c};background:${c}1f;border-color:${c}66">STATUS ${v.lv.toUpperCase()}</div></div>`)
      .addTo(S.map);
    S.volMarkers.push(m);
  });
}

function addBNPBPosts(){
  (S.bnpbMarkers||[]).forEach(m=>{ try{S.map.removeLayer(m);}catch(e){} });
  S.bnpbMarkers=[];
  if(!S.layers.bnpb) return;
  [{lat:0.5,lng:114.0,n:'Posko BNPB Kalbar'},{lat:-0.9,lng:119.9,n:'Posko BNPB Sulteng'},
   {lat:-0.86,lng:134.08,n:'Posko BNPB Manokwari'},{lat:1.34,lng:124.79,n:'Posko BNPB Sulut'},
   {lat:-8.34,lng:122.99,n:'Posko BNPB NTT'},{lat:-8.35,lng:116.13,n:'Posko BNPB Lombok'},
  ].forEach(p=>{
    const html=`<div class="pmk">${ico('shield')}</div>`;
    const m=L.marker([p.lat,p.lng],{icon:L.divIcon({html,className:'',iconSize:[20,20],iconAnchor:[10,10],popupAnchor:[0,-12]})})
      .bindPopup(`<div style="--c:#00f0ff;--cd:rgba(0,240,255,.2)"><div class="pp-top"><div class="pp-badge">${ico('shield')}</div><div><div class="pp-type">POS BNPB / BPBD</div><div class="pp-title" style="margin:2px 0 0">${p.n}</div></div></div><div class="pp-note">${ico('clock')}<span>Aktif 24 jam</span></div></div>`)
      .addTo(S.map);
    S.bnpbMarkers.push(m);
  });
}

function renderMapMarkers(){
  S.mMarkers.forEach(m=>S.map.removeLayer(m));
  S.mMarkers.clear();
  S.events.forEach(ev=>addEvMarker(ev));
  renderBmkgMarkersOnMap();
  newsToMap();
  addFirmsHotspots();
  addVolcanoes();
  addBNPBPosts();
  renderIncidentFeed();
}

// ═══════════════════════════════════════════════════════════
//  LAYER PANEL
// ═══════════════════════════════════════════════════════════

function renderLayerPanel(){
  const c={};
  S.events.forEach(ev=>{c[ev.type]=(c[ev.type]||0)+1;});
  c.fire = (c.fire||0) + (S.fireIncidents?S.fireIncidents.length:0);
  c.hotspot = 'LIVE'; // realtime dari FIRMS WMS
  c.volcano = (window.volcanoCount&&window.volcanoCount())||VOLCANOES.length; c.bnpb = 6;
  c.earthquake = S.bmkgGempa.length;

  const activeN=Object.values(S.layers).filter(Boolean).length;
  document.getElementById('lp-active').textContent=activeN;

  document.getElementById('layer-list').innerHTML=LAYERS_CFG.map(l=>`
    <div class="li${!S.layers[l.id]?' off':''}" style="--lc:${l.color}" onclick="toggleLayer('${l.id}')">
      <div class="li-chk${S.layers[l.id]?' on':''}">${S.layers[l.id]?ico('check'):''}</div>
      <div class="li-ico">${ico(l.ico)}</div>
      <div class="li-lbl">${l.label}</div>
      <div class="li-num">${c[l.id]||0}</div>
    </div>
  `).join('');
}
window.toggleLayer=function(id){S.layers[id]=!S.layers[id];renderLayerPanel();renderMapMarkers();};

// ═══════════════════════════════════════════════════════════
//  STAT CHIPS
// ═══════════════════════════════════════════════════════════

function updateChips(){
  const c={};S.events.forEach(ev=>{c[ev.type]=(c[ev.type]||0)+1;});
  const fireN = (c.fire||0) + (S.fireIncidents?S.fireIncidents.length:0);
  const eqN   = (c.earthquake||0)+S.bmkgGempa.length;
  const freshEq = S.bmkgGempa.filter(g=>(Date.now()-g.time) < BCN_GLOW_MIN*60000).length;
  
  const set=(id,val)=>{const e=document.getElementById(id); if(e) e.textContent=val;};
  set('c-fire',fireN);
  set('c-flood',c.flood||0);
  set('c-eq',eqN);
  set('c-vol',c.volcano||0);
  set('ev-lbl',`${S.events.length+S.bmkgGempa.length+fireN} kejadian aktif`);
  // chip menyala bila ada kejadian
  const lit=(id,on)=>{const e=document.getElementById(id); if(e) e.classList.toggle('lit',!!on);};
  lit('chip-fire',fireN>0);
  lit('chip-eq',freshEq>0);
  lit('chip-flood',(c.flood||0)>0);
  updateAlert();
}

function updateAlert(){
  // Hitung kondisi real dari data
  const kritisEv   = S.events.filter(e=>e.sev==='kritis').length;
  const tinggiEv   = S.events.filter(e=>e.sev==='tinggi').length;
  const sedangEv   = S.events.filter(e=>e.sev==='sedang').length;
  const bigQuake   = S.bmkgGempa.filter(g=>g.magnitude>=6.5).length;
  const medQuake   = S.bmkgGempa.filter(g=>g.magnitude>=5.5&&g.magnitude<6.5).length;
  const fireCount  = S.events.filter(e=>e.type==='fire').length + (S.fireIncidents?S.fireIncidents.length:0);
  const volcAwas   = S.events.filter(e=>e.type==='volcano'&&e.sev==='kritis').length;

  const el=document.getElementById('alert-display');
  if(!el) return;

  let lvl,label,cls,icon;
  if(bigQuake>=1||volcAwas>=1||(kritisEv>=3&&fireCount>=2)){
    // LVL 4 — DARURAT NASIONAL
    lvl='4';label='DARURAT NASIONAL';cls='al-kritis';icon='siren';
  }else if(kritisEv>=2||bigQuake>=1||(kritisEv>=1&&fireCount>=3)){
    // LVL 3 — SIAGA KRITIS
    lvl='3';label='SIAGA KRITIS';cls='al-kritis';icon='alert';
  }else if(kritisEv>=1||tinggiEv>=3||medQuake>=1||fireCount>=6){
    // LVL 2 — WASPADA TINGGI
    lvl='2';label='WASPADA TINGGI';cls='al-tinggi';icon='alert';
  }else if(tinggiEv>=1||sedangEv>=3||fireCount>=2){
    // LVL 1 — SIAGA
    lvl='1';label='SIAGA';cls='al-siaga';icon='bolt';
  }else{
    // NORMAL
    lvl='0';label='KONDISI NORMAL';cls='al-normal';icon='check';
  }

  el.className='alert-pill '+cls;
  el.innerHTML=`${ico(icon)} ALERT LVL <span id="alert-num">${lvl}</span> — ${label}`;
}

// ═══════════════════════════════════════════════════════════
//  BMKG REALTIME — 3 Endpoint Paralel
// ═══════════════════════════════════════════════════════════

// Parse satu entri gempa dari JSON BMKG
function parseBmkgEntry(g, idx, source){
  // Koordinat langsung dari field Coordinates: "-8.07,120.09"
  const coords = (g.Coordinates||'').split(',');
  let lat = parseFloat(coords[0]);
  let lng = parseFloat(coords[1]);

  // Fallback: parse dari Lintang/Bujur
  if(isNaN(lat)||isNaN(lng)){
    const rawLat = parseFloat((g.Lintang||'').replace(/[^0-9.\-]/g,''));
    const rawLng = parseFloat((g.Bujur||'').replace(/[^0-9.\-]/g,''));
    lat = (g.Lintang||'').includes('LS') ? -Math.abs(rawLat) : Math.abs(rawLat);
    lng = rawLng;
  }

  if(isNaN(lat)||isNaN(lng)) return null;

  const mag   = parseFloat(g.Magnitude)||0;
  const depth = parseInt((g.Kedalaman||'0').replace(/[^0-9]/g,''))||0;

  // Gunakan DateTime ISO (bukan tanggal Indonesia)
  const time  = g.DateTime ? new Date(g.DateTime) : new Date();

  const hasTsunami = (g.Potensi||'').toLowerCase().includes('tsunami') &&
                     !(g.Potensi||'').toLowerCase().includes('tidak');

  return {
    id:        `bmkg_${g.DateTime||idx}_${source}`,
    type:      'earthquake',
    sev:       hasTsunami ? 'kritis' : magToSev(mag),
    region:    'all',
    title:     `Gempa M${g.Magnitude} — ${g.Wilayah}`,
    loc:       g.Wilayah||'Indonesia',
    lat, lng, time, magnitude: mag, depth,
    korban:0, pengungsi:0,
    src:       'BMKG',
    dirasakan: g.Dirasakan||null,
    potensi:   g.Potensi||null,
    tsunami:   hasTsunami,
    bmkg_raw:  g,
    _source:   source,
  };
}

async function fetchBMKGGempa(){
  try{
    // Fetch 3 endpoint sekaligus secara paralel
    const [r1, r2] = await Promise.allSettled([
      fetch(CFG.bmkgGempa,     {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
      fetch(CFG.bmkgDirasakan, {signal:AbortSignal.timeout(8000)}).then(r=>r.json()),
    ]);

    const list1 = r1.status==='fulfilled' ? (r1.value?.Infogempa?.gempa||[]) : [];
    const list2 = r2.status==='fulfilled' ? (r2.value?.Infogempa?.gempa||[]) : [];

    if(r1.status==='rejected') console.warn('[BMKG terkini]', r1.reason);
    if(r2.status==='rejected') console.warn('[BMKG dirasakan]', r2.reason);

    // Parse + deduplikasi berdasarkan DateTime + Coordinates
    const seen  = new Set();
    const parsed = [];
    [...list1.map((g,i)=>parseBmkgEntry(g,i,'terkini')),
     ...list2.map((g,i)=>parseBmkgEntry(g,i,'dirasakan'))]
    .filter(Boolean)
    .forEach(ev=>{
      const key = `${ev.time.toISOString().slice(0,16)}_${ev.lat.toFixed(2)}_${ev.lng.toFixed(2)}`;
      if(!seen.has(key)){
        seen.add(key);
        // Validasi batas wilayah Indonesia
        if(ev.lat>=-12 && ev.lat<=8 && ev.lng>=94 && ev.lng<=142)
          parsed.push(ev);
      }
    });

    // Sort terbaru dulu
    parsed.sort((a,b)=>b.time-a.time);
    S.bmkgGempa = parsed;

    renderBmkgMarkersOnMap();
    updateChips();
    syncGlobe(); // ← update 3D globe jika aktif
    refreshIncidents('bmkg'); // ← radar kejadian + alarm menyala
    renderTicker();

    const total   = parsed.length;
    const tsunami = parsed.filter(g=>g.tsunami).length;
    const bigM    = parsed.filter(g=>g.magnitude>=5.5).length;

    logUpdate(`BMKG: ${total} gempa (${bigM} M≥5.5${tsunami?', TSUNAMI':''})`);
    updateDataStatus('bmkg','ok',`${total} gempa`);

    // Alert gempa besar pertama dalam list
    const latest = parsed[0];
    if(latest){
      const ageMin = (Date.now()-latest.time)/60000;
      if(ageMin < 10 && latest.magnitude >= 5.0){
        // Gempa baru dalam 10 menit terakhir
        showToast(ico(latest.tsunami?'waves':'quake'),`[BMKG] ${latest.tsunami?'TSUNAMI — ':''}Gempa M${latest.magnitude}`, latest.loc, 'earthquake');
      }
      const tsuKey = latest.time.toISOString()+'|'+latest.loc;
      if(latest.tsunami && S._tsuKey!==tsuKey){
        S._tsuKey = tsuKey;
        addAIMessage('system',
          `**ALERT BMKG: POTENSI TSUNAMI**\nGempa **M${latest.magnitude}** — ${latest.loc}\n` +
          `Kedalaman: ${latest.depth} km\n**${latest.potensi}**\n` +
          `Waktu: ${fmtDate(latest.time)}`);
      }
    }

  }catch(err){
    console.warn('BMKG gempa error:',err);
    updateDataStatus('bmkg','err','Gagal terhubung');
  }
}

async function fetchBMKGAutoGempa(){
  try{
    const r=await fetch(CFG.bmkgAuto,{signal:AbortSignal.timeout(6000)});
    if(!r.ok) return;
    const data=await r.json();
    const g=data?.Infogempa?.gempa;
    if(!g) return;
    renderTicker();
  }catch(e){ console.warn('BMKG auto gempa:',e); }
}

function renderBmkgMarkersOnMap(){
  S.bmkgMarkers.forEach(m=>{ try{S.map.removeLayer(m);}catch(e){} });
  S.bmkgMarkers=[];
  S.bmkgMarkerMap=new Map();
  if(!S.map||!S.layers.earthquake) return;

  const NOW = Date.now();

  S.bmkgGempa.forEach(ev=>{
    if(!ev.lat||!ev.lng||isNaN(ev.lat)||isNaN(ev.lng)) return;

    const mag       = ev.magnitude;
    const ageMin    = (NOW - ev.time)/60000;
    // status kedip dihitung oleh beaconState (hot < 10m, live < 30m, lalu padam)
    const boost     = !!ev.tsunami || mag>=6;          // gempa besar / tsunami tetap kedip cepat sampai 30 menit
    const hot       = beaconState(ageMin, boost)==='hot';
    
    const color     = magColor(mag);

    // Ukuran proporsional magnitudo
    const size = Math.round(Math.max(34, Math.min(56, mag * 7)));

    const icon = beaconIcon({
      kind:'quake', color, size, t:+ev.time, boost,
      big: mag>=5.5, tsu: ev.tsunami,
      tag: mag>=4.5 ? `M${mag.toFixed(1)}` : '',
    });

    const sv    = SEV[ev.sev]||SEV.rendah;
    const ageTxt= ageMin<60 ? `${Math.round(ageMin)} menit lalu` :
                  ageMin<1440 ? `${Math.round(ageMin/60)} jam lalu` :
                  fmtDate(ev.time);

    const q = jsq(`Analisis gempa M${mag} kedalaman ${ev.depth}km di ${ev.loc}. Apa potensi bahaya dan langkah mitigasinya?`);
    const popup = `
      <div style="--c:${color};--cd:${color}30">
        <div class="pp-top">
          <div class="pp-badge">${ico('quake')}</div>
          <div>
            <div class="pp-type">GEMPA BUMI · BMKG REALTIME</div>
            <div class="pp-mag">M${mag}</div>
          </div>
        </div>
        <div class="pp-sev" style="color:${sv.color};background:${sv.color}1f;border-color:${sv.color}66">${sv.label}${ev.tsunami?' · POTENSI TSUNAMI':''}</div>
        <div class="pp-title">${ev.loc}</div>
        <div class="pp-grid">
          <div class="pp-cell">${ico('clock')}<span>${ageTxt}</span></div>
          <div class="pp-cell">${ico('depth')}<span>Kedalaman <b>${ev.depth} km</b></span></div>
          <div class="pp-cell" style="grid-column:1/3">${ico('calendar')}<span>${fmtDate(ev.time)}</span></div>
        </div>
        ${ev.dirasakan?`<div class="pp-note">${ico('vibrate')}<span>Dirasakan: ${ev.dirasakan}</span></div>`:''}
        ${ev.potensi?`<div class="pp-note ${ev.tsunami?'pp-warn':''}" style="color:${ev.tsunami?'#ff2e4d':'var(--text2)'}">${ico('alert')}<span>${ev.potensi}</span></div>`:''}
        <div class="pp-btn" onclick="quickAsk('${q}')">${ico('cpu')} Analisis AI</div>
      </div>
    `;

    const m = L.marker([ev.lat,ev.lng],{icon,zIndexOffset:Math.round(mag*100)+(hot?2000:0)}).bindPopup(popup,{maxWidth:310});
    m.addTo(S.map);
    S.bmkgMarkers.push(m);
    S.bmkgMarkerMap.set(ev.id,m);
  });
}

// ═══════════════════════════════════════════════════════════
//  NEWS — MEDIAANALIS API (Dual Token: Umum + Gempa)
// ═══════════════════════════════════════════════════════════

// Helper: fetch satu token
async function fetchNewsToken(token, page=1){
  const params=new URLSearchParams({limit:100, page});
  if(S.newsFilter.sentiment!=='all') params.set('sentiment', S.newsFilter.sentiment);
  const end=new Date();
  const start=new Date(end - 7*24*3600*1000);
  params.set('end', end.toISOString().slice(0,10));
  params.set('start', start.toISOString().slice(0,10));

  const r = await fetch(`${CFG.newsUrl}?${params}`, {
    headers:{
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  });
  if(!r.ok){ const t=await r.text().catch(()=>''); throw new Error(`API ${r.status}: ${t.slice(0,80)}`); }
  const data = await r.json();
  const items = data?.data||data?.news||data?.items||data?.articles||data||[];
  return Array.isArray(items) ? items : [];
}

function normalizeArticle(a, typeHint){
  const title = a.title||a.judul||'';
  const body  = a.body||a.content||a.description||a.ringkasan||'';
  // auto-detect disaster type from keywords
  const txt = (title+' '+body).toLowerCase();
  let type = typeHint || null;
  if(!type){
    if(/gempa|seismik|richter|magnitudo/.test(txt))       type='earthquake';
    else if(/tsunami/.test(txt))                          type='earthquake';
    else if(/kebakaran|karhutla|api|asap|hotspot/.test(txt)) type='fire';
    else if(/banjir|bah|genangan|luap/.test(txt))         type='flood';
    else if(/longsor|tanah bergerak/.test(txt))           type='landslide';
    else if(/gunung.*api|erupsi|lava|magma/.test(txt))    type='volcano';
    else if(/angin|puting beliung|topan|badai/.test(txt)) type='wind';
  }
  // location detection
  const LOC_KEYS=['kalimantan','sulawesi','papua','ntt','lombok','maluku','sumatra','jawa','flores','timor','borneo'];
  const loc = LOC_KEYS.find(k=>txt.includes(k)) || null;

  return {
    id:          a.id||a._id||btoa(title).slice(0,12),
    title,
    body,
    source:      a.source||a.sumber||a.media||a.platform||'Berita',
    url:         a.url||a.link||'#',
    publishedAt: a.publishedAt||a.published_at||a.date||a.tanggal||new Date(),
    sentiment:   a.sentiment||a.sentimen||null,
    image:       a.image||a.thumbnail||a.img||null,
    type,
    location:    a.location||a.lokasi||loc,
  };
}

async function fetchNews(page=1){
  setNewsStatus('loading');
  try{
    // Fetch kedua token secara paralel
    const [arr1, arr2] = await Promise.allSettled([
      fetchNewsToken(CFG.newsToken,  page),
      fetchNewsToken(CFG.newsToken2, page),
    ]);

    const raw1 = arr1.status==='fulfilled' ? arr1.value : [];
    const raw2 = arr2.status==='fulfilled' ? arr2.value : [];

    if(arr1.status==='rejected') console.warn('[Token1 Umum]', arr1.reason);
    if(arr2.status==='rejected') console.warn('[Token2 Gempa]', arr2.reason);

    // Normalize & tag sumber
    const norm1 = raw1.map(a => normalizeArticle(a, null));
    const norm2 = raw2.map(a => normalizeArticle(a, 'earthquake')); // token gempa

    // Gabung + deduplikasi berdasarkan judul
    const seen = new Set();
    const merged = [...norm2, ...norm1].filter(a=>{
      const key = a.title.toLowerCase().slice(0,60);
      if(seen.has(key)) return false;
      seen.add(key);
      return a.title.length > 0;
    });

    // Sort: terbaru dulu
    merged.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));

    S.allNews = merged;
    S.newsFilter.page = page;

    const total = merged.length;
    const gempaCount = norm2.length;
    logUpdate(`Mediaanalis: ${total} artikel (${gempaCount} gempa)`);
    updateDataStatus('news','ok',`${total} artikel`);
    renderNewsList();
    newsToMap(); // ← otomatis plot berita ke peta
    syncGlobe(); // ← update 3D globe jika aktif
    refreshIncidents('news'); // ← radar kejadian + alarm
    renderTicker();

    const cnt = document.getElementById('news-count-lbl');
    if(cnt) cnt.innerHTML = `${total} artikel · ${gempaCount} gempa`;

    // Update chip counter AI
    const dsn = document.getElementById('data-status-news');
    if(dsn){ dsn.innerHTML = `${ico('check')} ${total} artikel`; dsn.style.color = 'var(--rendah)'; }

  }catch(err){
    console.warn('News API error:', err);
    updateDataStatus('news','err',err.message.slice(0,40));
    document.getElementById('news-list').innerHTML=`
      <div style="padding:16px;font-size:12px;color:var(--text3);line-height:1.8;font-family:var(--font2);letter-spacing:.03em">
        <div style="color:var(--tinggi);font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:7px;font-size:14px">${ico('alert')} KONEKSI MEDIAANALIS API GAGAL</div>
        <div>${err.message}</div>
        <div style="margin-top:6px;color:var(--text3)">Kemungkinan penyebab:<br/>&#9656; CORS tidak diizinkan dari browser<br/>&#9656; Token tidak valid<br/>&#9656; Server tidak dapat dijangkau</div>
        <button onclick="fetchNews()" class="bpbtn" style="margin-top:10px;padding:6px 14px;color:var(--cyan);border-color:var(--border3)">${ico('refresh')} Coba Lagi</button>
      </div>`;
  }
}

function setNewsStatus(s){
  if(s==='loading'){
    document.getElementById('news-list').innerHTML=`
      <div class="news-loading">
        <div class="spinner"></div>
        <span>Mengambil berita dari Mediaanalis API...</span>
        <span style="font-size:9px;color:var(--text3);margin-top:4px">mediaanalis.jayaciptadigital.com</span>
      </div>`;
  }
}

function renderNewsList(){
  const el=document.getElementById('news-list');
  let arts=S.allNews;

  // sentiment filter
  if(S.newsFilter.sentiment!=='all'){
    arts=arts.filter(a=>a.sentiment===S.newsFilter.sentiment);
  }
  // disaster type filter
  if(S.newsFilter.type){
    arts=arts.filter(a=>detectType(a.title,a.body)===S.newsFilter.type);
  }

  if(!arts.length){
    el.innerHTML=`<div class="news-empty">Tidak ada artikel yang sesuai filter.</div>`;
    return;
  }

  el.innerHTML=arts.map(a=>{
    const dtype=detectType(a.title,a.body);
    const dloc=detectLoc(a.title,a.body);
    const dtM=dtype?DT[dtype]:null;
    const pub=new Date(a.publishedAt);
    const isRecent=(Date.now()-pub.getTime())<3600000;
    const sentMap={positive:'#22ffa0',negative:'#ff5a1f',neutral:'#ffd21a'};
    const sentCol=sentMap[a.sentiment]||'#5a7a9b';
    const sentLbl={positive:'Positif',negative:'Negatif',neutral:'Netral'}[a.sentiment]||'';

    return `
      <div class="nart" onclick="window.open('${a.url}','_blank')">
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;flex-shrink:0;min-width:64px">
          <span class="src-tag">${a.source}</span>
          ${sentLbl?`<span style="font-size:9px;padding:1px 6px;background:${sentCol}18;color:${sentCol};border:1px solid ${sentCol}55">${sentLbl}</span>`:''}
          <span style="font-size:9.5px;color:var(--text3)">${timeAgo(pub)}</span>
        </div>
        <div class="nart-body">
          <div class="nart-title${isRecent&&dtype?' breaking':''}">${a.title}</div>
          <div class="nart-meta">
            ${dloc?`<span class="nart-loc">${ico('pin')} ${dloc}</span>`:''}
            ${dtM?`<span class="nart-type" style="background:${dtM.color}18;color:${dtM.color};border:1px solid ${dtM.color}55">${dtM.icon} ${dtM.label}</span>`:''}
            <span class="nart-time">${pub.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})}</span>
          </div>
        </div>
        ${a.image?`<img class="nart-img" src="${a.image}" onerror="this.style.display='none'" loading="lazy"/>`:''}
      </div>
    `;
  }).join('');
}

function initNewsFilters(){
  // Sentiment
  document.querySelectorAll('[data-src]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-src]').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      S.newsFilter.sentiment=btn.dataset.src==='all'?'all':btn.dataset.src;
      renderNewsList();
    });
  });
  // Type
  document.querySelectorAll('[data-type]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const isOn=btn.classList.contains('on');
      document.querySelectorAll('[data-type]').forEach(b=>b.classList.remove('on'));
      S.newsFilter.type=isOn?null:btn.dataset.type;
      if(!isOn) btn.classList.add('on');
      renderNewsList();
    });
  });
}

window.toggleAutoRefresh=function(){
  const btn=document.getElementById('news-auto-btn');
  const isOn=btn.classList.contains('on');
  btn.classList.toggle('on');
  if(!isOn){ S._newsTimer=setInterval(()=>{fetchNews();fetchBMKGGempa();},CFG.refreshNews); }
  else { clearInterval(S._newsTimer); }
};

// ═══════════════════════════════════════════════════════════
//  DATA STATUS INDICATOR
// ═══════════════════════════════════════════════════════════

function updateDataStatus(src,status,msg){
  const el=document.getElementById('data-status-'+src);
  if(!el) return;
  const colors={ok:'var(--rendah)',err:'var(--kritis)',loading:'var(--sedang)'};
  const icons={ok:ico('check'),err:ico('x'),loading:ico('loader')};
  el.innerHTML=`<span style="color:${colors[status]}">${icons[status]}</span> ${msg}`;
}

// ═══════════════════════════════════════════════════════════
//  GEMINI AI
// ═══════════════════════════════════════════════════════════

/** Step 1: Discover which models this key can actually use */
async function discoverGeminiModels(apiKey){
  for(const base of GEMINI_BASES){
    try{
      const r=await fetch(
        `${base.replace(/\/$/,'')}?key=${apiKey}`,
        {signal:AbortSignal.timeout(6000)}
      );
      if(!r.ok) continue;
      const data=await r.json();
      if(!data.models) continue;
      // Filter models that support generateContent, prefer flash/pro
      const usable=data.models
        .filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent'))
        .map(m=>m.name.replace('models/',''))
        .filter(n=>n.includes('flash')||n.includes('pro'));
      if(usable.length>0){
        console.log('[Gemini] Discovered models:',usable);
        return {models:usable, base};
      }
    }catch(e){ console.warn('[Gemini] discover error',e.message); }
  }
  return null;
}

async function tryGeminiModel(model, base, apiKey){
  const url=`${base}${model}:generateContent?key=${apiKey}`;
  const body={contents:[{parts:[{text:'Balas OK'}]}],generationConfig:{maxOutputTokens:5}};
  const r=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(7000),
  });
  const d=await r.json();
  return {ok:r.ok, status:r.status, data:d, url};
}

async function initGemini(){
  const status=document.getElementById('ai-key-status');
  const keyInput=document.getElementById('ai-key-input');

  if(!CFG.geminiKey||CFG.geminiKey.length<8){
    status.textContent='Masukkan API Key Gemini';
    status.className='ai-key-status';
    addAIMessage('system','**Belum ada API Key.** Paste key dari aistudio.google.com/app/apikey di kotak input, lalu klik tombol refresh');
    return;
  }

  // Phase 1: Discover available models
  status.textContent='[1/3] Mendeteksi model tersedia...';
  const discovered=await discoverGeminiModels(CFG.geminiKey);
  let modelsToTry=GEMINI_MODELS;
  let baseToUse=GEMINI_BASES[0];

  if(discovered){
    // Put discovered models first, then fallback to hardcoded list
    const disc=discovered.models;
    modelsToTry=[...new Set([...disc,...GEMINI_MODELS])];
    baseToUse=discovered.base||GEMINI_BASES[0];
    console.log('[Gemini] Using discovered order:',modelsToTry.slice(0,5));
  }

  // Phase 2: Try each model
  status.textContent=`[2/3] Mencoba ${modelsToTry.length} model...`;

  for(let i=0;i<modelsToTry.length;i++){
    const model=modelsToTry[i];
    status.textContent=`[2/3] Mencoba ${model} (${i+1}/${modelsToTry.length})...`;

    // Try with both bases
    const bases=baseToUse===GEMINI_BASES[0]
      ? GEMINI_BASES
      : [baseToUse,...GEMINI_BASES.filter(b=>b!==baseToUse)];

    for(const base of bases){
      try{
        const {ok,status:httpStatus,data:d}=await tryGeminiModel(model,base,CFG.geminiKey);
        const errMsg=(d?.error?.message||'').toLowerCase();
        const errCode=d?.error?.code||0;

        if(!ok){
          // Hard auth fail — stop completely
          if(errCode===401||errCode===403||
             errMsg.includes('api key not valid')||errMsg.includes('permission denied')||
             errMsg.includes('api_key_invalid')||errMsg.includes('invalid api key')){
            status.innerHTML=ico('x')+' API Key tidak dikenali';
            status.className='ai-key-status err';
            keyInput.value='';
            localStorage.removeItem('siaga_gemini_key');
            addAIMessage('system',
              '**API Key ditolak oleh Google!**\n\n'+
              'Error: '+d?.error?.message+'\n\n'+
              '**Solusi:**\n'+
              '1. Buka → **aistudio.google.com/app/apikey**\n'+
              '2. Buat **Create API Key** baru\n'+
              '3. Paste key baru di kotak input\n'+
              '4. Klik tombol refresh'
            );
            return;
          }
          // Model unavailable — try next model
          continue;
        }

        // SUCCESS
        if(d?.candidates?.[0]||d?.candidates?.length===0){
          activeGeminiModel=model;
          activeGeminiBase=base;
          S.geminiReady=true;
          localStorage.setItem('siaga_gemini_key',CFG.geminiKey);

          const keyMask='•••'+CFG.geminiKey.slice(-8);
          status.innerHTML=ico('check')+' '+model;
          status.className='ai-key-status ok';
          keyInput.value=keyMask;

          // Collapse setup to single compact bar — max ruang untuk chat AI
          const setupEl=document.getElementById('ai-setup');
          setupEl.innerHTML=`
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="display:flex;align-items:center;gap:9px;min-width:0">
                <span style="color:var(--cyan);display:flex">${ico('cpu',18)}</span>
                <div style="min-width:0">
                  <div style="font-family:var(--font3);font-size:9.5px;font-weight:700;color:var(--lime);white-space:nowrap;letter-spacing:.14em;display:flex;align-items:center;gap:6px">${ico('spark')} GEMINI AI — TERHUBUNG</div>
                  <div style="font-size:10px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${model} · ${keyMask}</div>
                </div>
              </div>
              <div style="display:flex;gap:10px;flex-shrink:0;align-items:center">
                <span style="font-size:10px;color:var(--text3);display:flex;align-items:center;gap:5px">${ico('radio')} BMKG <span id="data-status-bmkg">...</span></span>
                <span style="font-size:10px;color:var(--text3);display:flex;align-items:center;gap:5px">${ico('news')} <span id="data-status-news">...</span></span>
                <button onclick="connectGemini()" class="bpbtn" title="Reconnect">${ico('refresh')}</button>
              </div>
            </div>`;
          setupEl.style.cssText='padding:7px 12px;border-bottom:1px solid rgba(34,255,160,.25);background:rgba(34,255,160,.04);flex-shrink:0';

          addAIMessage('system',
            `**Gemini AI Aktif!**\n`+
            `Model: \`${model}\` | Endpoint: \`${base.includes('v1beta')?'v1beta':'v1'}\`\n\n`+
            `Siap menganalisis **karhutla, gempa, banjir, gunung api** di seluruh Indonesia.\n`+
            `Klik **Analisis** untuk laporan situasi terkini!`
          );
          showToast(ico('cpu'),'Gemini AI Terhubung','Model: '+model,'ai');
          setTimeout(autoAnalyze,1500);
          return;
        }
      }catch(err){
        // Timeout or network error for this model/base combo
        console.warn(`[Gemini] ${model}@${base}: ${err.message}`);
      }
    }
  }

  // Phase 3: All failed
  status.innerHTML=ico('x')+' Semua model gagal — cek koneksi';
  status.className='ai-key-status err';
  addAIMessage('system',
    '**Tidak dapat terhubung ke Gemini API.**\n\n'+
    '**Kemungkinan penyebab:**\n'+
    '• Koneksi internet terputus\n'+
    '• API key tidak aktif (cek di aistudio.google.com)\n'+
    '• Semua model sedang tidak tersedia\n\n'+
    '**Coba:**\n'+
    '1. Refresh halaman (Ctrl+Shift+R)\n'+
    '2. Klik tombol refresh untuk retry\n'+
    '3. Atau buat API key baru di AI Studio'
  );
}

window.connectGemini=async function(){
  const inp=document.getElementById('ai-key-input');
  const raw=inp.value.trim();
  if(raw && !raw.startsWith('•') && raw.length>=10){
    CFG.geminiKey=raw;
    localStorage.setItem('siaga_gemini_key',raw);
  }
  S.geminiReady=false;
  await initGemini();
};

// Also expose fetchAllNews as alias for HTML onclick
window.fetchAllNews = fetchNews;




function buildGeminiContext(){
  const evSummary=S.events.slice(0,10).map(ev=>{
    const sv=SEV[ev.sev];
    return `[${sv.label}] ${ev.title} — ${ev.loc} (${timeAgo(ev.time)}): ${ev.desc.slice(0,100)}`;
  }).join('\n');

  const bmkgSummary=S.bmkgGempa.slice(0,5).map(g=>
    `M${g.magnitude} kedalaman ${g.depth}km — ${g.loc} (${timeAgo(g.time)})`
  ).join('\n');

  const newsSummary=S.allNews.slice(0,10).map(a=>`[${a.source}] ${a.title}`).join('\n');

  return `Kamu adalah SIAGA AI, sistem analis bencana alam Indonesia yang cerdas, akurat, dan terpercaya.
Data yang tersedia dari sensor realtime:

## DATA BMKG — GEMPA TERKINI:
${bmkgSummary||'Belum ada data BMKG tersedia'}

## KEJADIAN BENCANA AKTIF (BNPB/BPBD):
${evSummary}

## BERITA TERKINI (Mediaanalis):
${newsSummary||'Belum ada berita tersedia'}

## STATISTIK SAAT INI:
- Total kejadian aktif: ${S.events.length}
- Gempa BMKG terdeteksi: ${S.bmkgGempa.length}
- Hotspot aktif: Data satelit NASA FIRMS realtime (MODIS + VIIRS/SNPP, sumber sama dgn SIPONGI)
- Gunung api status siaga/awas: ${VOLCANOES.filter(v=>v.lv==='siaga'||v.lv==='awas').length} puncak
- Pengungsi total: ${S.events.reduce((s,e)=>s+(e.pengungsi||0),0).toLocaleString()} jiwa

Berikan respons dalam **Bahasa Indonesia** yang:
- Akurat dan terstruktur berdasarkan data di atas
- Gunakan markdown (bold, bullet points)  
- Sertakan rekomendasi praktis jika relevan
- JANGAN gunakan emoji atau simbol gambar sama sekali
- Bersikap empati dan informatif`;
}

async function queryGemini(userMsg){
  const ctx=buildGeminiContext();
  const msgs=[...S.aiHistory.slice(-6),{role:'user',parts:[{text:userMsg}]}];

  const payload={
    system_instruction:{parts:[{text:ctx}]},
    contents:msgs.map(m=>({role:m.role,parts:m.parts})),
    generationConfig:{maxOutputTokens:1200,temperature:0.7,topP:0.9}
  };

  const url=`${activeGeminiBase}${activeGeminiModel}:generateContent?key=${CFG.geminiKey}`;
  const r=await fetch(url,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(30000),
  });

  if(!r.ok){
    const e=await r.json().catch(()=>({}));
    throw new Error(e?.error?.message||'Gemini error '+r.status);
  }
  const data=await r.json();
  const reply=data?.candidates?.[0]?.content?.parts?.[0]?.text||'Tidak ada respons.';

  // Save history
  S.aiHistory.push({role:'user',parts:[{text:userMsg}]});
  S.aiHistory.push({role:'model',parts:[{text:reply}]});
  if(S.aiHistory.length>12) S.aiHistory=S.aiHistory.slice(-12);

  return reply;
}

async function sendToAI(userMsg,displayMsg){
  if(S.aiTyping) return;
  if(!S.geminiReady){
    addAIMessage('system','Gemini AI sedang menghubungkan diri... tunggu sebentar lalu coba lagi.');
    return;
  }
  S.aiTyping=true;
  if(displayMsg||userMsg) addAIMessage('user',displayMsg||userMsg);
  document.getElementById('ai-typing').classList.remove('hidden');
  document.getElementById('ai-send').disabled=true;

  try{
    const reply=await queryGemini(userMsg);
    document.getElementById('ai-typing').classList.add('hidden');
    addAIMessage('ai',reply);
    const badge=document.getElementById('ai-new-badge');
    const n=parseInt(badge.textContent)||0;
    badge.textContent=(n+1)+' BARU';
    badge.classList.remove('hidden');
  }catch(err){
    document.getElementById('ai-typing').classList.add('hidden');
    addAIMessage('system',`**Gemini Error**: ${err.message}\n\nPeriksa koneksi internet dan status API.`);
  }finally{
    S.aiTyping=false;
    document.getElementById('ai-send').disabled=false;
  }
}

window.autoAnalyze=async function(){
  const prompt=`Berikan analisis situasi bencana alam Indonesia saat ini berdasarkan semua data yang tersedia. Format jawaban (tanpa emoji):

## SITUASI KRITIS — kejadian prioritas tertinggi
## STATISTIK — angka-angka penting
## WILAYAH WASPADA — area yang perlu perhatian
## PREDIKSI BMKG — potensi bencana 24 jam ke depan berdasarkan data gempa
## REKOMENDASI — tindakan yang perlu diambil segera

Buat ringkas, padat, dan informatif. Sertakan data angka yang spesifik.`;
  await sendToAI(prompt,'Minta analisis komprehensif situasi bencana...');
};

window.quickAsk=async function(q){ await sendToAI(q,null); };

window.sendAIMessage=function(){
  const inp=document.getElementById('ai-input');
  const msg=inp.value.trim();
  if(!msg) return;
  inp.value='';
  sendToAI(msg,msg);
};

window.connectGemini=async function(){
  const key=document.getElementById('ai-key-input').value.trim();
  if(!key) return;
  CFG.geminiKey=key;
  await initGemini();
};

document.addEventListener('DOMContentLoaded',()=>{
  const inp=document.getElementById('ai-input');
  if(inp) inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAIMessage();}});
});

function addAIMessage(role,text){
  const chat=document.getElementById('ai-chat');
  const roleLabel={ai:ico('spark')+' SIAGA AI',system:ico('terminal')+' SISTEM',user:ico('user')+' ANDA'}[role];
  const roleClass={ai:'role-ai',system:'role-sys',user:'role-user'}[role];
  const bubClass={ai:'ai-bubble',system:'sys-bubble',user:''}[role];
  const el=document.createElement('div');
  el.className='ai-msg';
  el.innerHTML=`
    <div class="ai-msg-role ${roleClass}">${roleLabel} <span class="tm">${fmtTime(new Date())}</span></div>
    <div class="ai-msg-bubble ${bubClass}">${fmtAI(text)}</div>`;
  chat.appendChild(el);
  chat.scrollTop=chat.scrollHeight;
}

// Hapus semua emoji / simbol bergambar (hanya teks + ikon SVG yang dipakai di UI)
function stripEmoji(t){
  return String(t)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,'')
    .replace(/[ \t]{2,}/g,' ')
    .replace(/^[ \t]+/gm,'');
}

function fmtAI(t){
  return stripEmoji(t)
    // Code inline
    .replace(/`([^`]+)`/g,'<code class="ai-code">$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    // Headers ##
    .replace(/^#{1,3}\s+(.+)$/gm,'<div style="font-family:var(--font3);font-weight:700;color:var(--cyan);margin:9px 0 4px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid var(--border);padding-bottom:3px">$1</div>')
    // Numbered list: "1. item"
    .replace(/^(\d+)\.\s+(.+)$/gm,'<div style="padding:2px 0 2px 6px;display:flex;gap:7px"><span style="color:var(--cyan);font-weight:700;flex-shrink:0;font-family:var(--font)">$1.</span><span>$2</span></div>')
    // Bullet list
    .replace(/^[-•★]\s+(.+)$/gm,'<div style="padding:1px 0 1px 6px;display:flex;gap:8px"><span style="color:var(--cyan);flex-shrink:0;opacity:.8">&#9656;</span><span>$1</span></div>')
    // Severity coloring
    .replace(/\bKRITIS\b|\bAWAS\b/g,'<span style="color:#ff2e4d;font-weight:700">$&</span>')
    .replace(/\bSIAGA\b|\bTINGGI\b/g,'<span style="color:#ff8a1a;font-weight:700">$&</span>')
    .replace(/\bWASPADA\b|\bSEDANG\b/g,'<span style="color:#ffd21a;font-weight:700">$&</span>')
    .replace(/\bNORMAL\b/g,'<span style="color:#22ffa0;font-weight:700">$&</span>')
    // Paragraph breaks
    .replace(/\n\n/g,'<br/><br/>')
    .replace(/\n/g,'<br/>');
}

window.clearAIChat=function(){
  document.getElementById('ai-chat').innerHTML='';
  S.aiHistory=[];
  document.getElementById('ai-new-badge').classList.add('hidden');
  addAIMessage('system','Chat dibersihkan. Siap analisis bencana baru.');
};

// ═══════════════════════════════════════════════════════════
//  TV PANEL
// ═══════════════════════════════════════════════════════════

function tvActivate(fr){
  document.querySelectorAll('.tv-frame').forEach(f=>{
    if(f===fr) return;
    f.classList.remove('on');
    if(f.getAttribute('src')){ f.dataset.src=f.getAttribute('src'); f.removeAttribute('src'); }
  });
  fr.classList.add('on');
  if(!fr.getAttribute('src') && fr.dataset.src) fr.setAttribute('src', fr.dataset.src);
}

function initTVTabs(){
  document.querySelectorAll('.tvtab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.tvtab').forEach(t=>t.classList.remove('on'));
      tab.classList.add('on');
      document.querySelectorAll('.tv-frame').forEach(f=>f.classList.remove('on'));
      const fr=document.getElementById('tv-'+tab.dataset.ch);
      if(fr) tvActivate(fr);
    });
  });
}

window.toggleMute=function(){
  S.tvMuted=!S.tvMuted;
  document.getElementById('tv-mute-btn').innerHTML=ico(S.tvMuted?'mute':'sound');
};

window.refreshTV=function(){
  document.querySelectorAll('.tv-frame.on').forEach(f=>{const s=f.src;f.src='';setTimeout(()=>{f.src=s;},150);});
};

function renderTicker(){
  const evts=[...S.events.filter(e=>e.sev==='kritis'||e.sev==='tinggi'),...S.bmkgGempa.filter(g=>g.magnitude>=5.5),...(S.fireIncidents||[]).slice(0,6).map(f=>({type:'fire',sev:'tinggi',title:f.title,loc:f.loc,time:f.time}))];
  evts.sort((a,b)=>new Date(b.time)-new Date(a.time));
  const doubled=[...evts,...evts].map(ev=>{
    const m=DT[ev.type]||DT.earthquake, sv=SEV[ev.sev]||SEV.sedang;
    return `<span class="tk-item" style="color:${m.color}">${m.icon}<span style="color:${sv.color};font-weight:700">[${sv.label}]</span><span style="color:var(--text)">${ev.title||ev.loc}</span><span style="color:var(--accent2)">${ev.loc||''}</span><span style="color:var(--text3)">${timeAgo(ev.time)}</span></span><i class="tk-sep"></i>`;
  }).join('');
  document.getElementById('tick-track').innerHTML=doubled||'<span class="tk-item" style="color:var(--text3)">Memuat data breaking news...</span>';
}

// ═══════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════

function initSearch(){
  const inp=document.getElementById('srch'), drop=document.getElementById('search-drop');
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    if(q.length<2){drop.style.display='none';return;}

    const evFound=[...S.events,...S.bmkgGempa].filter(ev=>
      (ev.title||'').toLowerCase().includes(q)||(ev.loc||'').toLowerCase().includes(q)||
      (ev.region||'').includes(q)
    ).slice(0,8);
    const volFound=VOLCANOES.filter(v=>v.n.toLowerCase().includes(q)||v.loc.toLowerCase().includes(q)).slice(0,3);

    drop.innerHTML=[
      ...evFound.map(ev=>{
        const m=DT[ev.type]||DT.earthquake, sv=SEV[ev.sev]||SEV.rendah;
        return `<div class="sd-item" onclick="gotoEv(${ev.lat},${ev.lng},'${ev.id}')">
          <span class="sd-icon" style="color:${m.color};border-color:${m.color}66">${m.icon}</span>
          <div style="flex:1;min-width:0"><div class="sd-title">${ev.title}</div><div class="sd-sub">${ico('pin')} ${ev.loc} · ${timeAgo(ev.time)}</div></div>
          <span class="sd-sev" style="background:${sv.color}20;color:${sv.color};border:1px solid ${sv.color}40">${sv.label}</span>
        </div>`;
      }),
      ...volFound.map(v=>{
        const c={awas:'#ff2e4d',siaga:'#ff8a1a',waspada:'#ffd21a'}[v.lv]||'#ffd21a';
        return `<div class="sd-item" onclick="S.map.flyTo([${v.lat},${v.lng}],10);document.getElementById('search-drop').style.display='none'">
          <span class="sd-icon" style="color:${c};border-color:${c}66">${ico('volcano')}</span>
          <div style="flex:1;min-width:0"><div class="sd-title">${v.n}</div><div class="sd-sub">${ico('pin')} ${v.loc}</div></div>
          <span class="sd-sev" style="background:${c}20;color:${c};border:1px solid ${c}40">${v.lv.toUpperCase()}</span>
        </div>`;
      })
    ].join('')||`<div style="padding:14px;text-align:center;font-size:12px;color:var(--text3);font-family:var(--font2);letter-spacing:.08em">TIDAK DITEMUKAN</div>`;
    drop.style.display='block';
  });
  document.addEventListener('click',e=>{if(!e.target.closest('#srch')&&!e.target.closest('#search-drop'))drop.style.display='none';});
}

window.gotoEv=function(lat,lng,id){
  S.map.flyTo([lat,lng],10,{duration:1.2});
  document.getElementById('search-drop').style.display='none';
  document.getElementById('srch').value='';
  if(id&&!id.startsWith('bmkg')) setTimeout(()=>openModal(id),1300);
};

// ═══════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════

window.openModal=function(id){
  const ev=S.events.find(e=>e.id===id)||S.bmkgGempa.find(e=>e.id===id);
  if(!ev) return;
  const m=DT[ev.type]||DT.earthquake, sv=SEV[ev.sev]||SEV.rendah;
  if(ev.lat&&ev.lng) S.map.flyTo([ev.lat,ev.lng],10,{duration:1.1});

  const fields=[];
  if(ev.magnitude) fields.push(['Magnitudo',`M ${ev.magnitude}`]);
  if(ev.depth) fields.push(['Kedalaman',`${ev.depth} km`]);
  if(ev.hotspots) fields.push(['Hotspot',`${ev.hotspots} titik`]);
  if(ev.area_ha) fields.push(['Luas Terbakar',`${ev.area_ha.toLocaleString()} ha`]);
  if(ev.tinggi) fields.push(['Tinggi Air',ev.tinggi]);
  if(ev.level) fields.push(['Level Vulkanik',ev.level]);
  if(ev.radius) fields.push(['Radius Bahaya',ev.radius]);
  if(ev.kolom) fields.push(['Kolom Abu',ev.kolom]);
  if(ev.angin) fields.push(['Kec. Angin',ev.angin]);
  if(ev.rumah) fields.push(['Rumah Rusak',`${ev.rumah} unit`]);
  fields.push(['Korban',`${ev.korban||0} jiwa`]);
  fields.push(['Pengungsi',`${(ev.pengungsi||0).toLocaleString()} orang`]);
  fields.push(['Waktu Kejadian',fmtDate(ev.time)]);
  fields.push(['Sumber Data',ev.src||'BNPB/BMKG']);

  document.getElementById('minner').innerHTML=`
    <button class="mbtn-close" onclick="closeModal()">${ico('x')}</button>
    <div class="m-head" style="--c:${m.color};--cd:${m.color}2a">
      <div class="m-badge">${ico(m.ico)}</div>
      <div style="min-width:0">
        <div class="m-tags">
          <span class="m-tag" style="background:${m.color}22;color:${m.color};border-color:${m.color}66">${m.label.toUpperCase()}</span>
          <span class="m-tag" style="background:${sv.color}22;color:${sv.color};border-color:${sv.color}66">${sv.label}</span>
          <span class="m-tag" style="background:rgba(51,181,255,.1);color:#33b5ff;border-color:rgba(51,181,255,.4)">${ev.src||'BMKG/BNPB'}</span>
        </div>
        <div class="m-title">${ev.title}</div>
        <div class="m-loc">${ico('pin')} ${ev.loc}</div>
      </div>
    </div>
    ${ev.desc?`<div class="m-desc">${ev.desc}</div>`:''}
    <div class="m-grid">
      ${fields.map(([k,v])=>`<div class="m-cell"><div class="m-k">${k}</div><div class="m-v">${v}</div></div>`).join('')}
    </div>
    <div class="m-actions">
      <button class="m-btn p" onclick="S.map.flyTo([${ev.lat||0},${ev.lng||0}],12,{duration:1.2});closeModal()">${ico('map')} Zoom Peta</button>
      <button class="m-btn a" onclick="quickAsk('Analisis mendalam bencana: ${ev.title.replace(/'/g,"\\'")} di ${ev.loc}. Berikan: risiko, dampak, rekomendasi evakuasi, dan prediksi perkembangan.');closeModal()">${ico('cpu')} Analisis AI</button>
      <button class="m-btn g" onclick="closeModal()">${ico('x')}</button>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
};
window.closeModal=function(){document.getElementById('modal').classList.remove('open');};
document.getElementById('modal').addEventListener('click',function(e){if(e.target===this)closeModal();});

// ═══════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════

function showToast(icon,title,sub,type=''){
  const wrap=document.getElementById('toast-wrap');
  const el=document.createElement('div');
  el.className=`toast${type?' t-'+type:''}`;
  el.innerHTML=`<div class="t-ico">${icon}</div><div class="t-body"><div class="t-title">${title}</div><div class="t-sub">${sub}</div></div>`;
  el.addEventListener('click',()=>el.remove());
  wrap.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},7000);
}

// ═══════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════

function initControls(){
  document.getElementById('reg-sel').addEventListener('change',function(){
    S.region=this.value;
    const v=REGION_VIEW[S.region]||REGION_VIEW.all;
    S.map.flyTo(v.c,v.z,{duration:1.4});
    renderMapMarkers();
  });
  document.querySelectorAll('.tf-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.tf-btn').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      renderMapMarkers();
    });
  });
  document.getElementById('btnFs').addEventListener('click',()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
}

// Simulasi dihapus — semua data dari API realtime (BMKG, NASA FIRMS, Mediaanalis)

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════

async function init(){
  console.log('SIAGA MONITOR v4.0 — init');

  startClock();
  initMap();
  renderLayerPanel();
  renderMapMarkers();
  initTVTabs();
  setTimeout(()=>{ const f=document.querySelector('.tv-frame.on')||document.querySelector('.tv-frame'); if(f) tvActivate(f); },2500);
  renderTicker();
  initNewsFilters();
  initSearch();
  initControls();
  updateChips();
  renderIncidentFeed();

  // AI welcome
  addAIMessage('system',`**Menghubungkan ke Gemini AI...**\nSistem sedang memverifikasi API key dan memuat data realtime dari BMKG, BNPB, dan Mediaanalis.`);

  // Parallel init: Gemini + BMKG + News
  await Promise.all([
    initGemini(),
    fetchBMKGGempa(),
    fetchNews(),
  ]);

  // Auto refresh schedules
  setInterval(fetchBMKGGempa, CFG.refreshBmkg);       // BMKG: 30s realtime
  setInterval(fetchBMKGAutoGempa, 45000);              // BMKG auto: 45s
  setInterval(fetchNews, CFG.refreshNews);             // News: 90s
  setInterval(renderTicker, 30000);
  setInterval(updateChips, 15000);
  setInterval(tickBeacons, 15000);               // status kedip berubah otomatis (maks 30 menit)

  // News auto-refresh button default ON
  document.getElementById('news-auto-btn').classList.add('on');

  // Initial toasts
  setTimeout(()=>showToast(ico('quake'),'BMKG: Data Gempa Dimuat',S.bmkgGempa.length+' gempa terdeteksi','earthquake'),1500);
  setTimeout(()=>showToast(ico('news'),'Mediaanalis','Berita bencana realtime aktif','ai'),3000);
  setTimeout(()=>{
    if(S.geminiReady) autoAnalyze();
  },4000);

  console.log(`Ready: ${S.events.length} events, ${S.bmkgGempa.length} BMKG, ${S.allNews.length} news`);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
