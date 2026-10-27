import { BARCODE_PATTERN } from "@/lib/barkod";

/**
 * Etiketteki numaranın iki okuyucusu: çizgi (Code 128) ve yazı.
 *
 * Çizgi yeni basılan etiketlerde var ve okunuşu QR kadar hızlı, kesin. Yazı
 * okuma, çizgisi olmayan eski etiketler için: tesseract.js'in WebAssembly
 * motoru. Motor ve dil verisi ~7 MB olduğu için kendi sunucumuzdan
 * (`public/ocr/`, bkz. `scripts/ocr-dosyalari.mjs`) ve ancak gerektiğinde
 * iniyor; tarayıcı bir kez indirdikten sonra önbellekten açıyor.
 */

type Decode = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => string | null;

/**
 * Çizgiyi zxing ile okur; tarayıcının kendi `BarcodeDetector`ı Code 128'i
 * tanımıyorsa (iOS Safari, Windows'taki Chrome) devreye giren yedek.
 */
export async function createCode128Decoder(): Promise<Decode> {
  const { BinaryBitmap, Code128Reader, HybridBinarizer, RGBLuminanceSource } = await import(
    "@zxing/library"
  );
  const reader = new Code128Reader();

  return (canvas, ctx) => {
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // zxing tek kanallı parlaklık istiyor; Uint8ClampedArray'i öyle kabul ediyor.
    const luminance = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < luminance.length; i++, p += 4) {
      luminance[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    }
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminance, width, height))
    );
    try {
      return reader.decode(bitmap, new Map()).getText();
    } catch {
      // Karede çizgi yok: zxing bunu istisnayla söylüyor.
      return null;
    }
  };
}

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
