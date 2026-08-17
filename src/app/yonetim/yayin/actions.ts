"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import {
  canliyaAl,
  reddet as reddetVeKaydet,
  reddiGeriAl,
  yayinDurumu,
} from "@/lib/github";

/**
 * Hata mesajı fırlatılmıyor, döndürülüyor.
 *
 * Next production derlemesinde bir server action'dan sızan istisnayı maskeler:
 * istemciye "bir hata oluştu" diye ulaşır, asıl metin yalnızca sunucu log'una
 * düşer. Buradaki mesajlar tam olarak kullanıcının okuması için yazıldı, o
 * yüzden dönüş değerinin parçası olmak zorundalar.
 */
export type YayinSonucu = { tamam: true } | { tamam: false; mesaj: string };

/** Reddederken yazılabilecek en uzun not. */
const SEBEP_SINIRI = 500;

/**
 * Yetkiyi ve dalın gerçekten o listede olduğunu doğrular.
 *
 * Gelen dal adına güvenmiyoruz. İstemci hangi işi kastettiğini söyler, hangi
 * dallara dokunulabileceğine sunucu karar verir: aksi halde bu uçlar, depodaki
 * herhangi bir dalı canlıya birleştiren düğmeler olurdu.
 */
async function dogrula(
  dal: string,
  liste: "bekleyen" | "reddedilen",
): Promise<string | null> {
  // Sayfanın `/yonetim` altında olması yetki değildir — bu işlemler herkesin
  // gönderebileceği POST uçları, kontrol burada yapılmak zorunda.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    return "Bu işlem için yetkiniz yok.";
  }

  const durum = await yayinDurumu();
  if ("kurulum" in durum) return durum.kurulum;

  const kaynak =
    liste === "bekleyen" ? durum.degisiklikler : durum.reddedilenler;
  if (!kaynak.some((d) => d.dal === dal)) {
    return "Bu iş listede değil. Sayfayı yenileyin.";
  }

  return null;
}

/** Bir işi canlıya alır. */
export async function yayinla(dal: string): Promise<YayinSonucu> {
  const engel = await dogrula(dal, "bekleyen");
  if (engel) return { tamam: false, mesaj: engel };

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

/** Bir işi reddeder. İş silinmez, yalnızca bekleyenler listesinden çıkar. */
export async function reddet(dal: string, sebep: string): Promise<YayinSonucu> {
  const engel = await dogrula(dal, "bekleyen");
  if (engel) return { tamam: false, mesaj: engel };

  try {
    await reddetVeKaydet(dal, sebep.trim().slice(0, SEBEP_SINIRI) || null);
  } catch (e) {
    return {
      tamam: false,
      mesaj: e instanceof Error ? e.message : "İş reddedilemedi.",
    };
  }

  revalidatePath("/yonetim/yayin");
  return { tamam: true };
}

/** Reddedilmiş bir işi yeniden bekleyenler listesine alır. */
export async function geriAl(dal: string): Promise<YayinSonucu> {
  const engel = await dogrula(dal, "reddedilen");
  if (engel) return { tamam: false, mesaj: engel };

  try {
    await reddiGeriAl(dal);
  } catch (e) {
    return {
      tamam: false,
      mesaj: e instanceof Error ? e.message : "Karar geri alınamadı.",
    };
  }

  revalidatePath("/yonetim/yayin");
  return { tamam: true };
}
