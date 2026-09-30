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
export const MODEL_TAG = "mobilenet_v1_0.75_224+detay";

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
  /**
   * Fotoğrafın parçalarının gömüleri (bkz. `DETAY_KIRPIMLARI`): ortası, daha
   * dar ortası ve dört çeyreği. Ürünü diğerlerinden ayıran desen, logo, düğme
   * gibi detaylar fotoğrafın tamamında kayboluyor, parçada öne çıkıyor.
   */
  details: string[];
};

/**
 * Katalog fotoğrafından çıkarılan detay parçaları: [x, y, boy], fotoğrafın
 * kısa kenarına oranla. Ürün fotoğrafları çoğunlukla ürünü ortada gösteriyor;
 * parçalar o yüzden merkezin çevresinde.
 */
export const DETAY_KIRPIMLARI: [number, number, number][] = [
  [0.2, 0.2, 0.6],
  [0.325, 0.325, 0.35],
  [0.1, 0.1, 0.45],
  [0.45, 0.1, 0.45],
  [0.1, 0.45, 0.45],
  [0.45, 0.45, 0.45],
];

export function isImageSignature(value: unknown): value is ImageSignature {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ImageSignature>;

  return (
    typeof candidate.url === "string" &&
    candidate.model === MODEL_TAG &&
    typeof candidate.embedding === "string" &&
    candidate.embedding.length > 0 &&
    Array.isArray(candidate.details) &&
    candidate.details.every((detail) => typeof detail === "string")
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

// ---------------------------------------------------------------------------
// Ayırt edici eşleştirme
// ---------------------------------------------------------------------------
//
// Ham gömülerde bütün ürünler birbirine benziyor: model "bir kumaş, bir
// nesne, düz arka plan" gibi ortak özellikleri de sayıyor ve alakasız iki
// fotoğraf bile 0,65 civarında buluşuyor. Sonuç, kameranın her kareye dört
// beş ürünü birden "olabilir" demesiydi.
//
// Buradaki eşleştirici iki şey yapıyor:
//
// 1. **Kataloğa göre sadeleştirme.** Bütün katalogdaki gömülerin ortalaması
//    çıkarılıyor ve her özellik kataloğun kendi dağılımına göre ölçekleniyor.
//    Geriye kalan, bir ürünü *bu satıcının diğer ürünlerinden* ayıran kısım;
//    ürünlerin ortak olduğu her şey (renk tonu, zemin, ışık) sönüyor.
// 2. **Ayırt edici detay.** Her ürünün fotoğraf parçaları arasından diğer
//    ürünlerin hiçbir parçasına benzemeyenler seçilip o ürünün imzası olarak
//    tutuluyor. Kamera o detayı gördüğünde ürün diğerlerinden açık ara
//    ayrışıyor.
//
// Karar eşiği de sabit bir sayı değil, katalogdan ölçülüyor: iki *farklı*
// ürünün birbirine en fazla ne kadar benzediği. Kamera karesi bir ürüne
// bundan daha yakınsa, o ürünü görüyordur.

/** Katalogdaki bir ürünün eşleştirmede kullanılan gömüleri. */
export type UrunGomuleri<T> = {
  urun: T;
  /** Fotoğrafların tamamının gömüleri. */
  genel: Float32Array[];
  /** Fotoğraf parçalarının gömüleri. */
  detaylar: Float32Array[];
};

export type Eslestirici<T> = {
  urunler: { urun: T; vektorler: Float32Array[] }[];
  /** Sadeleştirme; katalog küçükse gömüye dokunmuyor. */
  donustur: (vektor: Float32Array) => Float32Array;
  /** Kameranın bir ürünü "görüyor" sayılması için gereken benzerlik. */
  esik: number;
  /** Birincinin ikinciyi geçmesi gereken en küçük fark. */
  fark: number;
  /**
   * Farkın birincinin puanına oranla en az ne olması gerektiği. Sadeleştirilmiş
   * puanların ölçeği katalogdan kataloğa değişiyor; "ikinciden üçte bir önde"
   * her ölçekte aynı şeyi söylüyor.
   */
  oran: number;
};

/** Sadeleştirmenin anlamlı olması için gereken en az ürün. */
const MIN_URUN_SADELESTIRME = 3;
/** Ürün başına tutulan ayırt edici detay sayısı. */
const DETAY_SAYISI = 2;

function birim(vektor: Float32Array): Float32Array {
  let toplam = 0;
  for (let i = 0; i < vektor.length; i++) toplam += vektor[i] * vektor[i];
  const uzunluk = Math.sqrt(toplam) || 1;
  const sonuc = new Float32Array(vektor.length);
  for (let i = 0; i < vektor.length; i++) sonuc[i] = vektor[i] / uzunluk;
  return sonuc;
}

function yuzdelik(degerler: number[], oran: number): number {
  if (!degerler.length) return 0;
  const sirali = [...degerler].sort((a, b) => a - b);
  return sirali[Math.min(sirali.length - 1, Math.floor(oran * sirali.length))];
}

function enYuksek(a: Float32Array[], b: Float32Array[]): number {
  let enIyi = -1;
  for (const x of a) for (const y of b) enIyi = Math.max(enIyi, cosine(x, y));
  return enIyi;
}

export function eslestiriciKur<T>(katalog: UrunGomuleri<T>[]): Eslestirici<T> {
  const hepsi = katalog.flatMap((u) => [...u.genel, ...u.detaylar]);
  const boyut = hepsi[0]?.length ?? 0;

  // Küçük katalogda ortalama tek bir ürüne çok yakın düşer ve sadeleştirme
  // o ürünün kendisini silerdi; orada ham gömüler ve sabit eşikler.
  if (katalog.length < MIN_URUN_SADELESTIRME || !boyut) {
    return {
      urunler: katalog.map((u) => ({ urun: u.urun, vektorler: [...u.genel, ...u.detaylar] })),
      donustur: (vektor) => vektor,
      esik: katalog.length === 1 ? 0.82 : 0.72,
      fark: 0.03,
      oran: 0,
    };
  }

  const ortalama = new Float32Array(boyut);
  for (const v of hepsi) for (let i = 0; i < boyut; i++) ortalama[i] += v[i] / hepsi.length;

  const sapma = new Float32Array(boyut);
  for (const v of hepsi) {
    for (let i = 0; i < boyut; i++) sapma[i] += (v[i] - ortalama[i]) ** 2 / hepsi.length;
  }

  // Hiç değişmeyen bir özellik bölmeyi patlatmasın, çok az değişen de
  // gürültüyü büyütmesin: alt sınır ortalama sapmanın dörtte biri.
  let ortalamaSapma = 0;
  for (let i = 0; i < boyut; i++) {
    sapma[i] = Math.sqrt(sapma[i]);
    ortalamaSapma += sapma[i] / boyut;
  }
  const taban = Math.max(ortalamaSapma * 0.25, 1e-6);

  const donustur = (vektor: Float32Array) => {
    const sonuc = new Float32Array(boyut);
    for (let i = 0; i < boyut; i++) {
      sonuc[i] = (vektor[i] - ortalama[i]) / Math.max(sapma[i], taban);
    }
    return birim(sonuc);
  };

  const donmus = katalog.map((u) => ({
    urun: u.urun,
    genel: u.genel.map(donustur),
    detaylar: u.detaylar.map(donustur),
  }));

  // Her detayın başka bir ürüne en fazla ne kadar benzediği; en az benzeyen
  // detaylar ürünün imzası oluyor. Karşılaştırma diğer ürünlerin her
  // parçasıyla değil özetiyle (bütün gömülerinin ortalaması): yüz ürünlük bir
  // katalogda parça parça karşılaştırmak açılışı saniyelerce kilitlerdi.
  const ozetler = donmus.map((u) => {
    const toplam = new Float32Array(boyut);
    for (const v of [...u.genel, ...u.detaylar]) for (let i = 0; i < boyut; i++) toplam[i] += v[i];
    return birim(toplam);
  });
  const digerleri = ozetler.map((_, sira) => ozetler.filter((__, j) => j !== sira));

  const urunler = donmus.map((u, sira) => {
    const imza = u.detaylar
      .map((vektor) => ({ vektor, benzerlik: enYuksek([vektor], digerleri[sira]) }))
      .sort((a, b) => a.benzerlik - b.benzerlik)
      .slice(0, DETAY_SAYISI)
      .map((detay) => detay.vektor);

    return { urun: u.urun, vektorler: [...u.genel, ...imza] };
  });

  // Eşik: iki farklı ürünün kullanılan vektörleri arasındaki benzerliğin
  // üst ucu. Kamera bundan yakınsa "iki farklı ürün kadar benzer" değil,
  // aynı ürün demektir.
  const capraz: number[] = [];
  for (let i = 0; i < urunler.length; i++) {
    for (let j = i + 1; j < urunler.length; j++) {
      capraz.push(enYuksek(urunler[i].vektorler, urunler[j].vektorler));
    }
  }

  return {
    urunler,
    donustur,
    esik: Math.max(0.1, yuzdelik(capraz, 0.95) + 0.03),
    fark: 0.04,
    oran: 0.3,
  };
}

export type Puan<T> = { urun: T; puan: number };

/** Kamera karesinin (birkaç kırpımının) her ürüne benzerliği, büyükten küçüğe. */
export function puanla<T>(eslestirici: Eslestirici<T>, sorgular: Float32Array[]): Puan<T>[] {
  const donmus = sorgular.map(eslestirici.donustur);

  return eslestirici.urunler
    .map(({ urun, vektorler }) => ({ urun, puan: enYuksek(donmus, vektorler) }))
    .sort((a, b) => b.puan - a.puan);
}

/**
 * Tepedeki ürün kesin mi: eşiği geçti mi ve ikinciden açık ara önde mi.
 * Emin değilse null — tahmin yürütülmüyor.
 */
export function kesinEslesme<T>(eslestirici: Eslestirici<T>, puanlar: Puan<T>[]): T | null {
  const [birinci, ikinci] = puanlar;
  if (!birinci || birinci.puan < eslestirici.esik) return null;
  const gereken = Math.max(eslestirici.fark, birinci.puan * eslestirici.oran);
  if (ikinci && birinci.puan - ikinci.puan < gereken) return null;
  return birinci.urun;
}
