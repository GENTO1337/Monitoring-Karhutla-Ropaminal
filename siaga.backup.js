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
//  DISASTER META
// ═══════════════════════════════════════════════════════════

const DT = {
  fire:       {icon:'🔥',label:'Kebakaran',       color:'#ff4500',cls:'dm-fire'},
  flood:      {icon:'🌊',label:'Banjir',          color:'#00b4d8',cls:'dm-flood'},
  earthquake: {icon:'🌋',label:'Gempa Bumi',      color:'#f4a261',cls:'dm-quake'},
  landslide:  {icon:'⛰️',label:'Tanah Longsor',  color:'#6a994e',cls:'dm-land'},
  volcano:    {icon:'🌄',label:'Gunung Api',       color:'#e63946',cls:'dm-volcano'},
  wind:       {icon:'🌀',label:'Puting Beliung',  color:'#9b5de5',cls:'dm-wind'},
  hotspot:    {icon:'🔴',label:'Hotspot',          color:'#ff8c00',cls:'dm-fire'},
};

const SEV = {
  kritis:{label:'KRITIS',color:'#ff2d2d'},
  tinggi:{label:'TINGGI',color:'#ff8c00'},
  sedang:{label:'SEDANG',color:'#ffd600'},
  rendah:{label:'RENDAH',color:'#00d4aa'},
};

const REGION_VIEW = {
  all:{c:[-3,122],z:5},kalimantan:{c:[0.5,114],z:6},sulawesi:{c:[-2,121.5],z:6},
  papua:{c:[-5,138],z:6},ntt:{c:[-9.5,124],z:7},lombok:{c:[-8.6,116.3],z:9},
  maluku:{c:[-3,128],z:7},jawa:{c:[-7.5,110],z:7},sumatra:{c:[0.5,101],z:6},
};

