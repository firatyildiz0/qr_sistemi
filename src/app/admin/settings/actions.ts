"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { computeOccupancySpan } from "@/lib/bookings";
import {
  DELIVERY_MODES,
  MAX_TURNAROUND_DAYS,
  TURNAROUND_FIELDS,
  isDeliveryMode,
  parseTurnaround,
  type DeliveryMode,
  type ModeTurnaround,
  type Turnaround,
} from "@/lib/turnaround";

export type TurnaroundFormState = {
  error: string | null;
  /** Kaydedildikten sonra yeniden hesaplanan rezervasyon sayısı. */
  recalculated?: number;
  /** Yeni sürelerle çakıştığı için güncellenemeyen rezervasyonlar. */
  skipped?: string[];
};

function readDays(formData: FormData, mode: DeliveryMode, field: string): number | null {
  const raw = String(formData.get(`${mode}.${field}`) ?? "").trim();
  if (raw === "") return null;

  const days = Number(raw);
  if (!Number.isInteger(days) || days < 0 || days > MAX_TURNAROUND_DAYS) return null;
  return days;
}

function readTurnaround(formData: FormData): { error: string } | { values: Turnaround } {
  const values = {} as Turnaround;

  for (const mode of DELIVERY_MODES) {
    const settings = {} as ModeTurnaround;

    for (const { key, label } of TURNAROUND_FIELDS) {
      const days = readDays(formData, mode, key);
      if (days === null) {
        return {
          error: `"${label}" alanı 0 ile ${MAX_TURNAROUND_DAYS} arasında tam sayı olmalı.`,
        };
      }
      settings[key] = days;
    }

    values[mode] = settings;
  }

  return { values };
}

/**
 * Süreleri kaydeder ve gelecekteki rezervasyonların bloke aralığını yeniden
 * hesaplar.
 *
 * Yeniden hesaplama şart: bloke aralık kayıt anında hesaplanıp saklanıyor, o
 * yüzden ayarı değiştirmek kendiliğinden takvime yansımaz. Geçmiş
 * rezervasyonlara dokunulmaz — onlar zaten yaşanmış, tarihleri olduğu gibi
 * kalmalı.
 *
 * Aralık uzayınca iki rezervasyon çakışabilir; o durumda veritabanındaki stok
 * trigger'ı güncellemeyi reddeder. Tek bir çakışma yüzünden tüm işlemi geri
 * almak yerine, güncellenemeyenler toplanıp satıcıya bildiriliyor: ayar
 * kaydedilmiş olur, o rezervasyonları elle düzeltmesi gerektiğini görür.
 */
export async function saveTurnaround(
  _prevState: TurnaroundFormState,
  formData: FormData
): Promise<TurnaroundFormState> {
  const parsed = readTurnaround(formData);
  if ("error" in parsed) return { error: parsed.error };

  const user = await getCurrentUser();
  if (!user) return { error: "Bunu yapmak için giriş yapmalısınız." };

  const supabase = await createClient();
  const turnaround = parseTurnaround(parsed.values);

  const { error } = await supabase
    .from("rental_settings")
    .upsert(
      { owner_id: user.id, turnaround, updated_at: new Date().toISOString() },
      { onConflict: "owner_id" }
    );

  if (error) return { error: error.message };

  const recalc = await recalculateFutureBookings(supabase, turnaround);

  revalidatePath("/admin", "layout");
  return { error: null, ...recalc };
}

const today = () => new Date().toISOString().slice(0, 10);

async function recalculateFutureBookings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  turnaround: Turnaround
): Promise<{ recalculated: number; skipped: string[] }> {
  // RLS zaten satıcıyı kendi ürünleriyle sınırlıyor, ama iç birleşimi açıkça
  // yazmak sorgunun ne döndürdüğünü okunur kılıyor.
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, customer_name, start_date, end_date, delivery_mode, products!inner(owner_id)")
    .gte("end_date", today())
    .neq("status", "cancelled");

  if (!bookings || bookings.length === 0) {
    return { recalculated: 0, skipped: [] };
  }

  let recalculated = 0;
  const skipped: string[] = [];

  for (const booking of bookings) {
    const mode: DeliveryMode = isDeliveryMode(booking.delivery_mode)
      ? booking.delivery_mode
      : "kargo";
    const span = computeOccupancySpan(
      booking.start_date,
      booking.end_date,
      mode,
      turnaround
    );

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ blocked_start: span.start_date, blocked_end: span.end_date })
      .eq("id", booking.id);

    if (updateError) skipped.push(booking.customer_name);
    else recalculated += 1;
  }

  return { recalculated, skipped };
}
