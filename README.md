<div align="center">
  <img src="eagle.png" alt="Cyber Paminal Logo" width="120" />
  <h1>Cyber Paminal Monitoring Karhutla</h1>
  <p><strong>Dashboard Monitoring Bencana Alam Indonesia Secara Real-time v3.1</strong></p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen" alt="Status" />
  <img src="https://img.shields.io/badge/Version-3.1-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Platform-Web-orange" alt="Platform" />
  <img src="https://img.shields.io/badge/Data-Realtime-red" alt="Realtime Data" />
</p>

## 📋 Deskripsi
**Cyber Paminal Monitoring Karhutla** adalah sebuah dashboard taktis berbasis web (Tactical Ops-Center) untuk memantau, menganalisis, dan melaporkan bencana alam di seluruh wilayah Indonesia secara seketika (real-time). 

Aplikasi ini menyatukan berbagai sumber data terbuka dari lembaga resmi untuk menampilkan peta sebaran bencana seperti **Kebakaran Hutan dan Lahan (Karhutla)**, **Gempa Bumi**, dan **Erupsi Gunung Api**. Dilengkapi dengan integrasi berita online dan asisten AI pintar dari **Google Gemini** untuk membantu menganalisis tingkat ancaman bencana.

## 🚀 Fitur Utama
- 🌍 **2D & 3D Globe Mode:** Toggle antara peta interaktif 2D klasik dan bola dunia 3D (didukung oleh Globe.gl).
- 🔥 **Hotspot Karhutla NASA:** Pemantauan titik panas (hotspot) beresiko tinggi secara real-time dari data NASA FIRMS. Titik api yang sudah padam tidak akan dimunculkan.
- 🌋 **Live Erupsi MAGMA (PVMBG):** Status aktivitas 60+ gunung api di Indonesia dan notifikasi letusan terbaru.
- 🌋 **Gempa Terkini (BMKG):** Pembaruan gempa bumi paralel dari endpoint auto-gempa BMKG.
- 📰 **Berita Mediaanalis (Live News):** Agregasi berita tentang bencana secara real-time menggunakan sistem sentimen.
- 🤖 **AI Gemini Assistant:** Ringkasan otomatis, analisis risiko lokasi, rekomendasi evakuasi dan laporan dari kejadian alam.
- 📺 **Live TV News Stream:** Akses langsung ke streaming stasiun TV berita nasional (Kompas TV, tvOne, iNews, CNN ID).
- 🛡️ **Proteksi Lapis Baja:** Kode dikunci (obfuscated), menolak fitur inspect element, view source embedding (anti-iframe), meminimalisir pencurian source code.

## 📡 Sumber Data (API)
- **NASA FIRMS** — Hotspot (MODIS / VIIRS)
- **BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)** — Auto gempa
- **MAGMA Indonesia (PVMBG / ESDM)** — Tingkat aktivitas & Informasi Letusan
- **Mediaanalis API** — Berita Nasional / Bencana
- **Google Gemini (API)** — AI Natural Language Insights

## 📂 Struktur Repositori
Hanya file berikut yang diperlukan untuk dideploy ke dalam server (Netlify/Vercel/GitHub Pages):
```text
/
├── index.html       # Struktur dasar dashboard dan UI
├── cyber.css        # File gaya kustom (tema Cyber Paminal)
├── siaga.min.js     # Logika utama (Terobfuskasi & Aman)
├── volcano.js       # Modul integrasi ke MAGMA PVMBG
└── eagle.png        # Aset visual
```
> **Peringatan**: Kode asli (seperti `siaga.js` atau `obfuscate.js`) disimpan secara terpisah dalam direktori lokal (development) dan tidak boleh dipublikasikan untuk menjaga keamanan aplikasi.

## 💻 Panduan Instalasi & Deploy
Aplikasi ini berjalan **sepenuhnya di frontend** (Client-side), sehingga tidak memerlukan backend (Node.js/PHP).

1. **Unduh repositori ini** (Clone atau Download ZIP).
2. Buka folder proyek.
3. Jalankan file `index.html` menggunakan Live Server atau cukup double klik.
4. **Deploy ke Netlify/Vercel:** Cukup drag & drop folder yang berisi kelima file di atas ke panel deploy platform pilihan Anda.

## 🔧 Keamanan Kode
Aplikasi ini menerapkan perlindungan obfuskasi RC4 tingkat tinggi (`siaga.min.js`), mencegah aksi copy-paste dengan memblokir klik kanan, pintasan keyboard seperti `F12`, `Ctrl+U`, `Ctrl+Shift+I/J`, serta memberikan notifikasi overlay bila DevTools dibuka paksa.

---
<div align="center">
  <p>© 2026 Cyber Paminal Monitoring Karhutla. All rights reserved.</p>
</div>
