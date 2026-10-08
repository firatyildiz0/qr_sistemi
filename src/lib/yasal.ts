/**
 * Satıcı ve abonelik bilgileri — yasal sayfaların ve site altbilgisinin tek
 * kaynağı.
 *
 * Mesafeli satış sözleşmesi, iade şartları, hakkımızda ve gizlilik metni bu
 * değerleri buradan okur. Adres, telefon ya da fiyat değiştiğinde yalnızca
 * burası güncellenir; metinlerin birinde eski bilgi kalırsa ödeme kuruluşu
 * incelemesinde tutarsızlık olarak görünür.
 */

export const SATICI = {
  marka: "Voyo Labs",
  urun: "RentQR",
  /** Şahıs şirketi: ticari unvan sahibinin adı soyadıdır. */
  unvan: "Nihat Yavuz",
  adres: "Karapınar Mah. B162. Sok. No:7 Daire:9 Hatipoğlu Apartmanı, Yıldırım / Bursa",
  vergiDairesi: "Gökdere Vergi Dairesi",
  vergiNo: "9421013839",
  /**
   * Ticaret siciline kayıtlıysa MERSİS numarası. Boşken künyede hiç
   * görünmez; doldurulduğu an bütün yasal sayfalara aynı anda girer.
   */
  mersisNo: "" as string,
  telefon: "0534 587 54 56",
  telefonHref: "tel:+905345875456",
  eposta: "veyro.ro@gmail.com",
} as const;

export const ABONELIK = {
  ad: "RentQR Aylık Abonelik",
  /** Görüntülenen fiyat; tahsilat tutarı ödeme ekranında ayrıca gösterilir. */
  fiyat: "1.999 TL",
  donem: "aylık",
} as const;

export const YASAL_SAYFALAR = [
  { href: "/hakkimizda", ad: "Hakkımızda" },
  { href: "/on-bilgilendirme-formu", ad: "Ön Bilgilendirme Formu" },
  { href: "/mesafeli-satis-sozlesmesi", ad: "Mesafeli Satış Sözleşmesi" },
  { href: "/teslimat-ve-iade", ad: "Teslimat ve İade Şartları" },
  { href: "/gizlilik", ad: "Gizlilik Sözleşmesi" },
] as const;
