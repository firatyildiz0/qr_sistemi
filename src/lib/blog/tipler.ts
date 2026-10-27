/**
 * Blog yazılarının biçimi.
 *
 * Yazılar Markdown değil yapılandırılmış veri: aynı kaynaktan hem sayfa hem
 * yapılandırılmış veri (JSON-LD) hem de `llms.txt` üretiliyor. Arama motoru
 * ve yapay zekâ asistanları için işaretlenen her şeyin sayfada da birebir
 * görünmesi gerekiyor; tek kaynak bunu kendiliğinden sağlıyor.
 *
 * Metinlerde iki satır içi biçim var: `**kalın**` ve `[bağlantı](/adres)`.
 */

export type Blok =
  | { tur: "paragraf"; metin: string }
  | { tur: "liste"; maddeler: string[] }
  /** Sıralı adımlar: başlık + açıklama. */
  | { tur: "adimlar"; adimlar: { baslik: string; metin: string }[] }
  | { tur: "tablo"; basliklar: string[]; satirlar: string[][] };

export type Bolum = {
  /** Sayfa içi bağlantı ve içindekiler için. */
  id: string;
  /** Mümkünse okurun soracağı biçimde, soru olarak. */
  baslik: string;
  bloklar: Blok[];
};

export type Yazi = {
  slug: string;
  baslik: string;
  /** Arama sonucunda görünen özet; 160 karakter civarı. */
  aciklama: string;
  /**
   * Başlıktaki soruya 2-3 cümlelik doğrudan cevap. Sayfanın en üstünde
   * kutu içinde gösteriliyor: yanıt motorları alıntıyı çoğu zaman buradan
   * yapıyor, aceleci okur da buradan anlıyor.
   */
  kisaCevap: string;
  /** ISO tarih (YYYY-AA-GG). */
  yayin: string;
  guncelleme: string;
  etiketler: string[];
  bolumler: Bolum[];
  sss: { soru: string; cevap: string }[];
};
