import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  DEFAULT_TURNAROUND,
  parseTurnaround,
  type Turnaround,
} from "@/lib/turnaround";

/**
 * Oturum açmış satıcının dönüş süreleri.
 *
 * Satır hiç yoksa (ayarlara hiç girilmemişse) varsayılanlar döner; tabloya
 * kayıt ancak satıcı ayarları kaydettiğinde yazılır.
 *
 * Herkese açık ürün sayfası bu fonksiyona ihtiyaç duymaz: rezervasyonların
 * meşguliyet aralığı zaten `blocked_start`/`blocked_end` kolonlarında yazılı
 * ve o kolonlar herkese okunabilir. RLS de zaten satıcının ayarını başkasına
 * göstermez.
 *
 * `cache()` ile sarılı, çünkü aynı istekte hem sayfa hem form okuyor.
 */
export const getTurnaround = cache(async (): Promise<Turnaround> => {
  const user = await getCurrentUser();
  if (!user) return DEFAULT_TURNAROUND;

  const supabase = await createClient();
  const { data } = await supabase
    .from("rental_settings")
    .select("turnaround")
    .eq("owner_id", user.id)
    .maybeSingle();

  return parseTurnaround(data?.turnaround);
});

/** Bir ürünün sahibine ait süreler — rezervasyonu satıcı adına kaydederken. */
export async function getTurnaroundForOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string
): Promise<Turnaround> {
  const { data } = await supabase
    .from("rental_settings")
    .select("turnaround")
    .eq("owner_id", ownerId)
    .maybeSingle();

  return parseTurnaround(data?.turnaround);
}
