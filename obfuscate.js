/**
 * Obfuscation Script — Cyber Paminal v3.1
 * Jalankan: node obfuscate.js
 * Output: siaga.min.js (kode terobfuskasi, tidak bisa dibaca)
 */
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const inputFile  = path.join(__dirname, 'siaga.js');
const outputFile = path.join(__dirname, 'siaga.min.js');

console.log('🔐 Memulai obfuskasi siaga.js...');
console.log('   Input :', inputFile);
console.log('   Output:', outputFile);

const sourceCode = fs.readFileSync(inputFile, 'utf8');
const originalSize = Buffer.byteLength(sourceCode, 'utf8');

const result = JavaScriptObfuscator.obfuscate(sourceCode, {
  // ── Mode high obfuscation ──
  compact: true,
  controlFlowFlattening: false,
  controlFlowFlatteningThreshold: 0.85,
  deadCodeInjection: false,
  deadCodeInjectionThreshold: 0.35,
  debugProtection: false,              // blokir debugger
  debugProtectionInterval: 2000,      // cek setiap 2 detik
  disableConsoleOutput: false,        // biarkan console warning kita
  identifierNamesGenerator: 'hexadecimal', // nama var jadi _0x1a2b
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,               // jangan rename global (leaflet, dll)
  selfDefending: false,                // self-modifying, susah diedit
  simplify: true,
  splitStrings: false,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ['base64'],       // enkripsi string dengan RC4
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersParametersMaxCount: 5,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.9,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  target: 'browser',
  seed: 0,
  // Tidak rename globals Leaflet/Globe/dll
  reservedNames: [
    '^L$', '^Globe$', '^S$', '^CFG$', '^DT$', '^SEV$',
    '^VOLCANOES$', '^quickAsk$', '^setView2D$', '^setView3D$',
    '^closeModal$', '^fetchNews$', '^fetchBMKGGempa$',
    '^ico$', '^showToast$', '^focusIncident$', '^refreshIncidents$', '^beaconIcon$',
  ],
});

const obfuscated = result.getObfuscatedCode();
const newSize = Buffer.byteLength(obfuscated, 'utf8');

fs.writeFileSync(outputFile, obfuscated, 'utf8');

console.log('\n✅ Obfuskasi selesai!');
console.log(`   Ukuran asli  : ${(originalSize/1024).toFixed(1)} KB`);
console.log(`   Ukuran baru  : ${(newSize/1024).toFixed(1)} KB`);
console.log(`   Perubahan    : +${((newSize-originalSize)/1024).toFixed(1)} KB (normal untuk obfuskasi)`);
console.log('\n📄 Update index.html: ganti siaga.js → siaga.min.js');
console.log('   Selesai! Deploy siaga.min.js bukan siaga.js\n');
