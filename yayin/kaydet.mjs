// Üzerinde çalışılan işin künyesini yazar.
//
// Panel her işi kendi dalında görür ve künyeyi dalın adından bulur:
// `is/qr-kodu` dalı için `yayin/kayitlar/qr-kodu.json`. Bu yüzden betik dosya
// adını uydurmuyor, açık olan dalın adından türetiyor — ikisinin birbirini
// tutması başka türlü garanti edilemez.
//
// Her iş kendi dosyasını ekler. Ortak tek bir listede toplansalardı iki dal aynı
// dosyaya satır ekleyeceği için her birleştirme çakışırdı.
//
// Kullanım (önce `git checkout -b is/<slug> origin/main`):
//   npm run kaydet -- --tip hata \
//     --baslik "Rezervasyon silinince takvimde günler dolu kalıyordu" \
//     --aciklama "Bir rezervasyonu sildiğinde o günler hâlâ doluymuş gibi görünüyordu. Artık siler silmez boşalıyor." \
//     [--dikkat "Canlıya almadan önce 0021 numaralı migration'ı çalıştır"]

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIPLER = ['ozellik', 'hata', 'guvenlik', 'iyilestirme'];
const ONEK = 'is/';

const buraya = dirname(fileURLToPath(import.meta.url));
const repoKok = join(buraya, '..');

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

const { tip, baslik, aciklama, dikkat } = args();

if (!TIPLER.includes(tip)) dur(`--tip şunlardan biri olmalı: ${TIPLER.join(', ')}`);
if (!baslik) dur('--baslik zorunlu.');
if (!aciklama) dur('--aciklama zorunlu.');

let dal;
try {
  dal = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: repoKok,
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
} catch {
  dur('Git dalı okunamadı.');
}

if (!dal.startsWith(ONEK)) {
  dur(
    `Açık dal "${dal}". Her iş kendi dalında durmalı — önce şunu yap:\n` +
      `  git checkout -b ${ONEK}<kisa-ad> origin/main`,
  );
}

const slug = dal.slice(ONEK.length);
const dosya = join(repoKok, 'yayin', 'kayitlar', `${slug}.json`);

mkdirSync(dirname(dosya), { recursive: true });
writeFileSync(
  dosya,
  JSON.stringify({ tip, baslik, aciklama, dikkat: dikkat || null }, null, 2) + '\n',
  'utf8',
);

console.log(`\nKünye yazıldı: yayin/kayitlar/${slug}.json`);
console.log(`Bu dosyayı işin commit'ine dahil et, sonra:\n`);
console.log(`  git push -u origin ${dal}\n`);
