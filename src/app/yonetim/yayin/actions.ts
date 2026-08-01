"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import { canliyaAl, yayinDurumu } from "@/lib/github";

/**
 * Hata mesajı fırlatılmıyor, döndürülüyor.
 *
 * Next production derlemesinde bir server action'dan sızan istisnayı maskeler:
 * istemciye "bir hata oluştu" diye ulaşır, asıl metin yalnızca sunucu log'una
 * düşer. Buradaki mesajlar tam olarak kullanıcının okuması için yazıldı, o
 * yüzden dönüş değerinin parçası olmak zorundalar.
 */
export type YayinSonucu = { tamam: true } | { tamam: false; mesaj: string };

/** Bir işi canlıya alır. */
export async function yayinla(dal: string): Promise<YayinSonucu> {
  // Sayfanın `/yonetim` altında olması yetki değildir — bu işlem herkesin
  // gönderebileceği bir POST ucu, kontrol burada yapılmak zorunda.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    return { tamam: false, mesaj: "Bu işlem için yetkiniz yok." };
  }

  // Gelen dal adına güvenmiyoruz. İstemci hangi işi kastettiğini söyler, hangi
  // dalların canlıya alınabilir olduğuna sunucu karar verir: aksi halde bu uç,
  // depodaki herhangi bir dalı canlıya birleştiren bir düğme olurdu.
  const durum = await yayinDurumu();
  if ("kurulum" in durum) return { tamam: false, mesaj: durum.kurulum };
  if (!durum.degisiklikler.some((d) => d.dal === dal)) {
    return {
      tamam: false,
      mesaj: "Bu iş yayın listesinde değil. Sayfayı yenileyin.",
    };
  }

  try {
    await canliyaAl(dal);
  } catch (e) {
    return {
      tamam: false,
      mesaj: e instanceof Error ? e.message : "Canlıya alınamadı.",
    };
  }

  revalidatePath("/yonetim/yayin");
  return { tamam: true };
}