const LAYERS_CFG = [
  {id:'earthquake',label:'GEMPA BMKG',     ico:'🌋',color:'#f4a261',on:true},
  {id:'fire',      label:'KEBAKARAN',       ico:'🔥',color:'#ff4500',on:true},
  {id:'hotspot',   label:'HOTSPOT LAPAN',   ico:'🛰️',color:'#ff8c00',on:true},
  {id:'flood',     label:'BANJIR BNPB',     ico:'🌊',color:'#00b4d8',on:true},
  {id:'landslide', label:'TANAH LONGSOR',   ico:'⛰️',color:'#6a994e',on:true},
  {id:'volcano',   label:'GUNUNG API',      ico:'🌄',color:'#e63946',on:true},
  {id:'wind',      label:'ANGIN KENCANG',   ico:'🌀',color:'#9b5de5',on:true},
  {id:'bnpb',      label:'POS BNPB/BPBD',  ico:'🏛️',color:'#00d4aa',on:true},
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

    const dt  = DT[type];
    const el  = document.createElement('div');
    el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${dt.color}bb;border:2px solid ${dt.color};display:flex;align-items:center;justify-content:center;font-size:9px;cursor:pointer;box-shadow:0 0 8px ${dt.color}88;${isGempa?'animation:pulse-pill 1.4s ease-in-out infinite;':''}`;
    el.innerHTML = isGempa ? '\uD83C\uDF0B' : '\uD83D\uDD25';
    el.title = title;

    const icon    = L.divIcon({html:el.outerHTML,className:'',iconSize:[16,16],iconAnchor:[8,8],popupAnchor:[0,-12]});
    const timeStr = timeAgo(art.publishedAt);
    const popup   = `<div style="min-width:210px;max-width:270px"><div style="font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:${dt.color};font-weight:700;margin-bottom:3px">${dt.icon} ${dt.label} &nbsp;&middot;&nbsp; BERITA</div><div style="font-size:10px;color:#d8eaf8;font-weight:600;line-height:1.35;margin-bottom:5px">${title}</div><div style="font-size:8px;color:#0094e8;margin-bottom:4px">&#128225; ${art.source||'Mediaanalis'} &nbsp;&middot;&nbsp; ${timeStr}</div><div style="font-size:8.5px;color:#5a7a96;line-height:1.55;margin-bottom:6px">${body.slice(0,130)}${body.length>130?'...':''}</div>${art.url&&art.url!=='#'?`<a href="${art.url}" target="_blank" style="font-size:8px;color:#00d890">&rarr; Baca Selengkapnya</a>`:''}</div>`;

    const m = L.marker([lat,lng],{icon,zIndexOffset:-50}).bindPopup(popup,{maxWidth:285});
    m.addTo(S.map);
    S.newsMarkers.push(m);
  });
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
  const map=L.map('map',{center:[-3,122],zoom:5,zoomControl:false,attributionControl:false,preferCanvas:true});

  // ── Tile providers: SEMUA gratis, tanpa API key, bebas domain ──
  // 1. OpenFreeMap (sama seperti WorldMonitor) — dark, tanpa watermark
  // 2. ESRI Dark Gray Canvas — cadangan, tanpa key
  // 3. OSM — cadangan terakhir

  let activeTile = null;

  function tryTile(providers, idx) {
    if (idx >= providers.length) return;
    const p = providers[idx];
    const tl = L.tileLayer(p.url, {
      maxZoom: p.maxZoom || 18,
      subdomains: p.sub || '',
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    });
    let errored = false;
    tl.on('tileerror', () => {
      if (!errored) {
        errored = true;
        tl.remove();
        tryTile(providers, idx + 1);
      }
    });
    tl.addTo(map);
    activeTile = tl;
  }

  const TILE_PROVIDERS = [
    // OpenFreeMap liberty dark style — sama persis dengan WorldMonitor
    {
      url: 'https://tiles.openfreemap.org/planet/{z}/{x}/{y}.png',
      maxZoom: 14, sub: ''
    },
    // OpenFreeMap CDN alternative
    {
      url: 'https://{s}.tile.openfreemap.org/planet/{z}/{x}/{y}.png',
      maxZoom: 14, sub: 'a'
    },
    // ESRI World Dark Gray Base — 100% gratis tanpa key
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 16, sub: ''
    },
    // OSM standard — fallback terakhir
    {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19, sub: 'abc'
    }
  ];

  tryTile(TILE_PROVIDERS, 0);

  // Label layer ESRI (opsional, muncul di atas marker)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 16, opacity: 0.7,
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }
  ).addTo(map);

  L.control.zoom({position:'bottomright'}).addTo(map);
  S.map=map;

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
    .atmosphereColor('#1a4a8a')      // biru gelap — seperti WorldMonitor
    .atmosphereAltitude(0.15)
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
    return `<div style="background:rgba(0,4,10,.95);border:1px solid ${color};border-radius:2px;padding:5px 9px;font-family:monospace;font-size:9px;color:#d8eaf8;max-width:220px">
      <div style="font-size:7px;text-transform:uppercase;letter-spacing:.1em;color:${color};font-weight:700;margin-bottom:2px">${d._typeLabel||'EVENT'}</div>
      <div style="font-weight:700;margin-bottom:1px">${d.label||''}</div>
      <div style="font-size:8px;color:#486080">${d._sub||''}</div>
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

  // ── GEMPA BMKG ──
  S.bmkgGempa.forEach(ev => {
    if(!ev.lat||!ev.lng||isNaN(ev.lat)||isNaN(ev.lng)) return;
    const mag   = ev.magnitude || 0;
    const color = mag>=6.5 ? '#ff2020'
                : mag>=5.5 ? '#ff6820'
                : mag>=4.5 ? '#f4a261'
                : mag>=3.5 ? '#ffd600' : '#aaaaaa';
    const radius = Math.max(0.3, Math.min(2.2, mag * 0.32));
    const alt    = Math.max(0.005, Math.min(0.08, (mag-3)*0.015));
    const ageMin = (Date.now() - new Date(ev.time)) / 60000;

    points.push({
      lat: ev.lat, lng: ev.lng,
      size: radius,
      color,
      altitude: alt,
      label: `M${mag} — ${ev.loc}`,
      _sub: `Kedalaman ${ev.depth}km · ${Math.round(ageMin)} menit lalu${ev.tsunami?' ⚠ TSUNAMI':''}`,
      _typeLabel: 'GEMPA BUMI · BMKG',
      _aiQuery: `Analisis gempa M${mag} kedalaman ${ev.depth}km di ${ev.loc}. Apa dampak dan mitigasinya?`,
    });
  });

  // ── BERITA API (titik kebakaran & gempa dari Mediaanalis) ──
  S.newsMarkers.forEach(m => {
    try{
      const ll = m.getLatLng();
      const popup = m.getPopup();
      const content = popup ? popup.getContent() : '';
      const isfire = /kebakaran|karhutla|api/i.test(content);
      points.push({
        lat: ll.lat, lng: ll.lng,
        size: 0.5,
        color: isfire ? '#ff4500' : '#f4a261',
        altitude: 0.01,
        label: isfire ? 'Kebakaran/Karhutla' : 'Gempa (Berita)',
        _sub: 'Sumber: Mediaanalis API',
        _typeLabel: isfire ? 'KEBAKARAN · BERITA' : 'GEMPA · BERITA',
      });
    }catch(e){}
  });

  // ── GUNUNG API ──
  VOLCANOES.forEach(v => {
    const cMap={awas:'#ff2d2d',siaga:'#ff8c00',waspada:'#ffd600',normal:'#00d4aa'};
    const color = cMap[v.lv]||'#ffd600';
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

  // Arc untuk gempa kritis (visualisasi shockwave)
  const critQuakes = S.bmkgGempa.filter(e=>e.magnitude>=6.5).slice(0,5);
  if(critQuakes.length > 0){
    const arcs = critQuakes.map(eq=>({
      startLat: eq.lat, startLng: eq.lng,
      endLat:   eq.lat + 0.001, endLng: eq.lng + 0.001,
      color: ['#ff2020', '#ff202000'],
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
    el.innerHTML = `
      <div style="font-size:7px;font-weight:700;color:var(--text3);letter-spacing:.14em;margin-bottom:5px">\uD83C\uDF0F GLOBE 3D — REALTIME</div>
      <div class="gi-row"><div class="gi-dot" style="background:#ff2020"></div> ${S.bmkgGempa.filter(e=>e.magnitude>=6.5).length} Gempa M≥6.5 (Kritis)</div>
      <div class="gi-row"><div class="gi-dot" style="background:#ff6820"></div> ${S.bmkgGempa.filter(e=>e.magnitude>=5.5&&e.magnitude<6.5).length} Gempa M5.5–6.4 (Tinggi)</div>
      <div class="gi-row"><div class="gi-dot" style="background:#f4a261"></div> ${S.bmkgGempa.filter(e=>e.magnitude>=4.5&&e.magnitude<5.5).length} Gempa M4.5–5.4</div>
      <div class="gi-row"><div class="gi-dot" style="background:#ffd600"></div> ${S.bmkgGempa.filter(e=>e.magnitude<4.5).length} Gempa <M4.5</div>
      <div class="gi-row" style="margin-top:4px"><div class="gi-dot" style="background:#ff4500"></div> ${S.newsMarkers.length} Titik Kebakaran/Berita</div>
      <div class="gi-row" style="margin-top:2px"><div class="gi-dot" style="background:#e63946"></div> ${VOLCANOES.length} Gunung Api</div>
      <div style="margin-top:5px;font-size:7px;color:var(--text3)">Total: ${eqCount} gempa · ${bigEq} M≥5.5</div>
    `;
  }
}

window.setView2D = function(){
  _is3D = false;
  document.getElementById('btn-2d').classList.add('on');
  document.getElementById('btn-3d').classList.remove('on');
  document.getElementById('globe-container').classList.remove('active');
  document.getElementById('map').style.display = '';
  document.getElementById('lpanel').style.display = '';
  document.getElementById('legend').style.display = '';
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
  document.getElementById('lpanel').style.display = 'none';
  document.getElementById('legend').style.display = 'none';

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
  const el=document.createElement('div');
  el.className=`dm ${m.cls}${crit?' dm-kritis':''}`;
  el.innerHTML=m.icon;
  return L.divIcon({html:el.outerHTML,className:'',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-14]});
}

function popupHtml(ev){
  const m=DT[ev.type]||DT.fire,sv=SEV[ev.sev]||SEV.rendah;
  return `
    <div class="lp-type" style="color:${m.color}">${m.icon} ${m.label}</div>
    <div class="lp-sev" style="background:${sv.color}20;color:${sv.color};border:1px solid ${sv.color}40;display:inline-block;padding:1px 7px;border-radius:2px;font-size:8px;font-weight:700;margin-bottom:5px">${sv.label}</div>
    <div class="lp-title">${ev.title}</div>
    <div class="lp-loc">📍 ${ev.loc}</div>
    <div class="lp-desc">${(ev.desc||'').slice(0,140)}...</div>
    <span class="lp-link" onclick="window.openModal('${ev.id}')">→ Detail Lengkap + AI Analisis</span>
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
  // Hapus layer lama
  if(firmsLayer1){ try{S.map.removeLayer(firmsLayer1);}catch(e){} firmsLayer1=null; }
  if(firmsLayer2){ try{S.map.removeLayer(firmsLayer2);}catch(e){} firmsLayer2=null; }
  if(!S.map || !S.layers.hotspot) return;

  // MODIS TERRA/AQUA 24 jam
  firmsLayer1 = L.tileLayer.wms(FIRMS_WMS+'modis_24h/', {
    layers:'fires_modis_24h',
    format:'image/png',
    transparent:true,
    opacity:0.85,
    attribution:'\uD83D\uDD25 NASA FIRMS MODIS',
    maxZoom:12,
  });

  // VIIRS SNPP 24 jam (lebih presisi)
  firmsLayer2 = L.tileLayer.wms(FIRMS_WMS+'viirs_snpp_24h/', {
    layers:'fires_viirs_snpp_24h',
    format:'image/png',
    transparent:true,
    opacity:0.90,
    attribution:'\uD83D\uDD25 NASA FIRMS VIIRS/SNPP',
    maxZoom:14,
  });

  firmsLayer1.addTo(S.map);
  firmsLayer2.addTo(S.map);

  logUpdate('FIRMS: Hotspot realtime aktif (MODIS + VIIRS/SNPP)');
  updateDataStatus('fire','ok','Realtime SIPONGI/FIRMS');
}

