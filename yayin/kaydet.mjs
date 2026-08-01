// Bir değişikliği yayın paneline hazırlar.
//
// Claude her işi bitirdiğinde, commit'i ATMADAN ÖNCE bunu çalıştırır: kayıt
// dosyası güncellenir ve commit mesajına eklenmesi gereken etiket satırı
// yazdırılır. Kayıt, anlattığı commit'in içinde gider; panel ikisini o etiket
// üzerinden eşleştirir.
//
// Commit mesajları teknik ve İngilizce kalır; paneldeki başlık ve açıklama ise
// diff okumamış birine yazılır. İkisi ayrı işler, o yüzden ayrı yerlerde.
//
// Kullanım:
//   npm run kaydet -- --tip hata \
//     --baslik "Rezervasyon silinince takvimde günler dolu kalıyordu" \
//     --aciklama "Bir rezervasyonu sildiğinde o günler hâlâ doluymuş gibi görünüyordu. Artık siler silmez boşalıyor." \
//     [--dikkat "Göndermeden önce 0021 numaralı migration'ı çalıştır"]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIPLER = ['ozellik', 'hata', 'guvenlik', 'iyilestirme'];

const buraya = dirname(fileURLToPath(import.meta.url));
const kayitDosyasi = join(buraya, 'kayitlar.json');

function args() {
  const cikti = {};
  const girdi = process.argv.slice(2);
  for (let i = 0; i < girdi.length; i++) {
    if (!girdi[i].startsWith('--')) continue;
    cikti[girdi[i].slice(2)] = girdi[i + 1];
    i++;
  }
  return cikti;
}

function dur(mesaj) {
  console.error('Hata: ' + mesaj);
  process.exit(1);
}

/** Başlıktan okunabilir bir kimlik. Türkçe harfler ASCII'ye iner. */
function kimlik(baslik) {
  const harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' };
  const slug = baslik
    .toLowerCase()
    .replace(/[çğıöşüİ]/g, (h) => harita[h] ?? h)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const gun = new Date().toISOString().slice(0, 10);
  return `${gun}-${slug}`;
}

const { tip, baslik, aciklama, dikkat } = args();

if (!TIPLER.includes(tip)) dur(`--tip şunlardan biri olmalı: ${TIPLER.join(', ')}`);
if (!baslik) dur('--baslik zorunlu.');
if (!aciklama) dur('--aciklama zorunlu.');

const veri = existsSync(kayitDosyasi)
  ? JSON.parse(readFileSync(kayitDosyasi, 'utf8'))
  : { kayitlar: [] };
if (!Array.isArray(veri.kayitlar)) veri.kayitlar = [];

let id = kimlik(baslik);
// Aynı gün aynı başlık iki kez geçerse kimlikler çakışmasın.
if (veri.kayitlar.some((k) => k.id === id)) {
  let n = 2;
  while (veri.kayitlar.some((k) => k.id === `${id}-${n}`)) n++;
  id = `${id}-${n}`;
}

veri.kayitlar.push({
  id,
  tip,
  baslik,
  aciklama,
  dikkat: dikkat || null,
});

mkdirSync(dirname(kayitDosyasi), { recursive: true });
writeFileSync(kayitDosyasi, JSON.stringify(veri, null, 2) + '\n', 'utf8');

console.log(`\nKayıt eklendi: ${baslik}`);
console.log('\nBu satırı commit mesajının sonuna ekle:\n');
console.log(`  Panel-Kaydi: ${id}\n`);
