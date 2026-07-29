/**
 * Ürün dönüş süreleri (turnaround).
 *
 * Bir rezervasyonun kirada geçen günleri (`start_date` → `end_date`) ürünün
 * gerçekte meşgul olduğu süreyi anlatmaz: kına gününden önce kargoya verilmiş,
 * düğünden sonra da geri dönmesi ve hazırlanması gerekir. O yüzden takvimde
 * kapatılması gereken aralık kiralama aralığından hem önce başlar hem sonra
 * biter — bkz. `occupancySpan` (src/lib/bookings.ts).
 *
 * Süreler satıcıya göre değiştiği (ve kargo firması yavaşladığında elle
 * ayarlanabilmesi gerektiği) için `rental_settings` tablosunda saklanır;
 * buradaki değerler yalnızca varsayılan.
 */

export const DELIVERY_MODES = ["kargo", "elden"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

/** Kargo devreye girmeyen il: buradaki müşteriye ürün elden teslim edilir. */
export const HOME_PROVINCE = "Bursa";

export type ModeTurnaround = {
  /** Ürünün kiralama başlangıcından kaç gün önce elden çıkması gerektiği. */
  outbound: number;
  /** Müşterinin kiralama bitiminden kaç gün sonra ürünü iade ettiği. */
  returnLag: number;
  /** İadenin yolda geçirdiği gün sayısı. */
  inbound: number;
  /** Temizlik / ütü / kontrol için gereken gün sayısı. */
  prep: number;
};

export type Turnaround = Record<DeliveryMode, ModeTurnaround>;

/**
 * Varsayılanlar işletmenin anlattığı akıştan çıkarıldı — kına 5'i, düğün 6'sı
 * olan bir kargo rezervasyonu için: 2'sinde kargoya verilir (5 - 3), müşteri
 * 7'sinde yollar (6 + 1), 9'unda elimize geçer (7 + 2), 10'unda bir sonraki
 * müşteriye çıkabilir. Yani sıradaki kına en erken 13'ü olur.
 */
export const DEFAULT_TURNAROUND: Turnaround = {
  kargo: { outbound: 3, returnLag: 1, inbound: 2, prep: 0 },
  elden: { outbound: 1, returnLag: 1, inbound: 1, prep: 1 },
};

export const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  kargo: "Kargo",
  elden: "Elden teslim",
};

export const DELIVERY_MODE_HINT: Record<DeliveryMode, string> = {
  kargo: `${HOME_PROVINCE} dışına gönderilir, gidiş ve dönüş kargosu takvimden düşülür.`,
  elden: `${HOME_PROVINCE} içinde elden verilip elden alınır, kargo süresi eklenmez.`,
};

/** Ayarlar formunun alanları; sıra ve metinler tek yerden gelsin diye burada. */
export const TURNAROUND_FIELDS: {
  key: keyof ModeTurnaround;
  label: string;
  hint: string;
}[] = [
  {
    key: "outbound",
    label: "Teslimat öncesi",
    hint: "Ürünün kiralama gününden kaç gün önce elinizden çıkması gerekiyor?",
  },
  {
    key: "returnLag",
    label: "Müşterinin iade gecikmesi",
    hint: "Müşteri kiralama bittikten kaç gün sonra ürünü yola çıkarıyor?",
  },
  {
    key: "inbound",
    label: "Dönüş süresi",
    hint: "İade yolda kaç gün geçiriyor?",
  },
  {
    key: "prep",
    label: "Temizlik / hazırlık",
    hint: "Ürün elinize geçtikten sonra kaç gün hazırlık gerekiyor?",
  },
];

/** Tek bir alanın kabul edilebilir üst sınırı; takvim taramasını da korur. */
export const MAX_TURNAROUND_DAYS = 60;

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return DELIVERY_MODES.includes(value as DeliveryMode);
}

/**
 * Teslimat şeklini müşterinin ilinden türetir. Rezervasyon kaydedilirken
 * satıcı bunu elle değiştirebilir (İstanbul'dan gelip elden alan müşteri,
 * ya da Bursa'nın uzak ilçesine kargolanan ürün), ama varsayılanı budur.
 */
export function deliveryModeForCity(city: string | null | undefined): DeliveryMode {
  return city?.trim() === HOME_PROVINCE ? "elden" : "kargo";
}

function pickDays(value: unknown, fallback: number): number {
  const days = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(days)) return fallback;
  return Math.min(MAX_TURNAROUND_DAYS, Math.max(0, Math.trunc(days)));
}

function parseMode(value: unknown, fallback: ModeTurnaround): ModeTurnaround {
  if (typeof value !== "object" || value === null) return fallback;
  const raw = value as Record<string, unknown>;

  return {
    outbound: pickDays(raw.outbound, fallback.outbound),
    returnLag: pickDays(raw.returnLag, fallback.returnLag),
    inbound: pickDays(raw.inbound, fallback.inbound),
    prep: pickDays(raw.prep, fallback.prep),
  };
}

/**
 * Veritabanındaki jsonb'yi okur. Kolon serbest biçimli olduğu için hiçbir alan
 * güvenilir kabul edilmez; eksik ya da bozuk olan her şey varsayılana düşer.
 */
export function parseTurnaround(raw: unknown): Turnaround {
  if (typeof raw !== "object" || raw === null) return DEFAULT_TURNAROUND;
  const value = raw as Record<string, unknown>;

  return {
    kargo: parseMode(value.kargo, DEFAULT_TURNAROUND.kargo),
    elden: parseMode(value.elden, DEFAULT_TURNAROUND.elden),
  };
}

/** Ürünün kiralama bittikten sonra kaç gün daha meşgul kaldığı. */
export function tailDays(mode: ModeTurnaround): number {
  return mode.returnLag + mode.inbound + mode.prep;
}

export function isDefaultTurnaround(turnaround: Turnaround): boolean {
  return DELIVERY_MODES.every((mode) =>
    TURNAROUND_FIELDS.every(
      ({ key }) => turnaround[mode][key] === DEFAULT_TURNAROUND[mode][key]
    )
  );
}
