import { createClient } from "@/lib/supabase/server";

/**
 * Yönetim panelinin istatistikleri.
 *
 * Sayım veritabanında yapılıyor (bkz. 0019: `admin_stats_buckets`). Satırları
 * buraya çekip JavaScript'te gruplamak hem supabase-js'in 1000 satırlık
 * varsayılan sınırına takılırdı hem de bir yıllık okutma kaydını boşuna
 * taşımak olurdu.
 *
 * Sorgular oturumun kendi anahtarıyla atılıyor, service role ile değil:
 * fonksiyonlar `security definer` ve içlerinde `is_superuser()` kontrolü var,
 * yani yetkiyi veritabanı veriyor.
 */

export type Period = "gun" | "hafta" | "ay";

export const PERIODS: { key: Period; label: string; unit: string; buckets: number }[] = [
  { key: "gun", label: "Günlük", unit: "day", buckets: 14 },
  { key: "hafta", label: "Haftalık", unit: "week", buckets: 12 },
  { key: "ay", label: "Aylık", unit: "month", buckets: 12 },
];

export function periodOf(value: string | undefined): Period {
  return PERIODS.some((p) => p.key === value) ? (value as Period) : "gun";
}

export type Bucket = {
  /** Kovanın başlangıcı, Türkiye saatiyle: YYYY-MM-DD. */
  date: string;
  scans: number;
  products: number;
  bookings: number;
};

export type TopProduct = {
  id: string;
  name: string;
  owner: string;
  scans: number;
};

export type Stats = {
  buckets: Bucket[];
  top: TopProduct[];
  /**
   * Sorgu başarısız olduysa sebebi. En olası hâli 0019 migration'ının henüz
   * çalıştırılmamış olması; sayfa boş sayı göstermek yerine bunu söylüyor.
   */
  error: string | null;
};

export async function getStats(period: Period): Promise<Stats> {
  const { unit, buckets: count } = PERIODS.find((p) => p.key === period)!;
  const supabase = await createClient();

  // İki liste de aynı dönemi gösteriyor, o yüzden ikisi de aynı parametreleri
  // alıyor ve birlikte gidiyor.
  const [{ data, error }, { data: topRows }] = await Promise.all([
    supabase.rpc("admin_stats_buckets", { p_unit: unit, p_buckets: count }),
    supabase.rpc("admin_top_scanned_products", {
      p_unit: unit,
      p_buckets: count,
      p_limit: 5,
    }),
  ]);

  if (error) {
    return { buckets: [], top: [], error: error.message };
  }

  const buckets: Bucket[] = (
    (data ?? []) as {
      bucket_start: string;
      scan_count: number;
      product_count: number;
      booking_count: number;
    }[]
  ).map((row) => ({
    // Fonksiyon kovaları zaten Türkiye saatine göre kesip saat dilimsiz
    // döndürüyor; burada yalnızca tarih kısmı alınıyor.
    date: row.bucket_start.slice(0, 10),
    scans: Number(row.scan_count),
    products: Number(row.product_count),
    bookings: Number(row.booking_count),
  }));

  const top: TopProduct[] = (
    (topRows ?? []) as {
      scanned_product_id: string;
      scanned_product_name: string;
      owner_username: string;
      scan_count: number;
    }[]
  ).map((row) => ({
    id: row.scanned_product_id,
    name: row.scanned_product_name,
    owner: row.owner_username,
    scans: Number(row.scan_count),
  }));

  return { buckets, top, error: null };
}
