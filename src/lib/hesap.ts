/**
 * Hesabım ekranının sabitleri: seçilebilir sektörler ve fotoğrafsız
 * profilin baş harf renkleri. İstemci de sunucu da buradan okuyor.
 */

export const SEKTORLER = [
  "Gelinlik ve abiye",
  "Kostüm ve kıyafet",
  "Bebek ve çocuk ürünleri",
  "Organizasyon ve dekorasyon",
  "Kamp ve outdoor",
  "Kamera ve elektronik",
  "Araç ve ekipman",
  "Mobilya ve ev eşyası",
  "Spor malzemeleri",
] as const;

/** Profil fotoğrafı yokken baş harfin zemini. Sıra seçim listesindeki sıra. */
export const AVATAR_RENKLERI = [
  "#b4534a",
  "#c47a2c",
  "#5f8a3a",
  "#2f8a7e",
  "#3a6ea5",
  "#6a4fa3",
  "#a3477f",
  "#4a4a4a",
] as const;

export const MAX_AD_UZUNLUGU = 80;
export const MAX_SEKTOR_UZUNLUGU = 60;
/** Profil fotoğrafının kaydedildiği boy (kare, piksel). */
export const AVATAR_BOYU = 320;

export function renkGecerli(renk: unknown): renk is string {
  return typeof renk === "string" && /^#[0-9a-fA-F]{6}$/.test(renk);
}

/** Baş harf: ad soyad varsa ondan, yoksa e-postadan. */
export function basHarf(adSoyad: string | null, email: string | null): string {
  const kaynak = adSoyad?.trim() || email || "?";
  return kaynak.charAt(0).toLocaleUpperCase("tr-TR");
}
