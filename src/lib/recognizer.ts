/**
 * Tarayıcıda çalışan görüntü tanıma modeli.
 *
 * Bir fotoğrafı ya da kamera karesini 768 sayıdan oluşan bir "gömü"ye
 * çeviriyor. Aynı nesnenin farklı ışıkta, farklı açıdan, farklı arka planda
 * çekilmiş iki fotoğrafı birbirine yakın gömüler veriyor; farklı nesneler
 * uzak. Ürünü tanıyan şey bu yakınlık (bkz. `vision.ts`).
 *
 * Model kendi sunucumuzdan geliyor (`public/models/mobilenet`, bkz.
 * `scripts/model-indir.mjs`) — dışarıya bağımlılık yok, güvenlik başlıklarımız
 * da zaten dışarıdan dosya çekilmesine izin vermiyor. Yaklaşık 10 MB; ilk
 * kullanımda inip tarayıcı önbelleğinde kalıyor.
 *
 * Her şey tembel yükleniyor: bu dosyayı içe aktarmak modeli indirmiyor,
 * `loadRecognizer()` çağrılana kadar ne kütüphane ne ağırlıklar geliyor. Panel
 * açan ama kamerayı hiç kullanmayan satıcı tek bayt ödemiyor.
 */

import type { LayersModel } from "@tensorflow/tfjs-layers";
import type * as TF from "@tensorflow/tfjs-core";

/** Modelin beklediği girdi boyu. */
const INPUT = 224;
/**
 * Sınıflandırma başlığından hemen önceki katman. Modelin "bu bir kedi" cevabı
 * değil, o cevaba varırken çıkardığı görsel özellikler aranıyor: ürünlerimiz
 * modelin tanıdığı sınıflardan hiçbiri değil, ama özellikleri yine de aynı
 * ürünün iki fotoğrafını birbirine yaklaştırıyor.
 */
const EMBEDDING_LAYER = "global_average_pooling2d_1";
const MODEL_URL = "/models/mobilenet/model.json";

type Recognizer = {
  /** Verilen kaynağın birim uzunluğa getirilmiş gömüsü. */
  embed: (source: CanvasImageSource) => Float32Array;
};

let pending: Promise<Recognizer> | null = null;

/**
 * Modeli (bir kez) yükler.
 *
 * Aynı anda birden çok çağrı gelse bile tek indirme yapılıyor: söz nesnesi
 * saklanıyor, ikinci çağrı aynı sözü bekliyor. Yükleme başarısız olursa söz
 * temizleniyor ki "tekrar dene" gerçekten yeniden denesin.
 */
export function loadRecognizer(): Promise<Recognizer> {
  pending ??= build().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function build(): Promise<Recognizer> {
  const [tf, layers] = await Promise.all([
    import("@tensorflow/tfjs-core"),
    import("@tensorflow/tfjs-layers"),
    import("@tensorflow/tfjs-backend-webgl"),
    import("@tensorflow/tfjs-backend-cpu"),
  ]);

  // WebGL ekran kartını kullanıyor ve bir kareyi milisaniyelerle ölçülen
  // sürede işliyor; olmadığı yerde işlemci yedeği devrede — yavaş ama çalışır.
  if (!(await tf.setBackend("webgl"))) await tf.setBackend("cpu");
  await tf.ready();

  const full: LayersModel = await layers.loadLayersModel(MODEL_URL);
  const truncated = layers.model({
    inputs: full.inputs,
    outputs: full.getLayer(EMBEDDING_LAYER).output,
  });

  // İlk çağrı, gölgelendiricilerin derlenmesi yüzünden sonrakilerden kat kat
  // yavaş. Boş bir kareyle şimdi ödeniyor ki satıcı kamerayı açtığında ilk
  // ölçüm takılmasın.
  tf.tidy(() => truncated.predict(tf.zeros([1, INPUT, INPUT, 3])));

  return {
    embed: (source) => embed(tf, truncated, source),
  };
}

function embed(
  tf: typeof TF,
  model: LayersModel,
  source: CanvasImageSource
): Float32Array {
  // Zincirlenebilir kısayollar (`tensor.div(...)`) yalnızca tfjs'in tam
  // paketinde kayıtlı; burada çekirdek kullanıldığı için işlemler doğrudan
  // çağrılıyor.
  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(source as HTMLCanvasElement);
    const resized = tf.image.resizeBilinear(pixels, [INPUT, INPUT]);
    // MobileNet v1 girdiyi -1..1 aralığında bekliyor.
    const scaled = tf.div(tf.sub(tf.cast(resized, "float32"), 127.5), 127.5);

    const output = model.predict(tf.expandDims(scaled, 0)) as TF.Tensor;
    // Birim uzunluk: karşılaştırma kosinüs benzerliğiyle yapılıyor, uzunluk
    // bilgisinin orada bir karşılığı yok. Sıfır bölmesi, tamamen boş bir
    // karede (kapalı kamera, kapak) gerçekten olabiliyor.
    const unit = tf.div(output, tf.maximum(tf.norm(output), tf.scalar(1e-6)));

    return unit.dataSync() as Float32Array;
  });
}
