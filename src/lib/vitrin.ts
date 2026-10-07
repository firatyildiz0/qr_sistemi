import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ana sayfadaki istatistik bandının sayıları — uydurma değil, canlı veritabanından.
 *
 * Her satıcı yalnızca kendi kayıtlarını görebildiği için (RLS) sayım service
 * role ile yapılıyor; dışarıya yalnızca üç toplam çıkıyor, hiçbir satır değil.
 * Ana sayfa her ziyarette sunucuda çiziliyor, o yüzden sonuç 10 dakika
 * önbellekte tutuluyor: sayıların dakikası dakikasına doğru olması gerekmiyor,
 * her ziyaretçinin üç sayım sorgusu açması gerekmiyor.
 */

export type VitrinSayilari = {
  urun: number;
  rezervasyon: number;
  isletme: number;
};

async function say(): Promise<VitrinSayilari | null> {
  const supabase = createAdminClient();
  const [urun, rezervasyon, isletme] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .neq("status", "cancelled"),
    // Yönetici hesabı bir işletme değil; onay bekleyen ya da reddedilen de değil.
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .neq("role", "superuser"),
  ]);

  const hata = urun.error ?? rezervasyon.error ?? isletme.error;
  if (hata) {
    console.error("[vitrin] sayılar okunamadı:", hata);
    // Önbelleğe hata yazılmasın diye fırlatılıyor; çağıran yakalıyor.
    throw hata;
  }

  return {
    urun: urun.count ?? 0,
    rezervasyon: rezervasyon.count ?? 0,
    isletme: isletme.count ?? 0,
  };
}

const onbellekli = unstable_cache(say, ["vitrin-sayilari"], { revalidate: 600 });

/** Sayılar okunamazsa `null`: bant gizlenir, yanlış ya da sıfır sayı gösterilmez. */
export async function vitrinSayilari(): Promise<VitrinSayilari | null> {
  try {
    return await onbellekli();
  } catch {
    return null;
  }
}
