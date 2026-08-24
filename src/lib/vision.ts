/**
 * Görselden ürün tanıma: bir fotoğrafı, karşılaştırılabilir küçük bir sayı
 * dizisine indirgeyen kod.
 *
 * Buradaki iş bilerek bir yapay zekâ modeline verilmiyor. Satıcının kataloğu
 * birkaç yüz üründen oluşuyor ve aranan şey "bu nesne ne" değil, "bu nesne
 * kataloğumdaki hangi fotoğraf" — kapalı ve küçük bir küme. Onu çözmek için
 * indirilecek onlarca megabaytlık bir model, mağazanın deposunda telefonla
 * çalışan satıcı için özelliğin kendisinden daha pahalı olurdu. Bunun yerine
 * her fotoğraftan iki parmak izi çıkarılıyor:
 *
 *   - `hash`: komşu piksellerin birbirinden koyu mu açık mı olduğunu tutan
 *     8x8'lik fark karması. Nesnenin biçimini taşır ve pozlamadan bağımsızdır.
 *   - `colors`: 4x4 ızgaranın ortalama rengi. Biçimi aynı ama rengi farklı iki
 *     ürünü (aynı sandalyenin kırmızısı ve mavisi) karmanın ayıramadığı yerde
 *     ayırır.
 *
 * Renk, kareye düşen ortalama parlaklığa bölünerek saklanıyor: deponun loş
 * ışığında çekilen kare, stüdyoda çekilmiş katalog fotoğrafıyla yine de
 * eşleşsin diye. Mutlak değerler saklansaydı ışık her şeyi bozardı.
 */

/** Karşılaştırmadan önce her görselin indirgendiği kare boy. */
const BASE = 64;
/** Fark karması 9 sütun okuyup 8 fark üretir: 8x8 = 64 bit. */
const HASH_W = 9;
const HASH_H = 8;
const GRID = 4;

export type ImageSignature = {
  /**
   * İmzanın üretildiği görsel. Satıcı ürünün fotoğrafını değiştirdiğinde URL de
   * değişir; imza o zaman kendiliğinden geçersiz sayılıp yeniden hesaplanır —
   * ayrıca bir "imzayı temizle" adımına gerek kalmaz.
   */
  url: string;
  /** 64 bitlik fark karması, 16 haneli onaltılık. */
  hash: string;
  /** 4x4 ızgaranın parlaklığa göre normalize edilmiş RGB'si; 48 sayı. */
  colors: number[];
};

export function isImageSignature(value: unknown): value is ImageSignature {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ImageSignature>;

  return (
    typeof candidate.url === "string" &&
    typeof candidate.hash === "string" &&
    candidate.hash.length === 16 &&
    Array.isArray(candidate.colors) &&
    candidate.colors.length === GRID * GRID * 3 &&
    candidate.colors.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

type Canvas2D = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

function scratch(size: number): Canvas2D {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D bağlam açılamadı.");
  return { canvas, ctx };
}

/**
 * Kaynağın **ortasındaki kare** parmak izi.
 *
 * Kare kırpma tarafların simetrisi için değil, kameranın katalog fotoğrafına
 * benzemesi için: tarayıcı ekranında ürünün doldurması istenen çerçeve de tam
 * bu bölge. Kadrajın tamamı alınsaydı karşılaştırmaya deponun rafları da
 * girerdi ve her ürün birbirine benzerdi.
 */
export function describeSource(
  source: CanvasImageSource,
  width: number,
  height: number
): Omit<ImageSignature, "url"> | null {
  if (!width || !height) return null;

  const crop = Math.min(width, height);
  const sx = (width - crop) / 2;
  const sy = (height - crop) / 2;

  const base = scratch(BASE);
  base.ctx.drawImage(source, sx, sy, crop, crop, 0, 0, BASE, BASE);

  return {
    hash: hashOf(base.canvas),
    colors: colorsOf(base.canvas),
  };
}

function hashOf(base: HTMLCanvasElement): string {
  const small = scratch(HASH_W);
  small.ctx.drawImage(base, 0, 0, BASE, BASE, 0, 0, HASH_W, HASH_H);
  const { data } = small.ctx.getImageData(0, 0, HASH_W, HASH_H);

  let bits = "";
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      bits += luma(data, (y * HASH_W + x) * 4) > luma(data, (y * HASH_W + x + 1) * 4)
        ? "1"
        : "0";
    }
  }

  // 64 bit tek parçada `parseInt` ile onaltılığa çevrilemez (kayan nokta 53
  // bitten sonra hassasiyetini yitirir), o yüzden dörderli gruplar hâlinde.
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function colorsOf(base: HTMLCanvasElement): number[] {
  const small = scratch(GRID);
  small.ctx.drawImage(base, 0, 0, BASE, BASE, 0, 0, GRID, GRID);
  const { data } = small.ctx.getImageData(0, 0, GRID, GRID);

  let total = 0;
  for (let i = 0; i < GRID * GRID; i++) total += luma(data, i * 4);
  // Tamamen siyah bir kare (kapalı kamera, kapak) bölmeyi patlatmasın.
  const mean = Math.max(total / (GRID * GRID), 1);

  const colors: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    for (let channel = 0; channel < 3; channel++) {
      const relative = (data[i * 4 + channel] / mean) * 128;
      colors.push(Math.round(Math.min(relative, 255)));
    }
  }
  return colors;
}

function luma(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

const HEX_BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/**
 * İki parmak izinin benzerliği, 0 ile 1 arasında.
 *
 * Biçim renkten ağır basıyor: satıcının kataloğunda aynı renkten çok sayıda
 * ürün olması (siyah çanta, siyah valiz) renk aynı ağırlıkta olsaydı hepsini
 * birbirine karıştırırdı; oysa biçim ikisini ayırıyor. Renk yine de tamamen
 * atılmıyor, aynı kalıptaki iki farklı renkli ürünü ayıran tek şey o.
 */
export function similarity(
  a: Omit<ImageSignature, "url">,
  b: Omit<ImageSignature, "url">
): number {
  if (a.hash.length !== b.hash.length) return 0;

  let distance = 0;
  for (let i = 0; i < a.hash.length; i++) {
    distance += HEX_BITS[parseInt(a.hash[i], 16) ^ parseInt(b.hash[i], 16)];
  }
  const shape = 1 - distance / (a.hash.length * 4);

  let diff = 0;
  const count = Math.min(a.colors.length, b.colors.length);
  if (!count) return shape;
  for (let i = 0; i < count; i++) diff += Math.abs(a.colors[i] - b.colors[i]);
  const color = Math.max(0, 1 - diff / count / 128);

  return shape * 0.7 + color * 0.3;
}