function addVolcanoes(){
  S.volMarkers.forEach(m=>S.map.removeLayer(m));
  S.volMarkers=[];
  if(!S.layers.volcano) return;
  const cMap={awas:'#ff2d2d',siaga:'#ff8c00',waspada:'#ffd600',normal:'#00d4aa'};
  VOLCANOES.forEach(v=>{
    const c=cMap[v.lv]||'#ffd600';
    const el=document.createElement('div');
    el.style.cssText=`width:18px;height:18px;border-radius:50%;background:${c}33;border:2px solid ${c};display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;box-shadow:0 0 8px ${c}88`;
    el.innerHTML='🌋';
    const icon=L.divIcon({html:el.outerHTML,className:'',iconSize:[18,18],iconAnchor:[9,9]});
    const m=L.marker([v.lat,v.lng],{icon})
      .bindPopup(`<div><strong style="color:#fff">🌋 ${v.n}</strong><br/><span style="font-size:9px;color:#7ecfff">${v.loc}</span><br/><span style="font-size:10px;margin-top:4px;display:block">Status: <strong style="color:${c}">${v.lv.toUpperCase()}</strong></span></div>`)
      .addTo(S.map);
    S.volMarkers.push(m);
  });
}

function addBNPBPosts(){
  if(!S.layers.bnpb) return;
  [{lat:0.5,lng:114.0,n:'Posko BNPB Kalbar'},{lat:-0.9,lng:119.9,n:'Posko BNPB Sulteng'},
   {lat:-0.86,lng:134.08,n:'Posko BNPB Manokwari'},{lat:1.34,lng:124.79,n:'Posko BNPB Sulut'},
   {lat:-8.34,lng:122.99,n:'Posko BNPB NTT'},{lat:-8.35,lng:116.13,n:'Posko BNPB Lombok'},
  ].forEach(p=>{
    const el=document.createElement('div');
    el.style.cssText='width:16px;height:16px;border-radius:3px;background:rgba(0,212,170,.25);border:2px solid #00d4aa;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;box-shadow:0 0 5px rgba(0,212,170,.4)';
    el.innerHTML='🏛';
    L.marker([p.lat,p.lng],{icon:L.divIcon({html:el.outerHTML,className:'',iconSize:[16,16],iconAnchor:[8,8]})})
      .bindPopup(`<div><strong style="color:#00d4aa">🏛️ ${p.n}</strong><br/><span style="font-size:9px;color:var(--text2)">Aktif 24 jam</span></div>`)
      .addTo(S.map);
  });
}

