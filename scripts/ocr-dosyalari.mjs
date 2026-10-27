// Kameradaki etiket numarasını okuyan yazı tanımanın (tesseract.js) tarayıcıda
// ihtiyaç duyduğu dosyaları `public/ocr/`a kopyalar.
//
// Kütüphane bunları varsayılan olarak jsDelivr'den indiriyor; bu hem CSP'yi
// dışarıya açmayı hem de taramanın bir CDN'in ayakta olmasına bağlı kalmasını
// gerektirirdi. Dosyalar sürümleriyle birlikte node_modules'te zaten var, repoya
// ~15 MB ikili dosya koymak yerine her `dev`/`build` öncesi oradan alınıyor.

import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkg = (name) => dirname(require.resolve(`${name}/package.json`));

const hedef = join(process.cwd(), "public", "ocr");
mkdirSync(hedef, { recursive: true });

const dosyalar = [
  [pkg("tesseract.js"), "dist/worker.min.js"],
  // Yalnız LSTM motoru kullanılıyor; çekirdeğin hangisi indirileceğine
  // tarayıcının desteklediği SIMD düzeyine göre kütüphane karar veriyor.
  [pkg("tesseract.js-core"), "tesseract-core-relaxedsimd-lstm.wasm.js"],
  [pkg("tesseract.js-core"), "tesseract-core-simd-lstm.wasm.js"],
  [pkg("tesseract.js-core"), "tesseract-core-lstm.wasm.js"],
  [pkg("@tesseract.js-data/eng"), "4.0.0_best_int/eng.traineddata.gz"],
];

for (const [kok, yol] of dosyalar) {
  copyFileSync(join(kok, yol), join(hedef, yol.split("/").pop()));
}
