"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import { canliyiIlerlet, yayinDurumu } from "@/lib/github";

/**
 * Hata mesajı fırlatılmıyor, döndürülüyor.
 *
 * Next production derlemesinde bir server action'dan sızan istisnayı maskeler:
 * istemciye "bir hata oluştu" diye ulaşır, asıl metin yalnızca sunucu log'una
 * düşer. Buradaki mesajlar tam olarak kullanıcının okuması için yazıldı, o
 * yüzden dönüş değerinin parçası olmak zorundalar.
 */
export type YayinSonucu = { tamam: true } | { tamam: false; mesaj: string };

/** Seçilen değişikliğe kadar olan her şeyi canlıya alır. */
export async function yayinla(sha: string): Promise<YayinSonucu> {
  // Sayfanın `/yonetim` altında olması yetki değildir — bu işlem herkesin
  // gönderebileceği bir POST ucu, kontrol burada yapılmak zorunda.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    return { tamam: false, mesaj: "Bu işlem için yetkiniz yok." };
  }

  // Gelen sha'ya güvenmiyoruz. İstemci hangi değişikliği kastettiğini söyler,
  // hangi commit'lerin gönderilebilir olduğuna sunucu karar verir: aksi halde
  // bu uç, deponun herhangi bir commit'ini canlıya alan bir düğme olurdu.
  const durum = await yayinDurumu();
  if ("kurulum" in durum) return { tamam: false, mesaj: durum.kurulum };
  if (!durum.degisiklikler.some((d) => d.sha === sha)) {
    return {
      tamam: false,
      mesaj: "Bu değişiklik yayın sırasında değil. Sayfayı yenileyin.",
    };
  }

  try {
    await canliyiIlerlet(sha);
  } catch (e) {
    return {
      tamam: false,
      mesaj: e instanceof Error ? e.message : "Gönderilemedi.",
    };
  }

  revalidatePath("/yonetim/yayin");
  return { tamam: true };
}