function renderMapMarkers(){
  S.mMarkers.forEach(m=>S.map.removeLayer(m));
  S.mMarkers.clear();
  S.events.forEach(ev=>addEvMarker(ev));
  renderBmkgMarkersOnMap();
  addFirmsHotspots();
  addVolcanoes();
  addBNPBPosts();
}

// ═══════════════════════════════════════════════════════════
//  LAYER PANEL
// ═══════════════════════════════════════════════════════════

function renderLayerPanel(){
  const c={};
  S.events.forEach(ev=>{c[ev.type]=(c[ev.type]||0)+1;});
  c.hotspot = 0; // realtime dari FIRMS WMS
  c.volcano = VOLCANOES.length; c.bnpb = 6;
  c.earthquake = S.bmkgGempa.length;

  const activeN=Object.values(S.layers).filter(Boolean).length;
  document.getElementById('lp-active').textContent=activeN;

  document.getElementById('layer-list').innerHTML=LAYERS_CFG.map(l=>`
    <div class="li${!S.layers[l.id]?' off':''}" onclick="toggleLayer('${l.id}')">
      <div class="li-chk${S.layers[l.id]?' on':''}">
        ${S.layers[l.id]?'<span style="color:#000;font-size:8px;font-weight:900">✓</span>':''}
      </div>
      <div class="li-dot" style="background:${l.color};box-shadow:0 0 5px ${l.color}66"></div>
      <div class="li-ico">${l.ico}</div>
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
  document.getElementById('c-fire').textContent=c.fire||0;
  document.getElementById('c-flood').textContent=c.flood||0;
  document.getElementById('c-eq').textContent=(c.earthquake||0)+S.bmkgGempa.length;
  document.getElementById('c-vol').textContent=c.volcano||0;
  document.getElementById('ev-lbl').textContent=`${S.events.length+S.bmkgGempa.length} kejadian aktif`;
  updateAlert();
}

function updateAlert(){
  // Hitung kondisi real dari data
  const kritisEv   = S.events.filter(e=>e.sev==='kritis').length;
  const tinggiEv   = S.events.filter(e=>e.sev==='tinggi').length;
  const sedangEv   = S.events.filter(e=>e.sev==='sedang').length;
  const bigQuake   = S.bmkgGempa.filter(g=>g.magnitude>=6.5).length;
  const medQuake   = S.bmkgGempa.filter(g=>g.magnitude>=5.5&&g.magnitude<6.5).length;
  const fireCount  = S.events.filter(e=>e.type==='fire').length;
  const volcAwas   = S.events.filter(e=>e.type==='volcano'&&e.sev==='kritis').length;

  const el=document.getElementById('alert-display');
  if(!el) return;

  let lvl,label,cls,icon;
  if(bigQuake>=1||volcAwas>=1||(kritisEv>=3&&fireCount>=2)){
    // LVL 4 — DARURAT NASIONAL
    lvl='4';label='DARURAT NASIONAL';cls='al-kritis';icon='🚨';
  }else if(kritisEv>=2||bigQuake>=1||(kritisEv>=1&&fireCount>=3)){
    // LVL 3 — SIAGA KRITIS
    lvl='3';label='SIAGA KRITIS';cls='al-kritis';icon='⚠';
  }else if(kritisEv>=1||tinggiEv>=3||medQuake>=1){
    // LVL 2 — WASPADA TINGGI
    lvl='2';label='WASPADA TINGGI';cls='al-tinggi';icon='⚠';
  }else if(tinggiEv>=1||sedangEv>=3||fireCount>=2){
    // LVL 1 — SIAGA
    lvl='1';label='SIAGA';cls='al-siaga';icon='⚡';
  }else{
    // NORMAL
    lvl='0';label='KONDISI NORMAL';cls='al-normal';icon='✓';
  }

  el.className='alert-pill '+cls;
  el.innerHTML=`${icon} ALERT LVL <span id="alert-num">${lvl}</span> — ${label}`;
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

    const total   = parsed.length;
    const tsunami = parsed.filter(g=>g.tsunami).length;
    const bigM    = parsed.filter(g=>g.magnitude>=5.5).length;

    logUpdate(`BMKG: ${total} gempa (${bigM} M≥5.5${tsunami?', ⚠ TSUNAMI':''})`);
    updateDataStatus('bmkg','ok',`${total} gempa`);

    // Alert gempa besar pertama dalam list
    const latest = parsed[0];
    if(latest){
      const ageMin = (Date.now()-latest.time)/60000;
      if(ageMin < 10 && latest.magnitude >= 5.0){
        // Gempa baru dalam 10 menit terakhir
        const icon = latest.tsunami ? '⚠️ TSUNAMI' : latest.magnitude>=6?'🚨 KRITIS':'🌋';
        showToast(icon,`[BMKG] Gempa M${latest.magnitude}`, latest.loc, 'earthquake');
      }
      if(latest.tsunami){
        addAIMessage('system',
          `🚨 **ALERT BMKG: POTENSI TSUNAMI**\nGempa **M${latest.magnitude}** — ${latest.loc}\n` +
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
  if(!S.map||!S.layers.earthquake) return;

  const NOW = Date.now();

  S.bmkgGempa.forEach(ev=>{
    if(!ev.lat||!ev.lng||isNaN(ev.lat)||isNaN(ev.lng)) return;

    const mag       = ev.magnitude;
    const ageMin    = (NOW - ev.time)/60000;
    const isNew     = ageMin < 60;          // kurang dari 1 jam
    const isVeryNew = ageMin < 10;          // kurang dari 10 menit

    // Ukuran marker proporsional ke magnitudo (14–32px)
    const size = Math.max(14, Math.min(32, mag * 4.5));

    // Warna berdasarkan magnitudo
    const color = mag>=6.5 ? '#ff2020'
                : mag>=5.5 ? '#ff6820'
                : mag>=4.5 ? '#f4a261'
                : mag>=3.5 ? '#ffd600'
                :            '#aaa';

    const el = document.createElement('div');
    // Lingkaran murni tanpa emoji
    el.style.cssText = [
      `width:${size}px;height:${size}px;border-radius:50%;`,
      `background:radial-gradient(circle at 35% 35%, ${color}cc, ${color}44);`,
      `border:2px solid ${color};`,
      `cursor:pointer;`,
      `box-shadow:0 0 ${isVeryNew?14:isNew?8:4}px ${color}${isVeryNew?'dd':isNew?'99':'55'};`,
      ev.tsunami ? 'animation:pulse-pill .8s infinite;outline:3px solid #ff2020;' :
      isVeryNew  ? 'animation:pulse-pill 1.2s infinite;' :
      isNew      ? 'animation:pulse-pill 2s infinite;' : '',
    ].join('');
    el.title = `M${mag} \u2014 ${ev.loc}`;
    // Keterangan M di tengah untuk gempa besar
    if(mag>=6.0){
      el.style.display='flex';
      el.style.alignItems='center';
      el.style.justifyContent='center';
      el.style.fontSize=`${Math.max(7,size*0.3)}px`;
      el.style.fontWeight='900';
      el.style.color='#fff';
      el.style.fontFamily='monospace';
      el.textContent=`M${mag.toFixed(1)}`;
    }

    const icon = L.divIcon({
      html:el.outerHTML,className:'',
      iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]
    });

    const sv    = SEV[ev.sev]||SEV.rendah;
    const ageTxt= ageMin<60 ? `${Math.round(ageMin)} menit lalu` :
                  ageMin<1440 ? `${Math.round(ageMin/60)} jam lalu` :
                  fmtDate(ev.time);

    const popup = `
      <div style="min-width:230px;max-width:295px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};"></div>
          <span style="font-size:7px;text-transform:uppercase;letter-spacing:.14em;color:${color};font-weight:700">
            GEMPA BUMI — BMKG REALTIME
          </span>
        </div>
        <div style="font-size:13px;font-weight:800;color:${color};margin-bottom:2px">M${mag}</div>
        <div style="display:inline-flex;align-items:center;gap:4px;background:${sv.color}22;
          color:${sv.color};border:1px solid ${sv.color}44;padding:1px 7px;
          border-radius:2px;font-size:8px;font-weight:700;margin-bottom:6px">
          ${sv.label}${ev.tsunami?' ⚠ POTENSI TSUNAMI':''}
        </div>
        <div style="font-size:10px;color:#d8eaf8;font-weight:600;line-height:1.4;margin-bottom:4px">${ev.loc}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:5px">
          <div style="font-size:8px;color:#486080">&#9201; ${ageTxt}</div>
          <div style="font-size:8px;color:#486080">📅 ${fmtDate(ev.time)}</div>
          <div style="font-size:8px;color:#486080">📌 Kedalaman: <b>${ev.depth} km</b></div>
          <div style="font-size:8px;color:#486080">👥 Sumber: BMKG</div>
        </div>
        ${ev.dirasakan?`<div style="font-size:8.5px;color:#0094e8;margin-bottom:4px">📳 Dirasakan: ${ev.dirasakan}</div>`:''}
        ${ev.potensi?`<div style="font-size:8px;color:${ev.tsunami?'#ff4020':'#486080'};margin-bottom:5px">${ev.potensi}</div>`:''}
        <span style="font-size:8px;color:#00d890;cursor:pointer"
          onclick="quickAsk('Analisis gempa M${mag} kedalaman ${ev.depth}km di ${ev.loc}. Apa potensi bahaya dan langkah mitigasinya?')">
          🤖 Analisis AI &rarr;
        </span>
      </div>
    `;

    const m = L.marker([ev.lat,ev.lng],{icon}).bindPopup(popup,{maxWidth:300});
    m.addTo(S.map);
    S.bmkgMarkers.push(m);
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

    const cnt = document.getElementById('news-count-lbl');
    if(cnt) cnt.textContent = `${total} artikel · 🌋 ${gempaCount} gempa`;

    // Update chip counter AI
    document.getElementById('data-status-news').textContent = `✓ ${total} artikel`;
    document.getElementById('data-status-news').style.color = 'var(--rendah)';

  }catch(err){
    console.warn('News API error:', err);
    updateDataStatus('news','err',err.message.slice(0,40));
    document.getElementById('news-list').innerHTML=`
      <div style="padding:16px;font-size:10px;color:var(--text3);line-height:1.8">
        <div style="color:var(--tinggi);font-weight:700;margin-bottom:6px">⚠ Koneksi Mediaanalis API gagal</div>
        <div>${err.message}</div>
        <div style="margin-top:6px;color:var(--text3)">Kemungkinan penyebab:<br/>• CORS tidak diizinkan dari browser<br/>• Token tidak valid<br/>• Server tidak dapat dijangkau</div>
        <button onclick="fetchNews()" style="margin-top:10px;background:rgba(0,212,170,.15);border:1px solid rgba(0,212,170,.3);color:var(--accent);padding:6px 14px;border-radius:3px;cursor:pointer;font-family:var(--font);font-size:9px">↺ Coba Lagi</button>
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
    const sentMap={positive:'#00d4aa',negative:'#ff4500',neutral:'#ffd600'};
    const sentCol=sentMap[a.sentiment]||'#4a5568';
    const sentLbl={positive:'Positif',negative:'Negatif',neutral:'Netral'}[a.sentiment]||'';

    return `
      <div class="nart" onclick="window.open('${a.url}','_blank')">
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;flex-shrink:0;min-width:56px">
          <span style="font-size:8px;font-weight:700;padding:2px 5px;border-radius:2px;background:rgba(0,153,255,.12);color:#4da6ff;border:1px solid rgba(0,153,255,.3);white-space:nowrap;max-width:62px;overflow:hidden;text-overflow:ellipsis">${a.source}</span>
          ${sentLbl?`<span style="font-size:7.5px;padding:1px 4px;border-radius:2px;background:${sentCol}18;color:${sentCol};border:1px solid ${sentCol}33">${sentLbl}</span>`:''}
          <span style="font-size:8px;color:var(--text3)">${timeAgo(pub)}</span>
        </div>
        <div class="nart-body">
          <div class="nart-title${isRecent&&dtype?' breaking':''}">${a.title}</div>
          <div class="nart-meta">
            ${dloc?`<span class="nart-loc">📍 ${dloc}</span>`:''}
            ${dtM?`<span class="nart-type" style="background:${dtM.color}18;color:${dtM.color};border:1px solid ${dtM.color}33">${dtM.icon} ${dtM.label}</span>`:''}
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
  const icons={ok:'⬤',err:'✗',loading:'⟳'};
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
        `${base.replace('/models/','')}?key=${apiKey}`.replace('/models','')
        // correct URL: /v1beta or /v1
        .replace('https://generativelanguage.googleapis.com/v1beta','https://generativelanguage.googleapis.com/v1beta/models')
        .replace('https://generativelanguage.googleapis.com/v1','https://generativelanguage.googleapis.com/v1/models'),
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
    addAIMessage('system','🔑 **Belum ada API Key.** Paste key dari aistudio.google.com/app/apikey di kotak input, lalu klik ↺');
    return;
  }

  // Phase 1: Discover available models
  status.textContent='⟳ [1/3] Mendeteksi model tersedia...';
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
  status.textContent=`⟳ [2/3] Mencoba ${modelsToTry.length} model...`;

  for(let i=0;i<modelsToTry.length;i++){
    const model=modelsToTry[i];
    status.textContent=`⟳ [2/3] Mencoba ${model} (${i+1}/${modelsToTry.length})...`;

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
            status.textContent='✗ API Key tidak dikenali';
            status.className='ai-key-status err';
            keyInput.value='';
            localStorage.removeItem('siaga_gemini_key');
            addAIMessage('system',
              '❌ **API Key ditolak oleh Google!**\n\n'+
              'Error: '+d?.error?.message+'\n\n'+
              '**Solusi:**\n'+
              '1. Buka → **aistudio.google.com/app/apikey**\n'+
              '2. Buat **Create API Key** baru\n'+
              '3. Paste key baru di kotak input\n'+
              '4. Klik tombol ↺'
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
          status.textContent=`✓ ${model}`;
          status.className='ai-key-status ok';
          keyInput.value=keyMask;

          // Collapse setup to single compact bar — max ruang untuk chat AI
          const setupEl=document.getElementById('ai-setup');
          setupEl.innerHTML=`
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="display:flex;align-items:center;gap:7px;min-width:0">
                <span style="font-size:14px">🤖</span>
                <div style="min-width:0">
                  <div style="font-size:9px;font-weight:700;color:var(--accent);white-space:nowrap">✦ Gemini AI — TERHUBUNG</div>
                  <div style="font-size:8px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${model} · ${keyMask}</div>
                </div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0">
                <span style="font-size:8px;color:var(--text3)">📡 BMKG: <span id="data-status-bmkg">⟳</span></span>
                <span style="font-size:8px;color:var(--text3)">📰 <span id="data-status-news">⟳</span></span>
                <button onclick="connectGemini()" style="background:none;border:1px solid var(--border2);color:var(--text3);padding:1px 5px;border-radius:2px;font-size:9px;cursor:pointer;font-family:var(--font)" title="Reconnect">↺</button>
              </div>
            </div>`;
          setupEl.style.cssText='padding:6px 10px;border-bottom:1px solid rgba(0,212,170,.15);background:rgba(0,212,170,.03);flex-shrink:0';

          addAIMessage('system',
            `✦ **Gemini AI Aktif!**\n`+
            `Model: \`${model}\` | Endpoint: \`${base.includes('v1beta')?'v1beta':'v1'}\`\n\n`+
            `🔥 Siap menganalisis **karhutla, gempa, banjir, gunung api** di seluruh Indonesia.\n`+
            `Klik **⚡ Analisis** untuk laporan situasi terkini!`
          );
          showToast('🤖','Gemini AI Terhubung','Model: '+model,'ai');
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
  status.textContent='✗ Semua model gagal — cek koneksi';
  status.className='ai-key-status err';
  addAIMessage('system',
    '❌ **Tidak dapat terhubung ke Gemini API.**\n\n'+
    '**Kemungkinan penyebab:**\n'+
    '• Koneksi internet terputus\n'+
    '• API key tidak aktif (cek di aistudio.google.com)\n'+
    '• Semua model sedang tidak tersedia\n\n'+
    '**Coba:**\n'+
    '1. Refresh halaman (Ctrl+Shift+R)\n'+
    '2. Klik tombol ↺ untuk retry\n'+
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
- Gunakan emoji yang sesuai
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
    addAIMessage('system','⚠️ Gemini AI sedang menghubungkan diri... tunggu sebentar lalu coba lagi.');
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
    addAIMessage('system',`❌ **Gemini Error**: ${err.message}\n\nPeriksa koneksi internet dan status API.`);
  }finally{
    S.aiTyping=false;
    document.getElementById('ai-send').disabled=false;
  }
}

