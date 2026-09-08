import { formatPrice } from "@/lib/format";
import { nightsBetween } from "@/lib/bookings";
import { araligiYaz, tarihYaz } from "@/lib/instagram/tarih";
import type { HizliCevap } from "@/lib/instagram/graph";
import type { Taslak, TaslakUrun } from "@/lib/instagram/tipler";

/**
 * Müşterinin gördüğü her cümle burada.
 *
 * Tek dosyada durmasının sebebi üslubun tutarlı kalması: sohbet bir robotla
 * değil bir mağazayla konuşuyormuş gibi olmalı, ve akış dosyası hangi cümlenin
 * nereye gittiğine değil ne zaman gideceğine karar vermeli.
 *
 * İki kural: emoji dekor değil işaret (✓ olan, • liste, ⚠️ dikkat), ve her
 * mesaj müşterinin ne yazması gerektiğini söyleyerek bitiyor. Sohbette
 * "anlamadım" demek ucuz, müşteriyi ne yazacağını bilmeden bırakmak pahalı.
 */

export const HIZLI_DEVAM: HizliCevap[] = [{ baslik: "Devam", yuk: "devam" }];
export const HIZLI_ONAY: HizliCevap[] = [
  { baslik: "Onaylıyorum", yuk: "evet" },
  { baslik: "Vazgeç", yuk: "iptal" },
];
export const HIZLI_ATLA: HizliCevap[] = [{ baslik: "Telefonum yok", yuk: "atla" }];
export const HIZLI_YENI: HizliCevap[] = [
  { baslik: "Yeni rezervasyon", yuk: "yeni" },
];

export const KARSILAMA =
  "Merhaba! 👋 Buradan rezervasyon oluşturabilirsiniz.\n\n" +
  "Başlamak için istediğiniz ürünün *kodunu* yazın (ilanda ya da etikette yazan numara).\n\n" +
  "Örnek: 104523";

export const KOD_ISTE =
  "Ürün kodunu yazar mısınız? İlanda ya da etikette yazan numara.\n\nÖrnek: 104523";

export function kodBulunamadi(kod: string): string {
  return (
    `"${kod}" koduna ait bir ürün bulamadım. 🤔\n\n` +
    "Kodu ilan açıklamasında ya da ürün etiketinde bulabilirsiniz. Tekrar yazar mısınız?"
  );
}

export function kodStoktaYok(ad: string): string {
  return `${ad} şu anda kiralamaya kapalı. Başka bir ürün kodu yazabilirsiniz.`;
}

export function urunEklendi(urun: TaslakUrun, taslak: Taslak): string {
  const satir = urunSatiri(urun);
  const digerleri = taslak.urunler.filter((u) => u.id !== urun.id);

  const liste =
    digerleri.length > 0
      ? "\n\nSepetiniz:\n" + taslak.urunler.map((u) => "• " + urunSatiri(u)).join("\n")
      : "";

  return (
    `✓ ${satir}${liste}\n\n` +
    "Başka ürün eklemek için kodunu yazın, devam etmek için *devam* yazın."
  );
}

function urunSatiri(urun: TaslakUrun): string {
  const adet = urun.adet > 1 ? ` × ${urun.adet}` : "";
  const fiyat = urun.gunlukFiyat != null ? ` — ${formatPrice(urun.gunlukFiyat)}/gün` : "";
  return `${urun.ad}${adet} (${urun.kod})${fiyat}`;
}

export const TARIH_ISTE =
  "Hangi tarihler için istiyorsunuz? Başlangıç ve bitiş tarihini yazın.\n\n" +
  "Örnek: 12.05.2026 - 15.05.2026";

export const TARIH_HATALARI: Record<string, string> = {
  bos: TARIH_ISTE,
  anlasilmadi:
    "Tarihi anlayamadım. 📅 Şu biçimlerden birini kullanır mısınız?\n\n" +
    "• 12.05.2026 - 15.05.2026\n• 12-15 Mayıs 2026\n• 5 Haziran",
  ters: "Bitiş tarihi başlangıçtan önce görünüyor. Önce başlangıç tarihini yazar mısınız?",
  gecmis: "Bu tarih geçmişte kalmış. Bugün ya da sonrası için bir tarih yazar mısınız?",
  cok_ileri: "Bu kadar ileri tarihe rezervasyon alamıyoruz. Daha yakın bir tarih yazar mısınız?",
  cok_uzun: "Bu aralık çok uzun görünüyor. Daha kısa bir aralık yazar mısınız?",
};

export function tarihDolu(urunAdi: string, gun: string, tekUrun: boolean): string {
  const konu = tekUrun ? "Bu ürün" : `${urunAdi}`;
  return (
    `⚠️ ${konu} ${tarihYaz(gun)} tarihinde müsait değil.\n\n` +
    "Kargo ve hazırlık süreleri de hesaba katılıyor, o yüzden kiralama gününden birkaç gün öncesi ve sonrası da dolu sayılabiliyor.\n\n" +
    "Başka bir tarih aralığı yazar mısınız?"
  );
}

