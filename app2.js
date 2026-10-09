/**
 * SIAGA MONITOR v2.1 — app2.js
 * Full dashboard logic: map, layers, news, webcams, AI insights, search, toasts
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════

const DISASTER_META = {
  fire:       { icon:'🔥', label:'Kebakaran',        color:'#ff4500', cls:'dm-fire' },
  flood:      { icon:'🌊', label:'Banjir',           color:'#0077b6', cls:'dm-flood' },
  earthquake: { icon:'🌋', label:'Gempa Bumi',       color:'#f4a261', cls:'dm-quake' },
  landslide:  { icon:'⛰️', label:'Tanah Longsor',   color:'#6a994e', cls:'dm-land' },
  volcano:    { icon:'🌄', label:'Gunung Api',        color:'#e63946', cls:'dm-volcano' },
  wind:       { icon:'🌀', label:'Puting Beliung',   color:'#9b5de5', cls:'dm-wind' },
  hotspot:    { icon:'🔴', label:'Hotspot Satelit',  color:'#ff8c00', cls:'dm-fire' },
};

const SEV = {
  kritis: { label:'KRITIS', color:'#ff2d2d' },
  tinggi: { label:'TINGGI', color:'#ff8c00' },
  sedang: { label:'SEDANG', color:'#ffd600' },
  rendah: { label:'RENDAH', color:'#00d4aa' },
};

// ─── EVENTS ─────────────────────────────────────────────────
const BASE_EVENTS = [
  { id:'ev001', type:'fire', sev:'kritis', region:'kalimantan',
    title:'Karhutla Masif Ketapang',
    loc:'Ketapang, Kalimantan Barat', lat:-1.82, lng:109.98,
    time: minsAgo(6),
    desc:'Kebakaran hutan dan lahan gambut meluas di Kabupaten Ketapang. 312 hotspot terpantau satelit. Tim Manggala Agni + BPBD berjibaku padamkan api. ISPU mencapai 289 (Berbahaya).',
    hotspots:312, area_ha:4580, korban:0, pengungsi:250, src:'LAPAN/BMKG/BPBD Kalbar' },

  { id:'ev002', type:'earthquake', sev:'kritis', region:'sulawesi',
    title:'Gempa M6.2 Donggala',
    loc:'Donggala, Sulawesi Tengah', lat:-0.67, lng:119.74,
    time: minsAgo(19),
    desc:'Gempa tektonik M6.2 kedalaman 12 km. Peringatan tsunami dikeluarkan, kemudian dicabut. Gedung bertingkat rusak berat. BNPB kerahkan helikopter ke lokasi.',
    magnitude:6.2, depth:12, korban:8, pengungsi:1200, src:'BMKG / BNPB' },

  { id:'ev003', type:'flood', sev:'tinggi', region:'papua',
    title:'Banjir Bandang Manokwari',
    loc:'Manokwari, Papua Barat', lat:-0.86, lng:134.08,
    time: minsAgo(42),
    desc:'Banjir bandang akibat luapan Sungai Prafi. 400 rumah terendam hingga 2.3m. Tim SAR aktif lakukan pencarian dan penyelamatan.',
    tinggi:'2.3m', korban:3, pengungsi:870, src:'BPBD Papua Barat' },

  { id:'ev004', type:'volcano', sev:'kritis', region:'sulawesi',
    title:'Letusan Gunung Lokon',
    loc:'Tomohon, Sulawesi Utara', lat:1.34, lng:124.79,
    time: minsAgo(78),
    desc:'Letusan freatik Gunung Lokon. Status AWAS (IV). Radius 2.5 km wajib dikosongkan. 3.400 warga diungsikan ke GOR Tomohon.',
    level:'AWAS (IV)', radius:'2.5 km', korban:0, pengungsi:3400, src:'PVMBG' },

  { id:'ev005', type:'volcano', sev:'tinggi', region:'sulawesi',
    title:'Erupsi Gunung Soputan',
    loc:'Minahasa Tenggara, Sulut', lat:1.11, lng:124.73,
    time: minsAgo(118),
    desc:'Gunung Soputan erupsi kolom abu 4.500m. Status SIAGA (III). Radius 6.5 km dilarang aktivitas. Hujan abu di Minahasa Tenggara.',
    level:'SIAGA (III)', radius:'6.5 km', kolom:'4500m', korban:0, pengungsi:0, src:'PVMBG' },

  { id:'ev006', type:'landslide', sev:'tinggi', region:'ntt',
    title:'Longsor Flores Timur',
    loc:'Ile Ape, Flores Timur, NTT', lat:-8.34, lng:122.99,
    time: minsAgo(175),
    desc:'Longsor menerjang Desa Ile Ape usai hujan 8 jam. Jalur Trans-Flores terputus. Tim SAR cari 5 korban hilang tertimbun.',
    korban:5, pengungsi:430, jalan:'Trans-Flores', src:'BPBD NTT' },

  { id:'ev007', type:'earthquake', sev:'sedang', region:'lombok',
    title:'Gempa M4.8 Lombok Utara',
    loc:'Tanjung, Lombok Utara, NTB', lat:-8.35, lng:116.13,
    time: minsAgo(235),
    desc:'Gempa M4.8 kedalaman 10 km. Warga panik berhamburan. Tidak berpotensi tsunami. Pemantauan gempa susulan aktif.',
    magnitude:4.8, depth:10, korban:0, pengungsi:0, src:'BMKG' },

  { id:'ev008', type:'fire', sev:'tinggi', region:'kalimantan',
    title:'Karhutla Kapuas Hulu',
    loc:'Putussibau, Kapuas Hulu, Kalbar', lat:0.84, lng:112.93,
    time: minsAgo(298),
    desc:'Kebakaran gambut kawasan TNBK. Asap tebal ganggu penerbangan. ISPU Putussibau: 312 (Berbahaya).',
    hotspots:187, area_ha:2100, korban:0, pengungsi:120, src:'LAPAN FIRMS' },

  { id:'ev009', type:'flood', sev:'sedang', region:'sulawesi',
    title:'Banjir Palu Sulawesi Tengah',
    loc:'Palu, Sulawesi Tengah', lat:-0.90, lng:119.87,
    time: minsAgo(355),
    desc:'Banjir rendam kelurahan Palu akibat curah hujan ekstrem. Air setinggi 40-80cm. Jembatan darurat dipasang BPBD.',
    tinggi:'0.8m', korban:0, pengungsi:320, src:'BPBD Palu' },

  { id:'ev010', type:'wind', sev:'sedang', region:'ntt',
    title:'Puting Beliung Kupang NTT',
    loc:'Kupang, NTT', lat:-10.16, lng:123.60,
    time: minsAgo(415),
    desc:'Angin puting beliung kecepatan 85 km/jam. 47 rumah rusak berat, 1 kapal nelayan tenggelam, 2 luka-luka.',
    angin:'85 km/jam', korban:2, pengungsi:85, rumah:47, src:'BMKG / BPBD NTT' },

  { id:'ev011', type:'fire', sev:'sedang', region:'kalimantan',
    title:'Karhutla Palangkaraya Kalteng',
    loc:'Palangkaraya, Kalimantan Tengah', lat:-2.21, lng:113.92,
    time: minsAgo(478),
    desc:'94 hotspot aktif di gambut Kalteng. ISPU Palangkaraya: 305 (Berbahaya). Bandara Tjilik Riwut siaga tutup.',
    hotspots:94, area_ha:800, korban:0, pengungsi:0, src:'LAPAN/KLHK' },

  { id:'ev012', type:'flood', sev:'rendah', region:'papua',
    title:'Banjir Rob Merauke',
    loc:'Merauke, Papua Selatan', lat:-8.49, lng:140.40,
    time: minsAgo(715),
    desc:'Banjir rob pasang laut rendami pesisir Merauke. Air 30-50cm. Nelayan diminta tidak melaut.',
    tinggi:'0.5m', korban:0, pengungsi:85, src:'BPBD Merauke' },

  { id:'ev013', type:'earthquake', sev:'kritis', region:'papua',
    title:'Gempa M7.0 Biak',
    loc:'Biak Numfor, Papua', lat:-1.17, lng:136.07,
    time: minsAgo(835),
    desc:'Gempa besar M7.0 kedalaman 18km. Peringatan tsunami aktif! Warga pesisir segera evakuasi ke dataran tinggi. BNPB siagakan helikopter.',
    magnitude:7.0, depth:18, korban:12, pengungsi:4500, src:'BMKG / BNPB' },

  { id:'ev014', type:'volcano', sev:'sedang', region:'ntt',
    title:'Aktivitas Gunung Rokatenda',
    loc:'Lio, Flores, NTT', lat:-8.62, lng:121.71,
    time: minsAgo(950),
    desc:'Peningkatan aktivitas G. Rokatenda. Tremor harmonik meningkat. PVMBG naikkan status ke WASPADA.',
    level:'WASPADA (II)', radius:'1.5 km', korban:0, pengungsi:0, src:'PVMBG' },

  { id:'ev015', type:'landslide', sev:'sedang', region:'sulawesi',
    title:'Longsor Toraja Utara',
    loc:'Rantepao, Toraja Utara, Sulsel', lat:-2.96, lng:119.89,
    time: minsAgo(1100),
    desc:'Longsor di jalur Rantepao-Palopo akibat hujan deras. Jalan nasional tertutup material 3m. Tidak ada korban jiwa.',
    korban:0, pengungsi:0, jalan:'Rantepao-Palopo', src:'BPBD Sulsel' },
];

// ─── HOTSPOT COORDINATES ─────────────────────────────────────
const HOTSPOTS = [
  // Kalimantan
  {lat:-1.5,lng:110.2,size:'huge'},{lat:-2.0,lng:111.5,size:'big'},{lat:-0.8,lng:109.5,size:'big'},
  {lat:-3.2,lng:114.0,size:'huge'},{lat:-2.5,lng:112.8,size:'big'},{lat:0.5,lng:110.8,size:'normal'},
  {lat:-1.0,lng:113.5,size:'big'},{lat:-2.8,lng:111.0,size:'normal'},{lat:0.3,lng:112.1,size:'normal'},
  {lat:-3.5,lng:115.2,size:'big'},{lat:1.2,lng:116.5,size:'normal'},{lat:0.9,lng:117.1,size:'big'},
  // Sumatra
  {lat:-0.5,lng:103.5,size:'big'},{lat:1.2,lng:102.8,size:'normal'},{lat:-1.5,lng:103.0,size:'big'},
  {lat:0.2,lng:101.5,size:'huge'},{lat:-2.1,lng:104.2,size:'normal'},{lat:2.5,lng:99.8,size:'normal'},
  // Sulawesi
  {lat:-1.5,lng:120.0,size:'normal'},{lat:0.5,lng:121.5,size:'normal'},
  // Papua
  {lat:-4.5,lng:136.5,size:'normal'},{lat:-3.8,lng:138.2,size:'big'},
];

// ─── VOLCANOES ───────────────────────────────────────────────
const VOLCANOES = [
  {name:'Lokon',loc:'Sulut',lat:1.34,lng:124.79,level:'awas'},
  {name:'Soputan',loc:'Sulut',lat:1.11,lng:124.73,level:'siaga'},
  {name:'Karangetang',loc:'Sulut',lat:2.78,lng:125.40,level:'siaga'},
  {name:'Dukono',loc:'Maluku Utara',lat:1.68,lng:127.88,level:'siaga'},
  {name:'Ibu',loc:'Maluku Utara',lat:1.49,lng:127.63,level:'siaga'},
  {name:'Gamalama',loc:'Ternate',lat:0.80,lng:127.33,level:'waspada'},
  {name:'Rokatenda',loc:'NTT',lat:-8.62,lng:121.71,level:'waspada'},
  {name:'Iya',loc:'NTT',lat:-8.89,lng:121.64,level:'waspada'},
  {name:'Tambora',loc:'NTB',lat:-8.24,lng:117.99,level:'waspada'},
  {name:'Rinjani',loc:'Lombok',lat:-8.41,lng:116.47,level:'waspada'},
  {name:'Semeru',loc:'Jawa Timur',lat:-8.11,lng:112.92,level:'siaga'},
  {name:'Merapi',loc:'Jawa Tengah',lat:-7.54,lng:110.44,level:'siaga'},
  {name:'Sinabung',loc:'Sumatra Utara',lat:3.17,lng:98.39,level:'waspada'},
  {name:'Anak Krakatau',loc:'Selat Sunda',lat:-6.10,lng:105.42,level:'waspada'},
];

// ─── NEWS ITEMS ──────────────────────────────────────────────
const NEWS_FEED = {
  bnpb: [
    {time:minsAgo(3), src:'BNPB', srcColor:'#ff4500', breaking:true,
     headline:'⚡ BREAKING: Gempa M7.0 Biak — Peringatan tsunami dikeluarkan BMKG, warga segera evakuasi ke dataran tinggi', tags:['Gempa','Papua','Tsunami']},
    {time:minsAgo(8), src:'BNPB', srcColor:'#ff4500', breaking:false,
     headline:'Status BNPB: 14 kejadian bencana aktif dipantau hari ini di wilayah Indonesia Timur', tags:['Update','BNPB']},
    {time:minsAgo(12), src:'BNPB', srcColor:'#ff4500', breaking:false,
     headline:'Helikopter BNPB dikerahkan ke Donggala usai gempa M6.2, bawa logistik 5 ton', tags:['Gempa','Sulawesi','Logistik']},
    {time:minsAgo(22), src:'BNPB', srcColor:'#ff4500', breaking:false,
     headline:'Update Karhutla Kalimantan: 847 hotspot aktif, luas terbakar kumulatif 14.200 hektare', tags:['Karhutla','Kalimantan']},
    {time:minsAgo(35), src:'BNPB', srcColor:'#ff4500', breaking:false,
     headline:'BNPB pasok 200 ton sembako ke pengungsi letusan Gunung Lokon di GOR Tomohon', tags:['Lokon','Sulut','Logistik']},
    {time:minsAgo(58), src:'BNPB', srcColor:'#ff4500', breaking:false,
     headline:'Tim SAR gabungan temukan 2 dari 5 korban longsor Flores Timur, pencarian dilanjutkan', tags:['Longsor','NTT','SAR']},
  ],
  bmkg: [
    {time:minsAgo(2), src:'BMKG', srcColor:'#0099ff', breaking:true,
     headline:'⚡ PERINGATAN TSUNAMI: Gempa M7.0 Biak — Gelombang berpotensi hingga 1-3 meter pesisir Papua', tags:['Tsunami','Papua','Gempa']},
    {time:minsAgo(9), src:'BMKG', srcColor:'#0099ff', breaking:false,
     headline:'Peringatan cuaca ekstrem: Hujan lebat disertai petir di Kalimantan Barat dan Kalteng 24 jam ke depan', tags:['Cuaca','Kalimantan']},
    {time:minsAgo(18), src:'BMKG', srcColor:'#0099ff', breaking:false,
     headline:'Gelombang tinggi 3-4m di Laut Banda dan Perairan Maluku — kapal ≤7m dilarang berlayar', tags:['Gelombang','Maluku']},
    {time:minsAgo(31), src:'BMKG', srcColor:'#0099ff', breaking:false,
     headline:'Gempa susulan M4.1 di Donggala — total 18 kali gempa susulan pasca M6.2', tags:['Gempa','Sulawesi']},
    {time:minsAgo(67), src:'BMKG', srcColor:'#0099ff', breaking:false,
     headline:'ISPU Palangkaraya: 318 (BERBAHAYA) — Masker N95 wajib, anak-anak dan lansia tidak boleh keluar', tags:['Asap','Kalteng','ISPU']},
  ],
  metrotv: [
    {time:minsAgo(5), src:'METRO TV', srcColor:'#e63946', breaking:true,
     headline:'⚡ SIARAN LANGSUNG: Situasi terkini di lokasi gempa Biak — wartawan Metro di TKP', tags:['Gempa','Papua','LIVE']},
    {time:minsAgo(14), src:'METRO TV', srcColor:'#e63946', breaking:false,
     headline:'Warga Tomohon mengungsi besar-besaran usai Gunung Lokon meletus — ribuan orang padati GOR', tags:['Lokon','Sulut']},
    {time:minsAgo(29), src:'METRO TV', srcColor:'#e63946', breaking:false,
     headline:'Liputan khusus banjir bandang Manokwari: Rumah-rumah hanyut terbawa arus deras', tags:['Banjir','Papua']},
  ],
  tvone: [
    {time:minsAgo(7), src:'tvOne', srcColor:'#ffd600', breaking:false,
     headline:'Presiden instruksikan percepatan penanganan bencana di Papua dan Sulawesi', tags:['Pemerintah','Update']},
    {time:minsAgo(23), src:'tvOne', srcColor:'#ffd600', breaking:false,
     headline:'Korban gempa Donggala butuh tenda dan air bersih — BNPB kerahkan tambahan personel', tags:['Gempa','Sulawesi']},
    {time:minsAgo(44), src:'tvOne', srcColor:'#ffd600', breaking:false,
     headline:'Longsor Flores Timur: Jalur Trans-Flores terputus, distribusi logistik terganggu', tags:['Longsor','NTT']},
  ],
  kompas: [
    {time:minsAgo(11), src:'KOMPAS', srcColor:'#00d4aa', breaking:false,
     headline:'Analisis: Puncak musim kemarau perparah karhutla — 5 provinsi dalam status siaga', tags:['Karhutla','Analisis']},
    {time:minsAgo(38), src:'KOMPAS', srcColor:'#00d4aa', breaking:false,
     headline:'Daftar 10 gunung api paling aktif Indonesia yang perlu diwaspadai September 2026', tags:['Gunung Api','Analisis']},
  ],
  antara: [
    {time:minsAgo(6), src:'ANTARA', srcColor:'#9b5de5', breaking:false,
     headline:'BPBD Papua Barat: 870 pengungsi banjir Manokwari butuh bantuan segera', tags:['Banjir','Papua']},
    {time:minsAgo(16), src:'ANTARA', srcColor:'#9b5de5', breaking:false,
     headline:'Pemprov NTT nyatakan tanggap darurat bencana selama 14 hari imbas longsor Flores', tags:['Longsor','NTT']},
    {time:minsAgo(41), src:'ANTARA', srcColor:'#9b5de5', breaking:false,
     headline:'Hotspot Kalimantan capai 847 titik — tertinggi dalam 3 tahun terakhir menurut LAPAN', tags:['Karhutla','Kalimantan']},
  ],
  cnni: [
    {time:minsAgo(4), src:'CNN INDONESIA', srcColor:'#ff8c00', breaking:true,
     headline:'⚡ EKSKLUSIF: Kondisi terkini pascagempa Biak — liputan langsung dari Kepulauan Biak', tags:['Gempa','Papua']},
    {time:minsAgo(27), src:'CNN INDONESIA', srcColor:'#ff8c00', breaking:false,
     headline:'Indonesia catat 47 bencana alam dalam 7 hari — BNPB siagakan seluruh tim respons cepat', tags:['Statistik','BNPB']},
  ],
};

// ─── WEBCAM SCENARIOS ────────────────────────────────────────
const CAM_SCENARIOS = {
  karhutla: [
    {loc:'Ketapang, Kalbar', type:'fire', status:'alert', icon:'🔥', data:'ISPU: 289 | Hotspot: 312'},
    {loc:'Palangkaraya, Kalteng', type:'fire', status:'alert', icon:'🔥', data:'ISPU: 318 | Hotspot: 94'},
    {loc:'Kapuas Hulu, Kalbar', type:'fire', status:'live', icon:'🔥', data:'ISPU: 201 | Hotspot: 187'},
    {loc:'Jambi, Sumatra', type:'fire', status:'live', icon:'🔥', data:'ISPU: 175 | Hotspot: 62'},
    {loc:'Riau, Sumatra', type:'fire', status:'live', icon:'🔥', data:'ISPU: 143 | Hotspot: 45'},
    {loc:'OKI, Sumatra Sel.', type:'fire', status:'live', icon:'🔥', data:'ISPU: 98 | Hotspot: 31'},
    {loc:'Kaltim, Balikpapan', type:'fire', status:'live', icon:'🔥', data:'ISPU: 78 | Hotspot: 23'},
    {loc:'Kalsel, Banjarbaru', type:'fire', status:'off', icon:'🔥', data:'ISPU: 52 | Hotspot: 12'},
  ],
  sulawesi: [
    {loc:'Tomohon — G. Lokon', type:'volcano', status:'alert', icon:'🌄', data:'Abu ↑ | AWAS'},
    {loc:'Minahasa — G. Soputan', type:'volcano', status:'alert', icon:'🌄', data:'Kolom 4.5km | SIAGA'},
    {loc:'Donggala — Gempa', type:'earthquake', status:'alert', icon:'🌋', data:'M6.2 · D:12km'},
    {loc:'Palu — Banjir', type:'flood', status:'live', icon:'🌊', data:'H: 0.8m | 320 Pengungsi'},
    {loc:'Makassar — CCTV', type:'flood', status:'live', icon:'🌊', data:'Normal'},
    {loc:'Toraja — Longsor', type:'landslide', status:'live', icon:'⛰️', data:'Jalur terputus'},
    {loc:'Kendari — Pantau', type:'flood', status:'live', icon:'🌊', data:'Siaga'},
    {loc:'Manado — Stasiun', type:'wind', status:'live', icon:'🌀', data:'Angin 65 km/h'},
  ],
  papua: [
    {loc:'Biak — Gempa M7.0', type:'earthquake', status:'alert', icon:'🌋', data:'M7.0 · TSUNAMI ⚠', featured:true},
    {loc:'Manokwari — Banjir', type:'flood', status:'alert', icon:'🌊', data:'H: 2.3m | 870 Pengungsi'},
    {loc:'Jayapura — Pantau', type:'flood', status:'live', icon:'🌊', data:'Normal'},
    {loc:'Merauke — Rob', type:'flood', status:'live', icon:'🌊', data:'H: 0.5m | Rob'},
    {loc:'Fakfak — CCTV', type:'flood', status:'live', icon:'🌊', data:'Hujan Lebat'},
    {loc:'Nabire — Pantau', type:'earthquake', status:'live', icon:'🌋', data:'Normal'},
    {loc:'Sorong — Pantau', type:'wind', status:'live', icon:'🌀', data:'Angin 55 km/h'},
    {loc:'Wamena — Cuaca', type:'wind', status:'live', icon:'🌀', data:'Berkabut'},
  ],
  ntt: [
    {loc:'Ile Ape — Longsor', type:'landslide', status:'alert', icon:'⛰️', data:'5 Hilang | SAR Aktif'},
    {loc:'Kupang — Angin', type:'wind', status:'alert', icon:'🌀', data:'85 km/h | 47 Rusak'},
    {loc:'Flores Timur', type:'landslide', status:'live', icon:'⛰️', data:'Trans-Flores Terputus'},
    {loc:'Ende — G. Iya', type:'volcano', status:'live', icon:'🌄', data:'WASPADA'},
    {loc:'Ruteng — Hujan', type:'flood', status:'live', icon:'🌊', data:'Curah Hujan Tinggi'},
    {loc:'Larantuka — CCTV', type:'flood', status:'live', icon:'🌊', data:'Normal'},
    {loc:'Maumere — Pantau', type:'earthquake', status:'live', icon:'🌋', data:'Siaga Gempa'},
    {loc:'Bajawa — G. Rokatenda', type:'volcano', status:'live', icon:'🌄', data:'WASPADA'},
  ],
  lombok: [
    {loc:'Lombok Utara — Gempa', type:'earthquake', status:'alert', icon:'🌋', data:'M4.8 | 10 Susulan'},
    {loc:'G. Rinjani', type:'volcano', status:'live', icon:'🌄', data:'WASPADA · Wisata Tutup'},
    {loc:'Mataram — CCTV', type:'flood', status:'live', icon:'🌊', data:'Normal'},
    {loc:'Sumbawa — Tambora', type:'volcano', status:'live', icon:'🌄', data:'WASPADA'},
    {loc:'Bima — Pantau', type:'flood', status:'live', icon:'🌊', data:'Normal'},
    {loc:'Gili Trawangan — Cam', type:'wind', status:'live', icon:'🌀', data:'Gelombang 2m'},
    {loc:'Praya — Cuaca', type:'wind', status:'live', icon:'🌀', data:'Normal'},
    {loc:'Senggigi — CCTV', type:'wind', status:'live', icon:'🌀', data:'Normal'},
  ],
  volcano: [
    {loc:'G. Lokon — Sulut', type:'volcano', status:'alert', icon:'🌄', data:'AWAS (IV) | Abu 3km'},
    {loc:'G. Soputan — Sulut', type:'volcano', status:'alert', icon:'🌄', data:'SIAGA (III) | Abu 4.5km'},
    {loc:'G. Karangetang — Sulut', type:'volcano', status:'alert', icon:'🌄', data:'SIAGA (III)'},
    {loc:'G. Dukono — Malut', type:'volcano', status:'alert', icon:'🌄', data:'SIAGA (III)'},
    {loc:'G. Ibu — Malut', type:'volcano', status:'live', icon:'🌄', data:'SIAGA (III)'},
    {loc:'G. Rinjani — NTB', type:'volcano', status:'live', icon:'🌄', data:'WASPADA (II)'},
    {loc:'G. Semeru — Jatim', type:'volcano', status:'live', icon:'🌄', data:'SIAGA (III)'},
    {loc:'G. Merapi — DIY', type:'volcano', status:'live', icon:'🌄', data:'SIAGA (III)'},
  ],
  all: [
    {loc:'Ketapang — Karhutla', type:'fire', status:'alert', icon:'🔥', data:'ISPU: 289'},
    {loc:'Biak — Gempa M7.0', type:'earthquake', status:'alert', icon:'🌋', data:'M7.0 · TSUNAMI ⚠'},
    {loc:'Lokon — Erupsi', type:'volcano', status:'alert', icon:'🌄', data:'AWAS (IV)'},
    {loc:'Manokwari — Banjir', type:'flood', status:'alert', icon:'🌊', data:'H: 2.3m'},
    {loc:'Ile Ape — Longsor', type:'landslide', status:'live', icon:'⛰️', data:'SAR Aktif'},
    {loc:'Donggala — Gempa', type:'earthquake', status:'live', icon:'🌋', data:'M6.2'},
    {loc:'Kupang — Angin', type:'wind', status:'live', icon:'🌀', data:'85 km/h'},
    {loc:'Palu — Banjir', type:'flood', status:'live', icon:'🌊', data:'H: 0.8m'},
  ],
};

// ─── LAYERS CONFIG ───────────────────────────────────────────
const LAYERS_CONFIG = [
  {id:'fire',      label:'KEBAKARAN HUTAN',  icon:'🔥', color:'#ff4500', enabled:true,  count:0},
  {id:'hotspot',   label:'HOTSPOT SATELIT',  icon:'🛰️', color:'#ff8c00', enabled:true,  count:0},
  {id:'flood',     label:'BANJIR',           icon:'🌊', color:'#0077b6', enabled:true,  count:0},
  {id:'earthquake',label:'GEMPA BUMI',       icon:'🌋', color:'#f4a261', enabled:true,  count:0},
  {id:'landslide', label:'TANAH LONGSOR',    icon:'⛰️', color:'#6a994e', enabled:true,  count:0},
  {id:'volcano',   label:'GUNUNG API',       icon:'🌄', color:'#e63946', enabled:true,  count:0},
  {id:'wind',      label:'ANGIN KENCANG',    icon:'🌀', color:'#9b5de5', enabled:false, count:0},
  {id:'bnpb_post', label:'POS BNPB',         icon:'🏛️', color:'#00d4aa', enabled:true,  count:8},
];

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════

function minsAgo(m){ return new Date(Date.now() - m*60000); }

function timeAgo(d){
  const s = Math.floor((Date.now()-d)/1000);
  if(s<60) return `${s}d`;
  const m=Math.floor(s/60); if(m<60) return `${m}m`;
  const h=Math.floor(m/60); if(h<24) return `${h}j`;
  return `${Math.floor(h/24)}h`;
}

function fmtTime(d){
  return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Jakarta',hour12:false});
}

function fmtDateTime(d){
  return d.toLocaleString('id-ID',{
    weekday:'short',day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'
  }) + ' WIB';
}

function r(min,max){ return Math.random()*(max-min)+min; }

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

const S = {
  events: [...BASE_EVENTS],
  map: null,
  mapMarkers: new Map(),
  hsMarkers: [],
  volcanoMarkers: [],
  layers: Object.fromEntries(LAYERS_CONFIG.map(l=>[l.id,{...l}])),
  activeRegion: 'all',
  activeNewsTab: 'bnpb',
  activeCamTab: 'karhutla',
  newInsightCount: 0,
  newsPaused: false,
  lastEventId: 100,
  alertLevel: 3,
};

// ═══════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════

function startClock(){
  const el = document.getElementById('sb-clock');
  const tick = ()=>{
    const now = new Date();
    const wib = new Date(now.toLocaleString('en-US',{timeZone:'Asia/Jakarta'}));
    el.textContent = `${String(wib.getHours()).padStart(2,'0')} : ${String(wib.getMinutes()).padStart(2,'0')} : ${String(wib.getSeconds()).padStart(2,'0')} WIB`;
    // Also update subbar date
    const sd = document.getElementById('subbar');
    if(sd && !document.querySelector('.sb-date')){
      const sp = document.createElement('span');
      sp.className='sb-date';
      sp.style.cssText='font-size:9px;color:var(--text3)';
    }
  };
  tick(); setInterval(tick,1000);
}

// ═══════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════

function initMap(){
  const map = L.map('map',{center:[-3,122],zoom:5,zoomControl:false,attributionControl:false});

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    maxZoom:19, subdomains:'abcd'
  }).addTo(map);

  L.control.zoom({position:'bottomright'}).addTo(map);

  // Coords on hover
  map.on('mousemove',(e)=>{
    // Optional: update some coord display
  });

  S.map = map;
}

// ─── Make icon ─────────────────────────────────────────────
function makeIcon(ev){
  const meta = DISASTER_META[ev.type] || DISASTER_META.fire;
  const isCrit = ev.sev === 'kritis';
  const el = document.createElement('div');
  el.className = `dm ${meta.cls}${isCrit?' dm-kritis':''}`;
  el.innerHTML = meta.icon;
  el.title = ev.title;
  return L.divIcon({html:el.outerHTML,className:'',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-14]});
}

function popupHtml(ev){
  const meta = DISASTER_META[ev.type];
  const sev = SEV[ev.sev];
  return `
    <div class="lp-type" style="color:${meta.color}">${meta.icon} ${meta.label}</div>
    <div class="lp-title">${ev.title}</div>
    <div class="lp-loc">📍 ${ev.loc}</div>
    <div class="lp-meta">
      <span style="color:${sev.color};font-weight:700">${sev.label}</span>
      <span>⏱ ${timeAgo(ev.time)}</span>
      <span>Src: ${ev.src||'BNPB'}</span>
    </div>
    <div class="lp-desc">${ev.desc.substring(0,120)}...</div>
    <div class="lp-link" onclick="window.openModal('${ev.id}')">→ Detail lengkap</div>
  `;
}

function addEventMarker(ev){
  if(!S.layers[ev.type]?.enabled) return;
  const m = L.marker([ev.lat,ev.lng],{icon:makeIcon(ev)})
    .bindPopup(popupHtml(ev),{maxWidth:270})
    .on('click',()=>openModal(ev.id));
  m.addTo(S.map);
  S.mapMarkers.set(ev.id,m);
}

function addHotspotMarkers(){
  S.hsMarkers.forEach(m=>S.map.removeLayer(m));
  S.hsMarkers=[];
  if(!S.layers.hotspot?.enabled) return;
  HOTSPOTS.forEach(h=>{
    const el = document.createElement('div');
    el.className = `hs-dot ${h.size}`;
    const icon = L.divIcon({html:el.outerHTML,className:'',iconSize:h.size==='huge'?[22,22]:h.size==='big'?[16,16]:[12,12],iconAnchor:[6,6]});
    const m = L.marker([h.lat,h.lng],{icon})
      .bindPopup(`<div style="font-size:10px"><div style="color:#ff8c00;font-weight:700">🛰️ HOTSPOT LAPAN/FIRMS</div><div style="color:var(--text2);margin-top:4px">${h.lat.toFixed(2)}, ${h.lng.toFixed(2)}</div><div style="font-size:9px;color:var(--text3);margin-top:3px">Terdeteksi ${h.size==='huge'?'sangat terang':h.size==='big'?'terang':'normal'}</div></div>`)
      .addTo(S.map);
    S.hsMarkers.push(m);
  });
}

function addVolcanoMarkersToMap(){
  S.volcanoMarkers.forEach(m=>S.map.removeLayer(m));
  S.volcanoMarkers=[];
  if(!S.layers.volcano?.enabled) return;
  VOLCANOES.forEach(v=>{
    const colorMap={awas:'#ff2d2d',siaga:'#ff8c00',waspada:'#ffd600',normal:'#00d4aa'};
    const c = colorMap[v.level]||'#ffd600';
    const el = document.createElement('div');
    el.style.cssText=`width:18px;height:18px;border-radius:50%;background:${c}33;border:2px solid ${c};display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;box-shadow:0 0 8px ${c}66`;
    el.innerHTML='🌋';
    const icon = L.divIcon({html:el.outerHTML,className:'',iconSize:[18,18],iconAnchor:[9,9]});
    const m = L.marker([v.lat,v.lng],{icon})
      .bindPopup(`<div><div style="font-weight:700;font-size:11px;margin-bottom:3px">🌋 G. ${v.name}</div><div style="font-size:9px;color:#7ecfff">${v.loc}</div><div style="margin-top:5px;font-size:10px">Status: <span style="color:${c};font-weight:700">${v.level.toUpperCase()}</span></div></div>`)
      .addTo(S.map);
    S.volcanoMarkers.push(m);
  });
}

function renderAllMapMarkers(){
  S.mapMarkers.forEach(m=>S.map.removeLayer(m));
  S.mapMarkers.clear();
  S.events.filter(ev=>matchRegion(ev)).forEach(ev=>addEventMarker(ev));
  addHotspotMarkers();
  addVolcanoMarkersToMap();
}

function matchRegion(ev){
  if(S.activeRegion==='all') return true;
  return ev.region === S.activeRegion;
}

// ═══════════════════════════════════════════════════════════
// LAYER PANEL
// ═══════════════════════════════════════════════════════════

function renderLayerPanel(){
  // Count per type
  S.events.forEach(ev=>{
    if(S.layers[ev.type]) S.layers[ev.type].count = (S.layers[ev.type].count||0);
  });
  const counts = {};
  S.events.forEach(ev=>{ counts[ev.type]=(counts[ev.type]||0)+1; });
  HOTSPOTS.forEach(()=>{ counts.hotspot=(counts.hotspot||0)+1; });

  const activeCount = Object.values(S.layers).filter(l=>l.enabled).length;
  document.getElementById('lp-active-count').textContent = activeCount;

  document.getElementById('layer-list').innerHTML = LAYERS_CONFIG.map(l=>`
    <div class="layer-item${!S.layers[l.id]?.enabled?' disabled':''}" id="layer-${l.id}" onclick="toggleLayer('${l.id}')">
      <div class="li-checkbox${S.layers[l.id]?.enabled?' checked':''}">
        ${S.layers[l.id]?.enabled?'<span style="color:#000;font-size:8px;font-weight:700">✓</span>':''}
      </div>
      <div class="li-dot" style="background:${l.color};box-shadow:0 0 4px ${l.color}66"></div>
      <div class="li-icon">${l.icon}</div>
      <div class="li-name">${l.label}</div>
      <div class="li-count">${counts[l.id]||l.count||0}</div>
    </div>
  `).join('');
}

window.toggleLayer = function(id){
  S.layers[id].enabled = !S.layers[id].enabled;
  renderLayerPanel();
  renderAllMapMarkers();
};

// ═══════════════════════════════════════════════════════════
// NEWS PANEL
// ═══════════════════════════════════════════════════════════

function renderNews(ch){
  const items = NEWS_FEED[ch] || NEWS_FEED.bnpb;
  const feed = document.getElementById('news-feed');
  feed.innerHTML = items.map(n=>`
    <div class="news-item" onclick="">
      <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;align-items:center">
        <div class="ni-source" style="background:${n.srcColor}22;color:${n.srcColor};border:1px solid ${n.srcColor}44">${n.src}</div>
        <div class="ni-time">${timeAgo(n.time)}</div>
      </div>
      <div class="ni-body">
        <div class="ni-headline${n.breaking?' ni-breaking':''}">${n.headline}</div>
        <div class="ni-tags">${(n.tags||[]).map(t=>`<span class="ni-tag">${t}</span>`).join('')}</div>
      </div>
    </div>
  `).join('');
}

function renderTicker2(){
  const all = Object.values(NEWS_FEED).flat()
    .filter(n=>n.breaking)
    .sort((a,b)=>b.time-a.time);
  // duplicate for seamless loop
  const doubled = [...all,...all];
  document.getElementById('ticker-track2').innerHTML = doubled.map(n=>
    `<span>${n.headline}&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;</span>`
  ).join('');
}

function initNewsTabs(){
  document.querySelectorAll('.ntab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.ntab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      S.activeNewsTab = tab.dataset.ch;
      renderNews(S.activeNewsTab);
    });
  });
}

window.toggleNewsPause = function(){
  S.newsPaused = !S.newsPaused;
  document.getElementById('news-pause-btn').textContent = S.newsPaused ? '▶' : '⏸';
};

window.refreshNews = function(){
  renderNews(S.activeNewsTab);
};

// ═══════════════════════════════════════════════════════════
// WEBCAM PANEL
// ═══════════════════════════════════════════════════════════

function camCellHtml(cam, featured){
  const statusMap = {alert:'cs-alert AWAS',live:'cs-live LIVE',off:'cs-off OFF'};
  const [cls,label] = (statusMap[cam.status]||'cs-off OFF').split(' ');
  const typeColorMap = {
    fire:'linear-gradient(135deg,#1a0800,#2a0e00)',
    flood:'linear-gradient(135deg,#00060f,#001220)',
    earthquake:'linear-gradient(135deg,#130900,#231200)',
    landslide:'linear-gradient(135deg,#060d02,#0e1c04)',
    volcano:'linear-gradient(135deg,#160003,#2a0006)',
    wind:'linear-gradient(135deg,#06020f,#0c0520)',
  };
  const bg = typeColorMap[cam.type]||'var(--bg2)';
  return `
    <div class="cam-cell${featured?' featured':''}" style="background:${bg}" onclick="camClick('${cam.loc}')">
      <div class="cam-placeholder">
        <div class="cam-disaster-icon">${cam.icon}</div>
        <div class="cam-label">${cam.loc}</div>
      </div>
      <div class="cam-status ${cls}">${label}</div>
      <div class="cam-data-overlay">${cam.data}</div>
      <div class="cam-location">${cam.loc}</div>
    </div>
  `;
}

function renderCams(scenario){
  const cams = CAM_SCENARIOS[scenario] || CAM_SCENARIOS.all;
  const grid = document.getElementById('cam-grid');
  grid.innerHTML = cams.map((c,i)=>camCellHtml(c, i===0 && c.status==='alert')).join('');
}

function initCamTabs(){
  document.querySelectorAll('.ctab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.ctab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      S.activeCamTab = tab.dataset.cam;
      renderCams(S.activeCamTab);
    });
  });
}

window.camClick = function(loc){
  showToastMsg('📡','Kamera '+loc,'Memuat siaran langsung...');
};

// ═══════════════════════════════════════════════════════════
// INSIGHTS PANEL
// ═══════════════════════════════════════════════════════════

function renderInsights(){
  const kritis = S.events.filter(e=>e.sev==='kritis').length;
  const tinggi = S.events.filter(e=>e.sev==='tinggi').length;
  const totalKorban = S.events.reduce((s,e)=>s+(e.korban||0),0);
  const totalPengungsi = S.events.reduce((s,e)=>s+(e.pengungsi||0),0);

  const regions = {
    'Kalimantan': S.events.filter(e=>e.region==='kalimantan').length,
    'Sulawesi': S.events.filter(e=>e.region==='sulawesi').length,
    'Papua': S.events.filter(e=>e.region==='papua').length,
    'NTT': S.events.filter(e=>e.region==='ntt').length,
    'Lombok': S.events.filter(e=>e.region==='lombok').length,
    'Maluku': S.events.filter(e=>e.region==='maluku').length,
  };
  const maxReg = Math.max(...Object.values(regions));

  document.getElementById('insights-content').innerHTML = `
    <!-- World Brief -->
    <div class="insight-section">
      <div class="ins-header">
        <span class="ins-title">RINGKASAN BENCANA</span>
        <span class="ins-badge new-badge">TERBARU</span>
      </div>
      <div class="ins-body">
        <span class="ins-highlight">${kritis}</span> kejadian berstatus KRITIS, <span class="ins-highlight">${tinggi}</span> TINGGI dipantau saat ini.
        Gempa M7.0 di <span class="ins-highlight">Biak, Papua</span> adalah insiden terbesar — tsunami warning aktif.
        Karhutla Kalimantan dengan <span class="ins-highlight">847 hotspot</span> terus meluas, ISPU berbahaya di 3 kota.
        Gunung Lokon status AWAS — <span class="ins-highlight">3.400 warga</span> diungsikan.
      </div>
    </div>

    <!-- Stats -->
    <div class="insight-section">
      <div class="ins-header"><span class="ins-title">STATISTIK AKTIF</span></div>
      <div class="insight-row"><span class="ir-label">Total Kejadian</span><span class="ir-value ir-crit">${S.events.length}</span></div>
      <div class="insight-row"><span class="ir-label">Korban</span><span class="ir-value ir-high">${totalKorban}</span><span class="ir-trend">jiwa</span></div>
      <div class="insight-row"><span class="ir-label">Pengungsi</span><span class="ir-value ir-med">${totalPengungsi.toLocaleString('id-ID')}</span><span class="ir-trend">org</span></div>
      <div class="insight-row"><span class="ir-label">Hotspot Aktif</span><span class="ir-value ir-high">1.847</span><span class="ir-trend">titik</span></div>
      <div class="insight-row"><span class="ir-label">Gunung API Aktif</span><span class="ir-value ir-med">14</span><span class="ir-trend">puncak</span></div>
    </div>

    <!-- Region Activity -->
    <div class="insight-section">
      <div class="ins-header"><span class="ins-title">AKTIVITAS WILAYAH</span></div>
      ${Object.entries(regions).map(([name,count])=>`
        <div class="activity-bar">
          <div class="ab-label">${name}</div>
          <div class="ab-bar-bg">
            <div class="ab-bar-fill" style="width:${(count/maxReg*100).toFixed(0)}%;background:${count>=4?'var(--kritis)':count>=2?'var(--tinggi)':'var(--sedang)'}"></div>
          </div>
          <div class="ab-val">${count}</div>
        </div>
      `).join('')}
    </div>

    <!-- Posture / Status Kritis -->
    <div class="insight-section">
      <div class="ins-header"><span class="ins-title">STATUS KRITIS</span><span class="ins-badge new-badge">${kritis} AWAS</span></div>
      <div class="posture-item">
        <div class="pi-header">
          <span class="pi-name">Papua — Gempa+Tsunami</span>
          <span class="pi-status ps-awas">AWAS</span>
        </div>
        <div class="pi-metrics">
          <div class="pi-metric"><span class="num">M7.0</span> Gempa</div>
          <div class="pi-metric"><span class="num">4.5k</span> Pengungsi</div>
        </div>
        <div class="stable-note">→ Tsunami warning aktif pesisir Biak</div>
      </div>
      <div class="posture-item">
        <div class="pi-header">
          <span class="pi-name">Sulawesi Utara — Lokon</span>
          <span class="pi-status ps-awas">AWAS</span>
        </div>
        <div class="pi-metrics">
          <div class="pi-metric"><span class="num">IV</span> Level</div>
          <div class="pi-metric"><span class="num">3.4k</span> Pengungsi</div>
        </div>
        <div class="stable-note">→ Abu vulkanik mencapai 3km</div>
      </div>
      <div class="posture-item">
        <div class="pi-header">
          <span class="pi-name">Kalimantan — Karhutla</span>
          <span class="pi-status ps-siaga">SIAGA</span>
        </div>
        <div class="pi-metrics">
          <div class="pi-metric"><span class="num">847</span> Hotspot</div>
          <div class="pi-metric"><span class="num">14.2k</span> ha</div>
        </div>
        <div class="stable-note">→ ISPU berbahaya 3 kota, sekolah tutup</div>
      </div>
      <div class="posture-item">
        <div class="pi-header">
          <span class="pi-name">Sulawesi Tengah — Gempa</span>
          <span class="pi-status ps-siaga">SIAGA</span>
        </div>
        <div class="pi-metrics">
          <div class="pi-metric"><span class="num">M6.2</span> Gempa</div>
          <div class="pi-metric"><span class="num">1.2k</span> Pengungsi</div>
        </div>
        <div class="stable-note">→ 18 gempa susulan tercatat BMKG</div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// STATS CHIPS (topbar)
// ═══════════════════════════════════════════════════════════

function updateChips(){
  const counts = {};
  S.events.forEach(e=>{ counts[e.type]=(counts[e.type]||0)+1; });
  document.getElementById('chip-fire').textContent = counts.fire||0;
  document.getElementById('chip-flood').textContent = counts.flood||0;
  document.getElementById('chip-quake').textContent = (counts.earthquake||0);
  document.getElementById('chip-volcano').textContent = counts.volcano||0;

  // Event count label
  document.getElementById('event-count-label').textContent =
    `${S.events.length} kejadian aktif dipantau`;
}

// ═══════════════════════════════════════════════════════════
// REGION SELECT
// ═══════════════════════════════════════════════════════════

const REGION_VIEW = {
  all:        {center:[-3,122],zoom:5},
  kalimantan: {center:[0.5,114],zoom:6},
  sulawesi:   {center:[-2,121.5],zoom:6},
  papua:      {center:[-5,138],zoom:6},
  ntt:        {center:[-9.5,124],zoom:7},
  lombok:     {center:[-8.6,116.3],zoom:9},
  maluku:     {center:[-3,128],zoom:7},
  jawa:       {center:[-7.5,110],zoom:7},
  sumatra:    {center:[0.5,101],zoom:6},
};

function initRegionSelect(){
  document.getElementById('region-select').addEventListener('change',function(){
    S.activeRegion = this.value;
    const v = REGION_VIEW[S.activeRegion]||REGION_VIEW.all;
    S.map.flyTo(v.center,v.zoom,{duration:1.5});
    renderAllMapMarkers();
    renderNews(S.activeNewsTab);
  });
}

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════

function initSearch(){
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input',()=>{
    const q = input.value.trim().toLowerCase();
    if(q.length < 2){ results.style.display='none'; return; }

    const found = S.events.filter(e=>
      e.title.toLowerCase().includes(q)||
      e.loc.toLowerCase().includes(q)||
      e.region.toLowerCase().includes(q)||
      DISASTER_META[e.type]?.label.toLowerCase().includes(q)
    ).slice(0,8);

    const volcFound = VOLCANOES.filter(v=>
      v.name.toLowerCase().includes(q)||v.loc.toLowerCase().includes(q)
    ).slice(0,3);

    if(found.length===0 && volcFound.length===0){
      results.innerHTML='<div style="padding:12px;text-align:center;font-size:10px;color:var(--text3)">Tidak ditemukan</div>';
      results.style.display='block';
      return;
    }

    results.innerHTML=[
      ...found.map(ev=>{
        const meta=DISASTER_META[ev.type];
        const sev=SEV[ev.sev];
        return `<div class="sr-item" onclick="searchGoto(${ev.lat},${ev.lng},'${ev.id}')">
          <div class="sr-icon">${meta.icon}</div>
          <div style="flex:1;min-width:0">
            <div class="sr-title">${ev.title}</div>
            <div class="sr-sub">${ev.loc} · ${timeAgo(ev.time)}</div>
          </div>
          <span class="sr-badge" style="background:${sev.color}22;color:${sev.color};border:1px solid ${sev.color}44">${sev.label}</span>
        </div>`;
      }),
      ...volcFound.map(v=>`<div class="sr-item" onclick="searchGoto(${v.lat},${v.lng},null)">
        <div class="sr-icon">🌋</div>
        <div style="flex:1;min-width:0">
          <div class="sr-title">G. ${v.name}</div>
          <div class="sr-sub">${v.loc}</div>
        </div>
        <span class="sr-badge" style="background:var(--sedang)22;color:var(--sedang)">GUNUNG API</span>
      </div>`)
    ].join('');
    results.style.display='block';
  });

  document.addEventListener('click',(e)=>{
    if(!e.target.closest('#search-input')&&!e.target.closest('#search-results')) results.style.display='none';
  });
}

window.searchGoto = function(lat,lng,evId){
  S.map.flyTo([lat,lng],10,{duration:1.2});
  document.getElementById('search-results').style.display='none';
  document.getElementById('search-input').value='';
  if(evId) setTimeout(()=>openModal(evId),1200);
};

// ═══════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════

window.openModal = function(evId){
  const ev = S.events.find(e=>e.id===evId);
  if(!ev) return;
  const meta=DISASTER_META[ev.type];
  const sev=SEV[ev.sev];

  // Fly to
  S.map.flyTo([ev.lat,ev.lng],10,{duration:1.2});

  // Build extra data table
  const extraRows = [];
  if(ev.magnitude) extraRows.push(['Magnitudo',`M ${ev.magnitude}`]);
  if(ev.depth) extraRows.push(['Kedalaman',`${ev.depth} km`]);
  if(ev.hotspots) extraRows.push(['Hotspot',ev.hotspots+' titik']);
  if(ev.area_ha) extraRows.push(['Luas Terbakar',ev.area_ha.toLocaleString()+' ha']);
  if(ev.tinggi) extraRows.push(['Tinggi Air',ev.tinggi]);
  if(ev.level) extraRows.push(['Level Vulkanik',ev.level]);
  if(ev.radius) extraRows.push(['Radius Bahaya',ev.radius]);
  if(ev.kolom) extraRows.push(['Kolom Abu',ev.kolom]);
  if(ev.angin) extraRows.push(['Kec. Angin',ev.angin]);
  if(ev.jalan) extraRows.push(['Jalan Terputus',ev.jalan]);
  extraRows.push(['Korban Jiwa',(ev.korban||0)+' orang']);
  extraRows.push(['Pengungsi',(ev.pengungsi||0).toLocaleString()+' orang']);
  extraRows.push(['Waktu',fmtDateTime(ev.time)]);
  extraRows.push(['Sumber Data',ev.src||'BNPB']);

  document.getElementById('modal-inner').innerHTML = `
    <button id="modal-close-btn" onclick="closeModal()" style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,0.08);border:1px solid var(--border2);color:var(--text2);width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;font-family:var(--font)">✕</button>
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
      <div style="font-size:36px">${meta.icon}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
          <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:2px;background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}44;letter-spacing:0.08em">${meta.label.toUpperCase()}</span>
          <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:2px;background:${sev.color}22;color:${sev.color};border:1px solid ${sev.color}44">${sev.label}</span>
        </div>
        <div style="font-size:15px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:3px">${ev.title}</div>
        <div style="font-size:10px;color:var(--accent2)">📍 ${ev.loc}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text);line-height:1.7;margin-bottom:14px;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:3px">${ev.desc}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">
      ${extraRows.map(([k,v])=>`
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:6px 8px">
          <div style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">${k}</div>
          <div style="font-size:11px;font-weight:600;color:var(--text);font-family:var(--font)">${v}</div>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="S.map.flyTo([${ev.lat},${ev.lng}],11,{duration:1.2});closeModal()" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:3px;cursor:pointer;font-size:10px;font-family:var(--font)">🗺 Lihat di Peta</button>
      <button onclick="closeModal()" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:3px;cursor:pointer;font-size:10px;font-family:var(--font)">✕ Tutup</button>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
};

window.closeModal = function(){
  document.getElementById('modal').classList.remove('open');
};

document.getElementById('modal').addEventListener('click',function(e){
  if(e.target===this) closeModal();
});

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════

function showToastMsg(icon,title,sub,type=''){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = `toast2${type?' t2-'+type:''}`;
  el.innerHTML=`<div class="t2-icon">${icon}</div><div class="t2-body"><div class="t2-title">${title}</div><div class="t2-sub">${sub}</div></div>`;
  el.addEventListener('click',()=>el.remove());
  wrap.appendChild(el);
  setTimeout(()=>{ el.classList.add('exit'); setTimeout(()=>el.remove(),300); },5500);
}

function toastEvent(ev){
  const meta=DISASTER_META[ev.type];
  const sev=SEV[ev.sev];
  const el = document.createElement('div');
  el.className=`toast2 t2-${ev.type}`;
  el.innerHTML=`<div class="t2-icon">${meta.icon}</div><div class="t2-body"><div class="t2-title" style="color:${sev.color}">[${sev.label}] ${ev.title}</div><div class="t2-sub">${ev.loc} · ${timeAgo(ev.time)}</div></div>`;
  el.addEventListener('click',()=>{openModal(ev.id);el.remove();});
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(()=>{ el.classList.add('exit'); setTimeout(()=>el.remove(),300); },6000);
}

// ═══════════════════════════════════════════════════════════
// TIME FILTER
// ═══════════════════════════════════════════════════════════

function initTimeFilter(){
  document.querySelectorAll('.tf-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tf-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      // Filter events by time
      const tf = btn.dataset.tf;
      const cutoffs = {'1h':60,'6h':360,'24h':1440,'7d':10080,'all':999999};
      const mins = cutoffs[tf]||10080;
      // Re-render markers for visible events
      renderAllMapMarkers();
    });
  });
}

// ═══════════════════════════════════════════════════════════
// REAL-TIME SIMULATION
// ═══════════════════════════════════════════════════════════

const NEW_EVENTS_POOL = [
  {type:'fire',sev:'tinggi',region:'kalimantan',title:'Hotspot Baru Kaltim',loc:'Samarinda, Kaltim',lat:0.50,lng:117.15,desc:'Titik api baru terdeteksi di kawasan gambut Kaltim. Tim darat menuju lokasi.',hotspots:23,area_ha:180,korban:0,pengungsi:0,src:'LAPAN FIRMS'},
  {type:'earthquake',sev:'sedang',region:'papua',title:'Gempa M5.0 Jayapura',loc:'Kota Jayapura, Papua',lat:-2.53,lng:140.72,desc:'Gempa tektonik M5.0 kedalaman 15 km. Warga berhamburan keluar gedung. Tidak ada tsunami.',magnitude:5.0,depth:15,korban:0,pengungsi:0,src:'BMKG'},
  {type:'flood',sev:'sedang',region:'sulawesi',title:'Banjir Makassar Meningkat',loc:'Makassar, Sulawesi Selatan',lat:-5.15,lng:119.41,desc:'Hujan 6 jam nonstop menyebabkan banjir di 8 kelurahan Makassar. Pompa air dioperasikan BPBD.',tinggi:'0.7m',korban:0,pengungsi:230,src:'BPBD Makassar'},
  {type:'wind',sev:'rendah',region:'ntt',title:'Angin Kencang Ende',loc:'Ende, Flores, NTT',lat:-8.84,lng:121.66,desc:'Angin 55 km/jam dan hujan lebat melanda Ende. Beberapa pohon tumbang di jalur utama.',angin:'55 km/jam',korban:0,pengungsi:0,src:'BMKG'},
  {type:'landslide',sev:'sedang',region:'sulawesi',title:'Longsor Sigi Sulteng',loc:'Sigi, Sulawesi Tengah',lat:-1.31,lng:119.97,desc:'Longsor menutup jalan penghubung Palu-Kulawi. Tim BPBD membersihkan material longsor.',korban:0,pengungsi:0,jalan:'Palu-Kulawi',src:'BPBD Sulteng'},
];

let poolIdx=0, idCounter=200;

function simulateNewEvent(){
  const tmpl = NEW_EVENTS_POOL[poolIdx%NEW_EVENTS_POOL.length];
  poolIdx++;
  const ev = {
    ...tmpl,
    id:`sim${++idCounter}`,
    time: new Date(),
    lat: tmpl.lat + (Math.random()-0.5)*0.3,
    lng: tmpl.lng + (Math.random()-0.5)*0.3,
  };
  S.events.unshift(ev);
  addEventMarker(ev);
  toastEvent(ev);
  updateChips();
  renderInsights();

  // Update new insight badge
  S.newInsightCount++;
  document.getElementById('new-insight-badge').textContent = `${S.newInsightCount} BARU`;
  document.getElementById('new-insight-badge').style.cssText += ';background:var(--accent);color:#000';
}

// ═══════════════════════════════════════════════════════════
// HEADER BUTTONS
// ═══════════════════════════════════════════════════════════

function initHeaderBtns(){
  document.getElementById('btn-fullscreen').addEventListener('click',()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

function init(){
  console.log('SIAGA MONITOR v2.1 — Initializing...');

  startClock();
  initMap();
  renderLayerPanel();
  renderAllMapMarkers();
  renderNews('bnpb');
  renderTicker2();
  renderCams('karhutla');
  renderInsights();
  updateChips();
  initNewsTabs();
  initCamTabs();
  initRegionSelect();
  initSearch();
  initTimeFilter();
  initHeaderBtns();

  // Initial toasts
  setTimeout(()=>toastEvent(S.events[0]),1500);
  setTimeout(()=>toastEvent(S.events[1]),3500);
  setTimeout(()=>toastEvent(S.events[2]),6000);

  // Live simulation
  setInterval(simulateNewEvent, 40000);
  // Refresh insights every 20s
  setInterval(renderInsights, 20000);
  // Refresh news every 35s
  setInterval(()=>{ if(!S.newsPaused) renderNews(S.activeNewsTab); }, 35000);

  console.log(`Loaded ${S.events.length} events, ${HOTSPOTS.length} hotspots, ${VOLCANOES.length} volcanoes.`);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
} else {
  init();
}
