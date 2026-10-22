"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkFikirRateLimit, recordSecurityEvent } from "@/lib/security";

export type FikirFormDurumu = {
  hata: string | null;
  tamam: boolean;
  /**
   * Hata dönünce formun önceki değerleri. React gönderimden sonra formu
   * sıfırlıyor; bunlar olmasa ziyaretçi yazdığı uzun mesajı kaybederdi.
   */
  degerler?: Record<string, string>;
};

const SINIR = { ad: 80, isletme: 120, eposta: 200, mesaj: 2000 };

/** Telefonu `05xxxxxxxxx` biçimine getirir; geçersizse `null`. */
function telefonuOku(ham: string): string | null {
  let rakamlar = ham.replace(/\D/g, "");
  if (rakamlar.startsWith("90") && rakamlar.length === 12) rakamlar = rakamlar.slice(2);
  if (rakamlar.length === 10) rakamlar = `0${rakamlar}`;
  return /^0[2-5]\d{9}$/.test(rakamlar) ? rakamlar : null;
}

/**
 * Anasayfadaki "Fikriniz mi var?" formundan gelen öneri.
 *
 * Ziyaretçinin oturumu yok; yazma service role ile ve her kural burada: hız
 * sınırı, alan uzunlukları ve size dönebilmek için en az bir iletişim yolu.
 * Öneri yönetim panelinin Fikirler sekmesine düşüyor.
 *
 * `website` alanı insanlara görünmüyor. Dolu geldiyse formu bir bot doldurmuş:
 * kayıt açmadan "gönderildi" deniyor, bot denemeye devam etmesin.
 */
export async function fikirGonder(_onceki: FikirFormDurumu, formData: FormData): Promise<FikirFormDurumu> {
  if (String(formData.get("website") ?? "")) return { hata: null, tamam: true };

  const degerler = Object.fromEntries(
    ["ad", "isletme", "eposta", "telefon", "mesaj", "onay"].map((alan) => [alan, String(formData.get(alan) ?? "")])
  );
  const hata = (mesaj: string): FikirFormDurumu => ({ hata: mesaj, tamam: false, degerler });

  const ad = String(formData.get("ad") ?? "").trim();
  const isletme = String(formData.get("isletme") ?? "").trim();
  const eposta = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const telefonHam = String(formData.get("telefon") ?? "").trim();
  const mesaj = String(formData.get("mesaj") ?? "").trim();

  if (!ad) return hata("Adınızı yazın.");
  if (ad.length > SINIR.ad) return hata(`Ad en fazla ${SINIR.ad} karakter olabilir.`);
  if (isletme.length > SINIR.isletme) {
    return hata(`İşletme adı en fazla ${SINIR.isletme} karakter olabilir.`);
  }
  if (!mesaj) return hata("Fikrinizi birkaç cümleyle anlatın.");
  if (mesaj.length > SINIR.mesaj) return hata(`Mesaj en fazla ${SINIR.mesaj} karakter olabilir.`);

  if (!eposta && !telefonHam) {
    return hata("Size dönebilmemiz için e-posta ya da telefon yazın.");
  }
  if (eposta && (eposta.length > SINIR.eposta || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta))) {
    return hata("Geçerli bir e-posta adresi yazın.");
  }
  const telefon = telefonHam ? telefonuOku(telefonHam) : null;
  if (telefonHam && !telefon) {
    return hata("Geçerli bir telefon numarası yazın, örneğin 0532 123 45 67.");
  }

  if (formData.get("onay") !== "on") {
    return hata("Bilgilerinizin size dönüş için kullanılmasını onaylamanız gerekiyor.");
  }

  const sinir = await checkFikirRateLimit();
  if (!sinir.allowed) return hata(sinir.message);

  const { error } = await createAdminClient()
    .from("fikirler")
    .insert({
      ad,
      isletme: isletme || null,
      eposta: eposta || null,
      telefon,
      mesaj,
    });

  if (error) {
    console.error("[fikir] kaydedilemedi:", error);
    return hata("Mesajınız gönderilemedi. Biraz sonra tekrar deneyin.");
  }

  // Hız sınırının sayacı. Kişisel veri yazılmıyor, yalnızca olayın kendisi.
  await recordSecurityEvent({ kind: "fikir" });

  return { hata: null, tamam: true };
}