export const AD_ISTE = "Harika, o tarihler müsait. ✅\n\nAdınız ve soyadınız?";

export const AD_HATALI = "Adınızı ve soyadınızı yazar mısınız?";

export const TELEFON_ISTE =
  "Teşekkürler. Size ulaşabileceğimiz telefon numaranız?\n\nÖrnek: 0555 123 45 67";

export const TELEFON_HATALI =
  "Numarayı anlayamadım. 11 haneli olarak yazar mısınız?\n\nÖrnek: 0555 123 45 67";

export const ADRES_ISTE =
  "Son bir şey: teslimat için il ve ilçe.\n\nÖrnek: Bursa / Nilüfer";

export const ADRES_HATALI =
  "İl ve ilçeyi bulamadım. İkisini birlikte yazar mısınız?\n\nÖrnek: İstanbul / Kadıköy";

export function ilceIste(il: string): string {
  return `${il} için ilçeyi de yazar mısınız?\n\nÖrnek: ${il} / Merkez`;
}

/**
 * Onay öncesi özet.
 *
 * Sohbet boyunca anlaşılan her şey burada tek ekranda duruyor — yanlış anlaşılan
 * bir tarih ya da adet, talep satıcıya gitmeden önce yalnızca burada
 * yakalanabilir.
 */
export function ozet(taslak: Taslak, kargoMu: boolean): string {
  const gun = nightsBetween(taslak.baslangic!, taslak.bitis!) + 1;

  const satirlar = taslak.urunler.map((urun) => {
    const adet = urun.adet > 1 ? ` × ${urun.adet}` : "";
    const tutar =
      urun.gunlukFiyat != null
        ? ` — ${formatPrice(urun.gunlukFiyat * urun.adet * gun)}`
        : "";
    return `• ${urun.ad}${adet}${tutar}`;
  });

  const fiyatliMi = taslak.urunler.every((urun) => urun.gunlukFiyat != null);
  const toplam = taslak.urunler.reduce(
    (sum, urun) => sum + (urun.gunlukFiyat ?? 0) * urun.adet * gun,
    0
  );

  return [
    "Özet 📋",
    "",
    ...satirlar,
    "",
    `📅 ${araligiYaz(taslak.baslangic!, taslak.bitis!)} (${gun} gün)`,
    `👤 ${taslak.ad}`,
    taslak.telefon ? `📞 ${taslak.telefon}` : null,
    `📍 ${taslak.il} / ${taslak.ilce} — ${kargoMu ? "kargo" : "elden teslim"}`,
    fiyatliMi ? `💳 Tahmini kira bedeli: ${formatPrice(toplam)}` : null,
    "",
    "Doğruysa *onaylıyorum* yazın; talebiniz satıcıya iletilsin. Değiştirmek için *iptal* yazın.",
  ]
    .filter((satir) => satir !== null)
    .join("\n");
}

export const TALEP_ALINDI =
  "Talebiniz satıcıya iletildi. ✅\n\n" +
  "Satıcı onayladığı anda buradan haber vereceğiz. Rezervasyon, satıcı onaylayınca kesinleşir.";

export const TALEP_GONDERILEMEDI =
  "Talebi kaydedemedim, teknik bir sorun oldu. 😔 Birkaç dakika sonra tekrar dener misiniz?";

export const BEKLIYOR =
  "Talebiniz satıcıda, onay bekliyor. Karar verilir verilmez buradan yazacağız.\n\n" +
  "Yeni bir rezervasyon başlatmak isterseniz *yeni* yazın.";

export const IPTAL_EDILDI =
  "Tamam, baştan başlıyoruz. 🔄\n\nİstediğiniz ürünün kodunu yazar mısınız?";

export const YARDIM =
  "Buradan rezervasyon oluşturabilirsiniz. Sıra şöyle:\n\n" +
  "1️⃣ Ürün kodu\n2️⃣ Tarih aralığı\n3️⃣ Ad soyad\n4️⃣ Telefon\n5️⃣ İl / ilçe\n6️⃣ Onay\n\n" +
  "İstediğiniz an *iptal* yazıp baştan başlayabilirsiniz.";

export const METIN_DEGIL =
  "Şu an yalnızca yazıyla ilerleyebiliyorum. 🙏 İsteğinizi yazar mısınız?";

/** Satıcı onayladığında müşteriye giden mesaj. */
export function onaylandi(taslak: {
  urunler: string;
  baslangic: string;
  bitis: string;
}): string {
  return (
    "Harika haber! 🎉 Rezervasyonunuz onaylandı.\n\n" +
    `${taslak.urunler}\n📅 ${araligiYaz(taslak.baslangic, taslak.bitis)}\n\n` +
    "Teslimat için satıcı sizinle iletişime geçecek."
  );
}

/** Satıcı reddettiğinde. Not yazmışsa aynen iletiliyor. */
export function reddedildi(not: string | null): string {
  return (
    "Maalesef bu talep onaylanmadı. 😔" +
    (not ? `\n\nSatıcının notu: ${not}` : "") +
    "\n\nBaşka bir tarih ya da ürün için *yeni* yazarak tekrar deneyebilirsiniz."
  );
}
