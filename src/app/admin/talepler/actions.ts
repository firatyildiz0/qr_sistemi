"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { kararBildir } from "@/lib/instagram/karar";

/**
 * Talebin sonuçlandırılması.
 *
 * Rezervasyonu bu dosya açmıyor, veritabanındaki `approve_booking_request()`
 * açıyor — ve bunun sebebi tek bir cümle: onay tek işlem olmalı. Talepte üç
 * ürün varsa üçü birden açılır ya da hiçbiri açılmaz; araya giren başka bir
 * rezervasyon son üniteyi almışsa stok trigger'ı işlemi geri sarar ve talep
 * `pending` kalır. Satıcı "onayladım" görüp de rezervasyonun oluşmadığı bir
 * durum bu yüzden mümkün değil.
 *
 * Müşteriye haber vermek kararın parçası değil, sonrası: mesaj gidemese de
 * rezervasyon geçerli, satıcıya da ulaşılamadığı söyleniyor.
 */

export type TalepSonucu = { hata: string | null; uyari?: string };

function tazele() {
  revalidatePath("/admin/talepler");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/customers", "layout");
  revalidatePath("/admin");
}

async function yetkiliMi(): Promise<boolean> {
  return Boolean(await getCurrentUser());
}

export async function talebiOnayla(talepId: string): Promise<TalepSonucu> {
  if (!(await yetkiliMi())) return { hata: "Bunu yapmak için giriş yapmalısınız." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_booking_request", {
    p_request_id: talepId,
  });

  if (error) return { hata: error.message };

  const bildirim = await kararBildir(talepId, "onay", null);

  tazele();

  return {
    hata: null,
    uyari: bildirim.ok
      ? undefined
      : "Rezervasyon oluşturuldu ama müşteriye Instagram'dan mesaj gönderilemedi. Kendiniz yazmanız gerekebilir.",
  };
}

export async function talebiReddet(
  talepId: string,
  not: string
): Promise<TalepSonucu> {
  if (!(await yetkiliMi())) return { hata: "Bunu yapmak için giriş yapmalısınız." };

  const temizNot = not.trim().slice(0, 300);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_booking_request", {
    p_request_id: talepId,
    p_note: temizNot || null,
  });

  if (error) return { hata: error.message };

  const bildirim = await kararBildir(talepId, "ret", temizNot || null);

  tazele();

  return {
    hata: null,
    uyari: bildirim.ok
      ? undefined
      : "Talep reddedildi ama müşteriye Instagram'dan mesaj gönderilemedi.",
  };
}
