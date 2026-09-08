import { createAdminClient } from "@/lib/supabase/admin";
import { mesajGonder } from "@/lib/instagram/graph";
import { onaylandi, reddedildi } from "@/lib/instagram/metin";

/**
 * Satıcının kararını müşteriye bildirir.
 *
 * Karar veritabanında zaten kesinleşmiş oluyor; buradaki iş yalnızca haber
 * vermek. Bu yüzden hata fırlatmıyor: mesaj gidemediyse rezervasyon yine de
 * geçerli, ve satıcının onayını "Instagram'a ulaşılamadı" diye geri almak çok
 * daha kötü olurdu. Gönderilemeyen mesaj çağırana bildiriliyor, panel de
 * satıcıya "müşteriye ulaşılamadı, kendiniz yazın" diyebiliyor.
 *
 * Mesajın gitmeme ihtimali gerçek: Instagram, işletmenin müşteriye ancak son
 * mesajından sonraki 24 saat içinde yazmasına izin veriyor. Talep dünden
 * kalmışsa pencere kapanmış olabilir.
 */
export async function kararBildir(
  talepId: string,
  karar: "onay" | "ret",
  not: string | null
): Promise<{ ok: boolean; hata?: string }> {
  const db = createAdminClient();

  const { data: talep } = await db
    .from("booking_requests")
    .select("owner_id, sender_id, start_date, end_date")
    .eq("id", talepId)
    .maybeSingle();

  if (!talep?.sender_id) return { ok: false, hata: "Müşterinin sohbeti bulunamadı." };

  const { data: hesap } = await db
    .from("instagram_accounts")
    .select("access_token, is_active")
    .eq("owner_id", talep.owner_id)
    .maybeSingle();

  if (!hesap?.access_token || !hesap.is_active) {
    return { ok: false, hata: "Instagram bağlantısı kapalı." };
  }

  let govde: string;

  if (karar === "ret") {
    govde = reddedildi(not);
  } else {
    const { data: kalemler } = await db
      .from("booking_request_items")
      .select("quantity, products(name)")
      .eq("request_id", talepId);

    const urunler = (kalemler ?? [])
      .map((kalem) => {
        const ad = (kalem.products as unknown as { name: string } | null)?.name ?? "Ürün";
        const adet = kalem.quantity as number;
        return `• ${ad}${adet > 1 ? ` × ${adet}` : ""}`;
      })
      .join("\n");

    govde = onaylandi({
      urunler,
      baslangic: talep.start_date as string,
      bitis: talep.end_date as string,
    });
  }

  const sonuc = await mesajGonder(hesap.access_token as string, talep.sender_id as string, govde);

  // Karar verilmiş bir talepte konuşma "bekliyor" adımında takılı kalmasın:
  // müşteri yeni bir rezervasyona başlayabilmeli.
  await db
    .from("instagram_threads")
    .update({ state: "kod", draft: { urunler: [] }, updated_at: new Date().toISOString() })
    .eq("sender_id", talep.sender_id)
    .eq("owner_id", talep.owner_id);

  return sonuc.ok ? { ok: true } : { ok: false, hata: sonuc.hata };
}
