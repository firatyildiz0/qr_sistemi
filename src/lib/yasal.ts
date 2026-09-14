/**
 * Yasal metinlerin ortak bilgileri.
 *
 * Şirket künyesi tek yerde duruyor: altı ayrı metin aynı unvanı, adresi ve
 * vergi numarasını tekrar ediyor; biri güncellenip öteki unutulursa metinler
 * birbiriyle çelişir. Köşeli parantezle başlayan değerler henüz belirlenmemiş
 * bilgi — sayfalarda işaretli görünüyorlar ki canlıda gözden kaçmasınlar
 * (bkz. `components/yasal/YasalSayfa.tsx` içindeki `Sirket`).
 */
export const SIRKET = {
  marka: "Veyro Labs",
  unvan: "[ŞİRKET ÜNVANI]",
  adres: "[AÇIK ADRES]",
  vergiDairesi: "[VERGİ DAİRESİ]",
  vergiNo: "[VERGİ NUMARASI]",
  mersis: "[MERSİS NUMARASI]",
  telefon: "[TELEFON]",
  kep: "[KEP ADRESİ]",
  eposta: "veyro.ro@gmail.com",
  /** Tacirlerle uyuşmazlıklarda yetkili mahkemelerin bulunduğu il. */
  yetkiliIl: "[İL]",
  /** Ücretli abonelikte kart ödemesini alacak lisanslı ödeme kuruluşu. */
  odemeKurulusu: "[ÖDEME KURULUŞU]",
} as const;

export type SirketAlani = keyof typeof SIRKET;

export function belirsizMi(deger: string): boolean {
  return deger.startsWith("[");
}

/** Bütün metinlerin yürürlükteki sürümünün tarihi. */
export const GUNCELLEME = "14 Eylül 2026";

/**
 * Kayıt olurken kabul edilen üyelik sözleşmesinin sürümü. Kabul edilen sürüm
 * hesabın kullanıcı bilgisine yazılıyor; sözleşme esaslı değiştiğinde bu değer
 * de değişmeli ki kimin hangi metni kabul ettiği ayırt edilebilsin.
 */
export const UYELIK_SOZLESMESI_SURUMU = "2026-09-14";

/** Çerez bildiriminin kapatıldığını hatırlayan çerez. */
export const CEREZ_BILDIRIMI_COOKIE = "rentqr_cerez";

export type YasalBelge = {
  href: string;
  baslik: string;
  /** Alt bilgi gibi dar yerler için. */
  kisa: string;
  ozet: string;
};

export const BELGELER: YasalBelge[] = [
  {
    href: "/gizlilik",
    baslik: "Gizlilik Politikası",
    kisa: "Gizlilik",
    ozet: "Hangi verilerin toplandığı, ne kadar saklandığı ve nasıl sildirileceği.",
  },
  {
    href: "/kvkk",
    baslik: "KVKK Aydınlatma Metni",
    kisa: "KVKK",
    ozet: "Kişisel verilerin hangi amaç ve hukuki sebeple işlendiği, haklarınız.",
  },
  {
    href: "/cerez-politikasi",
    baslik: "Çerez Politikası",
    kisa: "Çerezler",
    ozet: "Sitede kullanılan çerezler ve nasıl yönetebileceğiniz.",
  },
  {
    href: "/uyelik-sozlesmesi",
    baslik: "Üyelik Sözleşmesi",
    kisa: "Üyelik sözleşmesi",
    ozet: "Satıcı hesabı açarken kabul edilen kullanım koşulları.",
  },
  {
    href: "/mesafeli-satis-sozlesmesi",
    baslik: "Mesafeli Satış Sözleşmesi",
    kisa: "Mesafeli satış",
    ozet: "Ücretli abonelik satın alındığında geçerli olan sözleşme.",
  },
  {
    href: "/iptal-ve-iade",
    baslik: "İptal ve İade Koşulları",
    kisa: "İptal ve iade",
    ozet: "Aboneliğin iptali, cayma hakkı ve ücret iadeleri.",
  },
];