window.autoAnalyze=async function(){
  const prompt=`Berikan analisis situasi bencana alam Indonesia saat ini berdasarkan semua data yang tersedia. Format jawaban:

🚨 **SITUASI KRITIS** — kejadian prioritas tertinggi
📊 **STATISTIK** — angka-angka penting
⚠️ **WILAYAH WASPADA** — area yang perlu perhatian
🌦 **PREDIKSI BMKG** — potensi bencana 24 jam ke depan berdasarkan data gempa
💡 **REKOMENDASI** — tindakan yang perlu diambil segera

Buat ringkas, padat, dan informatif. Sertakan data angka yang spesifik.`;
  await sendToAI(prompt,'📊 Minta analisis komprehensif situasi bencana...');
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
  const roleLabel={ai:'✦ SIAGA AI',system:'⚙ SISTEM',user:'👤 ANDA'}[role];
  const roleClass={ai:'role-ai',system:'role-sys',user:'role-user'}[role];
  const bubClass={ai:'ai-bubble',system:'sys-bubble',user:''}[role];
  const el=document.createElement('div');
  el.className='ai-msg';
  el.innerHTML=`
    <div class="ai-msg-role ${roleClass}">${roleLabel} <span style="font-size:7px;color:var(--text3)">${fmtTime(new Date())}</span></div>
    <div class="ai-msg-bubble ${bubClass}">${fmtAI(text)}</div>`;
  chat.appendChild(el);
  chat.scrollTop=chat.scrollHeight;
}

