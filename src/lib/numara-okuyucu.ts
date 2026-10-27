import { BARCODE_PATTERN } from "@/lib/barkod";

/**
 * Etiketteki numaranın yazısını okur: tesseract.js'in WebAssembly motoru.
 * Motor ve dil verisi ~7 MB olduğu için kendi sunucumuzdan (`public/ocr/`,
 * bkz. `scripts/ocr-dosyalari.mjs`) ve ancak gerektiğinde iniyor; tarayıcı
 * bir kez indirdikten sonra önbellekten açıyor.
 */

const WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._/-";

export type TextReader = {
  /** Görseldeki numara olabilecek sözcükler, okunuş sırasıyla. */
  read: (image: HTMLCanvasElement) => Promise<string[]>;
  terminate: () => Promise<void>;
};

/**
 * Yazı okuyucuyu hazırlar. İlk çağrıda dosyalar iniyor, birkaç saniye sürebilir.
 *
 * Yollar mutlak veriliyor: worker kendi adresine göre çözerdi.
 */
export async function createTextReader(): Promise<TextReader> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const base = new URL("/ocr/", window.location.origin).href;

  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base.replace(/\/$/, ""),
    // Blob worker sayfanın CSP'sini devralıyor ve orada WebAssembly'ye izin
    // yok; worker doğrudan kendi adresinden açılınca bu sorun yok.
    workerBlobURL: false,
  });
  await worker.setParameters({
    tessedit_char_whitelist: WHITELIST,
    // Etikette ad, numara, belki başka yazılar: dağınık metin modu, tek
    // satır ya da tek blok varsaymıyor.
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });

  return {
    async read(image) {
      const { data } = await worker.recognize(image);
      return numberCandidates(data.text);
    },
    terminate: () => worker.terminate().then(() => undefined),
  };
}

/**
 * Okunan metinden numara olabilecek sözcükleri ayıklar. Üç karakterden kısa
 * olanlar atılıyor: gürültüden çıkan tek tük harflerle etiketteki numara
 * karışmasın.
 */
function numberCandidates(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.replace(/^[._/-]+|[._/-]+$/g, ""))
    .filter((word) => word.length >= 3 && BARCODE_PATTERN.test(word));
}
