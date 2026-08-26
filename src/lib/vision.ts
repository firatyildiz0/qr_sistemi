/**
 * Görselden ürün tanıma: bir fotoğrafın, karşılaştırılabilir bir sayı dizisine
 * ("gömü") indirgenmiş hâli ve iki gömünün karşılaştırılması.
 *
 * Gömüyü üreten model tarayıcıda çalışıyor (bkz. `recognizer.ts`). Bu dosya
 * modelden bağımsız: gömünün nasıl saklandığı, nasıl geri okunduğu ve iki
 * gömünün ne kadar benzediği burada.
 *
 * Sayılar veritabanına ondalık listesi olarak değil, kayan noktadan tam sayıya
 * indirilip base64 metin olarak yazılıyor. Bir gömü 768 sayı; ondalık liste
 * hâlinde her ürün için 10 KB'ın üstüne çıkıyor ve yüz ürünlük bir katalogda
 * tarayıcının açılışında megabaytlarca veri inerdi. Tam sayıya indirmek
 * benzerlik hesabını kayda değer ölçüde bozmuyor, boyutu ise onda birine
 * düşürüyor.
 */

/**
 * Gömüyü hangi modelin ürettiği. Model değiştiğinde bu etiket de değişir ve
 * eski parmak izleri kendiliğinden geçersiz sayılıp yeniden hesaplanır —
 * iki farklı modelin gömüsünü karşılaştırmanın hiçbir anlamı yok.
 */
export const MODEL_TAG = "mobilenet_v1_0.75_224";

export type ImageSignature = {
  /**
   * İmzanın üretildiği görsel. Satıcı ürünün fotoğrafını değiştirdiğinde URL
   * de değişir; imza o zaman kendiliğinden geçersiz sayılıp yeniden hesaplanır
   * — ayrıca bir "imzayı temizle" adımına gerek kalmaz.
   */
  url: string;
  /** Gömüyü üreten model; `MODEL_TAG` ile uyuşmayan imza kullanılmıyor. */
  model: string;
  /** Tam sayıya indirilmiş gömü, base64. */
  embedding: string;
};

export function isImageSignature(value: unknown): value is ImageSignature {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ImageSignature>;

  return (
    typeof candidate.url === "string" &&
    candidate.model === MODEL_TAG &&
    typeof candidate.embedding === "string" &&
    candidate.embedding.length > 0
  );
}

/**
 * Birim uzunluğa getirilmiş gömüyü saklanabilir metne çevirir.
 *
 * Değerler -1 ile 1 arasında olduğu için 127 ile çarpılıp tek bayta sığıyor.
 * Kayıp, benzerlik hesabında binde birler mertebesinde kalıyor.
 */
export function encodeEmbedding(embedding: Float32Array): string {
  const bytes = new Uint8Array(embedding.length);

  for (let i = 0; i < embedding.length; i++) {
    const scaled = Math.round(embedding[i] * 127);
    // Int8 aralığına sıkıştırma: -128 kullanılmıyor ki simetri bozulmasın.
    bytes[i] = Math.max(-127, Math.min(127, scaled)) & 0xff;
  }

  let binary = "";
  // `String.fromCharCode(...bytes)` tek seferde çağrılırsa 768 elemanlı dizi
  // yığını taşırabiliyor; parça parça birleştiriliyor.
  for (let i = 0; i < bytes.length; i += 1024) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 1024));
  }
  return btoa(binary);
}

export function decodeEmbedding(encoded: string): Float32Array | null {
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    return null;
  }

  const values = new Float32Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    const byte = binary.charCodeAt(i);
    // Baytı işaretli sayı olarak geri oku.
    values[i] = (byte > 127 ? byte - 256 : byte) / 127;
  }
  return values;
}

/**
 * İki birim gömünün kosinüs benzerliği: 1 "aynı" demek.
 *
 * Ölçek beklenenden dar: modelin son katmanı negatif değer üretmediği için
 * birbiriyle hiç alakası olmayan iki fotoğraf bile 0,65 civarında buluşuyor,
 * aynı ürünün iki fotoğrafı 0,85'e çıkıyor. Yani "0,7 yüksek bir puan mı"
 * sorusunun tek başına anlamı yok; kararı veren yerde (`ImageScanner`)
 * puanlar birbirleriyle karşılaştırılıyor, sabit bir çizgiyle değil.
 */
export function cosine(a: Float32Array, b: Float32Array): number {
  const count = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < count; i++) total += a[i] * b[i];
  return total;
}