function fmtAI(t){
  return t
    // Code inline
    .replace(/`([^`]+)`/g,'<code style="background:rgba(0,212,170,.12);color:var(--accent);padding:1px 4px;border-radius:2px;font-family:var(--font);font-size:9px">$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--white)">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g,'<em style="color:var(--text)">$1</em>')
    // Headers ##
    .replace(/^#{1,3}\s+(.+)$/gm,'<div style="font-weight:800;color:var(--white);margin:8px 0 3px;font-family:var(--font2);font-size:11px;letter-spacing:.02em;border-bottom:1px solid var(--border);padding-bottom:3px">$1</div>')
    // Numbered list: "1. item"
    .replace(/^(\d+)\.\s+(.+)$/gm,'<div style="padding:2px 0 2px 14px;display:flex;gap:5px"><span style="color:var(--accent);font-weight:700;flex-shrink:0">$1.</span><span>$2</span></div>')
    // Bullet list
    .replace(/^[-•★]\s+(.+)$/gm,'<div style="padding:1px 0 1px 14px;display:flex;gap:5px"><span style="color:var(--text3);flex-shrink:0">▸</span><span>$1</span></div>')
    // Alert emojis — color red
    .replace(/🚨|⚠️|❗/g,m=>`<span style="color:#ff2d2d">${m}</span>`)
    // Severity coloring
    .replace(/\bKRITIS\b|\bAWAS\b/g,'<span style="color:#ff2d2d;font-weight:700">$&</span>')
    .replace(/\bSIAGA\b|\bTINGGI\b/g,'<span style="color:#ff8c00;font-weight:700">$&</span>')
    .replace(/\bWASPADA\b|\bSEDANG\b/g,'<span style="color:#ffd600;font-weight:700">$&</span>')
    .replace(/\bNORMAL\b/g,'<span style="color:#00d4aa;font-weight:700">$&</span>')
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

function initTVTabs(){
  document.querySelectorAll('.tvtab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.tvtab').forEach(t=>t.classList.remove('on'));
      tab.classList.add('on');
      document.querySelectorAll('.tv-frame').forEach(f=>f.classList.remove('on'));
      const fr=document.getElementById('tv-'+tab.dataset.ch);
      if(fr) fr.classList.add('on');
    });
  });
}

window.toggleMute=function(){
  S.tvMuted=!S.tvMuted;
  document.getElementById('tv-mute-btn').textContent=S.tvMuted?'🔇':'🔊';
};

window.refreshTV=function(){
  document.querySelectorAll('.tv-frame.on').forEach(f=>{const s=f.src;f.src='';setTimeout(()=>{f.src=s;},150);});
};

function renderTicker(){
  const evts=[...S.events.filter(e=>e.sev==='kritis'||e.sev==='tinggi'),...S.bmkgGempa.filter(g=>g.magnitude>=5.5)];
  evts.sort((a,b)=>new Date(b.time)-new Date(a.time));
  const doubled=[...evts,...evts].map(ev=>{
    const m=DT[ev.type]||DT.earthquake, sv=SEV[ev.sev]||SEV.sedang;
    return `<span style="padding:0 24px">${m.icon} <span style="color:${sv.color};font-weight:700">[${sv.label}]</span> ${ev.title||ev.loc} — <span style="color:#7ecfff">${ev.loc}</span> · ${timeAgo(ev.time)}</span> <span style="opacity:.25">◆</span>`;
  }).join('');
  document.getElementById('tick-track').innerHTML=doubled||'<span style="padding:0 20px;color:var(--text3)">Memuat data breaking news...</span>';
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
          <span class="sd-icon">${m.icon}</span>
          <div style="flex:1;min-width:0"><div class="sd-title">${ev.title}</div><div class="sd-sub">📍 ${ev.loc} · ${timeAgo(ev.time)}</div></div>
          <span class="sd-sev" style="background:${sv.color}20;color:${sv.color};border:1px solid ${sv.color}40">${sv.label}</span>
        </div>`;
      }),
      ...volFound.map(v=>{
        const c={awas:'#ff2d2d',siaga:'#ff8c00',waspada:'#ffd600'}[v.lv]||'#ffd600';
        return `<div class="sd-item" onclick="S.map.flyTo([${v.lat},${v.lng}],10);document.getElementById('search-drop').style.display='none'">
          <span class="sd-icon">🌋</span>
          <div style="flex:1;min-width:0"><div class="sd-title">${v.n}</div><div class="sd-sub">📍 ${v.loc}</div></div>
          <span class="sd-sev" style="background:${c}20;color:${c};border:1px solid ${c}40">${v.lv.toUpperCase()}</span>
        </div>`;
      })
    ].join('')||`<div style="padding:12px;text-align:center;font-size:10px;color:var(--text3)">Tidak ditemukan</div>`;
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
    <button class="mbtn-close" onclick="closeModal()">✕</button>
    <div style="display:flex;gap:14px;margin-bottom:16px;align-items:flex-start">
      <span style="font-size:38px">${m.icon}</span>
      <div>
        <div style="display:flex;gap:6px;margin-bottom:5px">
          <span style="font-size:8px;font-weight:700;padding:2px 7px;border-radius:2px;background:${m.color}22;color:${m.color};border:1px solid ${m.color}44">${m.label.toUpperCase()}</span>
          <span style="font-size:8px;font-weight:700;padding:2px 7px;border-radius:2px;background:${sv.color}22;color:${sv.color};border:1px solid ${sv.color}44">${sv.label}</span>
          <span style="font-size:8px;padding:2px 7px;border-radius:2px;background:rgba(0,153,255,.1);color:#4da6ff;border:1px solid rgba(0,153,255,.3)">${ev.src||'BMKG/BNPB'}</span>
        </div>
        <div style="font-size:16px;font-weight:800;color:var(--white);line-height:1.3;margin-bottom:4px">${ev.title}</div>
        <div style="font-size:10px;color:var(--accent2)">📍 ${ev.loc}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text);line-height:1.75;padding:10px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;margin-bottom:14px">${ev.desc}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px">
      ${fields.map(([k,v])=>`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:7px 10px">
        <div style="font-size:7.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${k}</div>
        <div style="font-size:11px;font-weight:700;color:var(--text);font-family:var(--font)">${v}</div>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="S.map.flyTo([${ev.lat||0},${ev.lng||0}],12,{duration:1.2});closeModal()" style="flex:1;padding:9px;background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.3);color:var(--accent);border-radius:3px;cursor:pointer;font-size:10px;font-family:var(--font);font-weight:600">🗺 Zoom Peta</button>
      <button onclick="quickAsk('Analisis mendalam bencana: ${ev.title.replace(/'/g,"\\'")} di ${ev.loc}. Berikan: risiko, dampak, rekomendasi evakuasi, dan prediksi perkembangan.');closeModal()" style="flex:1;padding:9px;background:rgba(66,133,244,.1);border:1px solid rgba(66,133,244,.3);color:#4da6ff;border-radius:3px;cursor:pointer;font-size:10px;font-family:var(--font);font-weight:600">🤖 Analisis AI</button>
      <button onclick="closeModal()" style="padding:9px 14px;background:var(--bg3);border:1px solid var(--border2);color:var(--text2);border-radius:3px;cursor:pointer;font-size:10px;font-family:var(--font)">✕</button>
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
  console.log('SIAGA MONITOR v3.1 — init');

  startClock();
  initMap();
  renderLayerPanel();
  renderMapMarkers();
  initTVTabs();
  renderTicker();
  initNewsFilters();
  initSearch();
  initControls();
  updateChips();

  // AI welcome
  addAIMessage('system',`⟳ **Menghubungkan ke Gemini AI...**\nSistem sedang memverifikasi API key dan memuat data realtime dari BMKG, BNPB, dan Mediaanalis.`);

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

  // News auto-refresh button default ON
  document.getElementById('news-auto-btn').classList.add('on');

  // Initial toasts
  setTimeout(()=>showToast('🌋','BMKG: Data Gempa Dimuat',S.bmkgGempa.length+' gempa terdeteksi hari ini','earthquake'),1500);
  setTimeout(()=>showToast('📰','Mediaanalis','Berita bencana realtime aktif','ai'),3000);
  setTimeout(()=>{
    if(S.geminiReady) autoAnalyze();
  },4000);

  console.log(`Ready: ${S.events.length} events, ${S.bmkgGempa.length} BMKG, ${S.allNews.length} news`);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
