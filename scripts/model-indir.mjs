/**
 * Görselden ürün bulmanın kullandığı tanıma modelini `public/models/` altına
 * indirir.
 *
 * Model uygulamayla birlikte kendi sunucumuzdan dağıtılıyor, çalışma anında
 * Google'ın adresinden değil. İki sebebi var: güvenlik başlıklarımız
 * (`proxy.ts` içindeki `connect-src 'self'`) dışarıdan dosya çekilmesine izin
 * vermiyor, ve satıcının ürün araması Google'ın bir dosya sunucusunun ayakta
 * olmasına bağlı kalmamalı.
 *
 * Kaynaktaki model 55 parçaya bölünmüş; burada hepsi sırayla tek bir
 * `weights.bin` dosyasında birleştiriliyor ve `model.json` ona işaret edecek
 * şekilde yeniden yazılıyor. Tarayıcı 55 istek yerine bir istek yapıyor.
 *
 * Çıktı depoya dahil, yani normalde bu betiği çalıştırmak gerekmiyor. Model
 * sürümü değişecekse `ALPHA`'yı değiştirip yeniden çalıştırın ve
 * `src/lib/recognizer.ts` içindeki `MODEL` etiketini de güncelleyin — etiket
 * değişince eski parmak izleri kendiliğinden geçersiz olur.
 *
 *   node scripts/model-indir.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * MobileNet v1, 224x224 girdi, genişlik çarpanı 0,75.
 *
 * 1,0 daha iyi tanır ama 16 MB; 0,50 5 MB'a iniyor ama birbirine benzeyen
 * ürünlerde ayrım gücünü kaybediyor. 0,75 (~10 MB) depoda telefonuyla çalışan
 * satıcı için makul olan yer.
 */
const ALPHA = "0.75";
const BASE = `https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_${ALPHA}_224/`;
const OUT = join(process.cwd(), "public", "models", "mobilenet");

async function get(path) {
  const response = await fetch(BASE + path);
  if (!response.ok) {
    throw new Error(`${path} indirilemedi: ${response.status}`);
  }
  return response;
}

const manifest = await (await get("model.json")).json();

const parts = [];
/** Birleşik dosyada ağırlıkların sırası, parçaların sırasıyla aynı olmalı. */
const weights = [];

for (const group of manifest.weightsManifest) {
  for (const path of group.paths) {
    const buffer = await (await get(path)).arrayBuffer();
    parts.push(Buffer.from(buffer));
    process.stdout.write(`\r${parts.length} parça indirildi`);
  }
  weights.push(...group.weights);
}

const bin = Buffer.concat(parts);
manifest.weightsManifest = [{ paths: ["weights.bin"], weights }];

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "weights.bin"), bin);
await writeFile(join(OUT, "model.json"), JSON.stringify(manifest));

console.log(
  `\nmobilenet_v1_${ALPHA}_224 hazır: ${(bin.length / 1024 / 1024).toFixed(1)} MB → public/models/mobilenet/`
);
