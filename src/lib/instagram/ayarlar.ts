/**
 * Satıcının Instagram asistanı için panelden yönettiği ayarlar.
 *
 * Veritabanında jsonb olarak duruyor (bkz. 0029), yani şekli garanti değil:
 * `ayarlariOku` her alanı ayrı ayrı doğruluyor, eksik ya da bozuk olan
 * varsayılana düşüyor. Böylece ayar hiç kaydedilmemiş bir satıcının sohbeti de
 * eskisi gibi çalışıyor.
 */

export type Hitap = "sen" | "siz";
export type Uslup = "samimi" | "dengeli" | "resmi";

export type OrnekMesaj = { soru: string; cevap: string };

export type InstagramAyarlari = {
  /** Serbest sorulara (fiyat, kargo, kapora...) cevap verilsin mi. */
  soruCevapAcik: boolean;
  /** Mesajdan rezervasyon talebi alınsın mı. */
  rezervasyonAcik: boolean;
  hitap: Hitap;
  uslup: Uslup;
  /** İlk mesaj. Boşsa varsayılan karşılama kullanılıyor. */
  karsilama: string;
  /** İşletme hakkında her şey: ne kiralanıyor, saatler, teslimat, ödeme... */
  isletmeBilgisi: string;
  /** Şartlar, kriterler, istisnalar: "kapora %30", "İstanbul dışına kargo yok". */
  kurallar: string;
  /** Satıcının kendi cevapladığı örnek konuşmalar; üslup da buradan öğreniliyor. */
  ornekler: OrnekMesaj[];
  /** Asistanın hiç konuşmaması gereken konular ya da yönlendirmeler. */
  yasaklar: string;
  /** Talep satıcıya iletildiğinde müşteriye giden mesaj. Boşsa varsayılan. */
  talepAlindi: string;
  /** Satıcı onayladığında onay mesajının sonuna eklenen not. */
  onayNotu: string;
  /** En az kaç günlük kiralama kabul ediliyor; null = sınır yok. */
  minGun: number | null;
};

export const VARSAYILAN_AYARLAR: InstagramAyarlari = {
  soruCevapAcik: true,
  rezervasyonAcik: true,
  hitap: "siz",
  uslup: "samimi",
  karsilama: "",
  isletmeBilgisi: "",
  kurallar: "",
  ornekler: [],
  yasaklar: "",
  talepAlindi: "",
  onayNotu: "",
  minGun: null,
};

export const SINIRLAR = {
  kisaMetin: 600,
  uzunMetin: 6000,
  ornekSayisi: 20,
  ornekMetin: 600,
  minGun: 60,
} as const;

function metin(deger: unknown, sinir: number): string {
  return typeof deger === "string" ? deger.trim().slice(0, sinir) : "";
}

export function ayarlariOku(ham: unknown): InstagramAyarlari {
  if (typeof ham !== "object" || ham === null) return { ...VARSAYILAN_AYARLAR };
  const v = ham as Record<string, unknown>;

  const ornekler: OrnekMesaj[] = Array.isArray(v.ornekler)
    ? v.ornekler
        .flatMap((o) => {
          if (typeof o !== "object" || o === null) return [];
          const r = o as Record<string, unknown>;
          const soru = metin(r.soru, SINIRLAR.ornekMetin);
          const cevap = metin(r.cevap, SINIRLAR.ornekMetin);
          return soru && cevap ? [{ soru, cevap }] : [];
        })
        .slice(0, SINIRLAR.ornekSayisi)
    : [];

  const minGun = Number(v.minGun);

  return {
    soruCevapAcik: typeof v.soruCevapAcik === "boolean" ? v.soruCevapAcik : true,
    rezervasyonAcik: typeof v.rezervasyonAcik === "boolean" ? v.rezervasyonAcik : true,
    hitap: v.hitap === "sen" ? "sen" : "siz",
    uslup: v.uslup === "dengeli" || v.uslup === "resmi" ? v.uslup : "samimi",
    karsilama: metin(v.karsilama, SINIRLAR.kisaMetin),
    isletmeBilgisi: metin(v.isletmeBilgisi, SINIRLAR.uzunMetin),
    kurallar: metin(v.kurallar, SINIRLAR.uzunMetin),
    ornekler,
    yasaklar: metin(v.yasaklar, SINIRLAR.uzunMetin),
    talepAlindi: metin(v.talepAlindi, SINIRLAR.kisaMetin),
    onayNotu: metin(v.onayNotu, SINIRLAR.kisaMetin),
    minGun:
      Number.isInteger(minGun) && minGun > 1 && minGun <= SINIRLAR.minGun ? minGun : null,
  };
}
