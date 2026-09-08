/**
 * Müşterinin yazdığı tarihin okunması.
 *
 * Formda tarih bir takvimden seçiliyor; mesajda öyle bir şey yok, müşteri ne
 * aklına gelirse onu yazıyor: "12.05.2026 - 15.05.2026", "12-15 mayıs",
 * "5 haziran", "yarın". Buradaki iş, bu serbest metinden iki güne inmek ya da
 * inemediğinde müşteriye ne yazması gerektiğini söylemek — asla tahmin edip
 * yanlış günü rezerve etmemek.
 *
 * Dönen değer her zaman YYYY-MM-DD; sistemin geri kalanı tarihleri böyle
 * konuşuyor (bkz. lib/bookings.ts).
 */

import { sadelestir } from "@/lib/instagram/harf";

const AYLAR: Record<string, number> = {
  ocak: 1,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  eylul: 9,
  ekim: 10,
  kasim: 11,
  aralik: 12,
};

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * Bugünün tarihi, Türkiye saatiyle.
 *
 * Sunucu UTC'de çalışıyor: gece yarısıyla 03:00 arasında `new Date()` dünü
 * gösterir ve "bugün için rezervasyon" isteyen müşteriye "geçmiş tarih"
 * denirdi. Kesim satıcının günü olmalı.
 */
export function bugun(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function gunEkle(gun: string, adet: number): string {
  const date = new Date(gun + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + adet);
  return date.toISOString().slice(0, 10);
}

/** Gün/ay/yıl üçlüsünü doğrular: 31 Nisan buradan geçemez. */
function gunYap(gun: number, ay: number, yil: number): string | null {
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null;

  const date = new Date(Date.UTC(yil, ay - 1, gun));
  if (
    date.getUTCFullYear() !== yil ||
    date.getUTCMonth() !== ay - 1 ||
    date.getUTCDate() !== gun
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Yıl yazılmamışsa: bu yılın o günü henüz geçmediyse bu yıl, geçtiyse gelecek
 * yıl. Aralıkta "5 ocak" yazan müşteri ocağı geride bırakmışsa gelecek ocağı
 * kastediyor.
 */
function yiliTamamla(gun: number, ay: number): string | null {
  const buYil = Number(bugun().slice(0, 4));
  const aday = gunYap(gun, ay, buYil);
  if (aday && aday >= bugun()) return aday;
  return gunYap(gun, ay, buYil + 1);
}

/** İki haneli yıl: "26" → 2026. */
function yiliAc(yil: number): number {
  if (yil >= 1000) return yil;
  if (yil < 100) return 2000 + yil;
  return yil;
}

type Bulunan = { gun: string; index: number };

/**
 * Metindeki bütün tarihleri, göründükleri sırayla.
 *
 * Tek bir birleşik desen yerine üç ayrı geçiş var, çünkü biçimler birbirinin
 * içine giriyor: "12-15 mayıs" tek bir aya bağlı iki gün, "12.05" ise ayı
 * kendi içinde taşıyor. Sıra önemli — önce en özgül biçim taranıyor.
 */
function tarihleriBul(metin: string): Bulunan[] {
  const bulunanlar: Bulunan[] = [];
  const kullanilan: [number, number][] = [];

  const cakisiyor = (start: number, end: number) =>
    kullanilan.some(([a, b]) => start < b && end > a);

  const ekle = (gun: string | null, start: number, end: number) => {
    if (!gun || cakisiyor(start, end)) return;
    kullanilan.push([start, end]);
    bulunanlar.push({ gun, index: start });
  };

  const ayAdi = Object.keys(AYLAR).join("|");

  // "12-15 mayıs 2026" / "12 ile 15 mayıs": ay bir kez yazılmış, iki gün var.
  //
  // Sayıların iki yanındaki "rakam değil" koşulları şart: onlar olmadan
  // "1 Ocak 2028 - 3 Ocak 2028" cümlesindeki *yılın son iki hanesi* gün sanılıp
  // "28 - 3 ocak" diye okunuyor ve aralık ters çıkıyordu.
  const araliklıAy = new RegExp(
    String.raw`(?<!\d)(\d{1,2})\s*(?:-|/|ile|ila|–)\s*(\d{1,2})(?!\d)\s*(${ayAdi})\s*(\d{2,4})?(?!\d)`,
    "g"
  );
  for (const eslesme of metin.matchAll(araliklıAy)) {
    const ay = AYLAR[eslesme[3]];
    const yil = eslesme[4] ? yiliAc(Number(eslesme[4])) : null;
    const ilk = Number(eslesme[1]);
    const son = Number(eslesme[2]);
    const start = eslesme.index ?? 0;
    const end = start + eslesme[0].length;

    ekle(yil ? gunYap(ilk, ay, yil) : yiliTamamla(ilk, ay), start, end - 1);
    ekle(yil ? gunYap(son, ay, yil) : yiliTamamla(son, ay), end - 1, end);
  }

  // "12 mayıs 2026" / "5 haziran"
  const adliTarih = new RegExp(
    String.raw`(?<!\d)(\d{1,2})\s*(${ayAdi})\s*(\d{2,4})?(?!\d)`,
    "g"
  );
  for (const eslesme of metin.matchAll(adliTarih)) {
    const gun = Number(eslesme[1]);
    const ay = AYLAR[eslesme[2]];
    const yil = eslesme[3] ? yiliAc(Number(eslesme[3])) : null;
    const start = eslesme.index ?? 0;
    ekle(
      yil ? gunYap(gun, ay, yil) : yiliTamamla(gun, ay),
      start,
      start + eslesme[0].length
    );
  }

  // "12.05.2026", "12/5/26", "12.05"
  const sayisalTarih = /(?<!\d)(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?(?!\d)/g;
  for (const eslesme of metin.matchAll(sayisalTarih)) {
    const gun = Number(eslesme[1]);
    const ay = Number(eslesme[2]);
    const yil = eslesme[3] ? yiliAc(Number(eslesme[3])) : null;
    const start = eslesme.index ?? 0;
    ekle(
      yil ? gunYap(gun, ay, yil) : yiliTamamla(gun, ay),
      start,
      start + eslesme[0].length
    );
  }

  return bulunanlar.sort((a, b) => a.index - b.index);
}

export type TarihAraligi = { baslangic: string; bitis: string };
export type TarihSonucu = TarihAraligi | { hata: string };

/** Aralığın taranabilir uzunluğu; `bookings` tarafındaki sınırla aynı. */
const MAX_GUN = 366;
/** Bu kadar ileriye rezervasyon alınmıyor — yanlış yazılmış yılı da yakalar. */
const MAX_ILERI_GUN = 730;

/**
 * Serbest metinden kiralama aralığı.
 *
 * Tek tarih yazılmışsa tek günlük kiralama sayılıyor: "5 haziran" diyen müşteri
 * çoğunlukla o günü kastediyor ve özet ekranında ne anladığımızı zaten
 * gösteriyoruz, yani yanlış anlaşılma sessiz kalmıyor.
 */
export function tarihOku(ham: string): TarihSonucu {
  const metin = sadelestir(ham).replace(/[–—]/g, "-").trim();

  if (!metin) return { hata: "bos" };

  const bulunanlar = tarihleriBul(metin);
  let baslangic: string | null = null;
  let bitis: string | null = null;

  if (bulunanlar.length > 0) {
    baslangic = bulunanlar[0].gun;
    bitis = bulunanlar[1]?.gun ?? bulunanlar[0].gun;
  } else if (/\bbugun\b/.test(metin)) {
    baslangic = bitis = bugun();
  } else if (/\byarin\b/.test(metin)) {
    baslangic = bitis = gunEkle(bugun(), 1);
  } else {
    return { hata: "anlasilmadi" };
  }

  if (!baslangic || !bitis) return { hata: "anlasilmadi" };

  // Ters yazılmış aralık ("15 - 12 mayıs") düzeltilmiyor: müşteri hangi ayı
  // kastettiğini kendisi söylesin, biz tahmin edip yanlış günü tutmayalım.
  if (bitis < baslangic) return { hata: "ters" };
  if (baslangic < bugun()) return { hata: "gecmis" };
  if (baslangic > gunEkle(bugun(), MAX_ILERI_GUN)) return { hata: "cok_ileri" };

  const gunSayisi =
    Math.round(
      (Date.parse(bitis + "T00:00:00Z") - Date.parse(baslangic + "T00:00:00Z")) /
        86_400_000
    ) + 1;

  if (gunSayisi > MAX_GUN) return { hata: "cok_uzun" };

  return { baslangic, bitis };
}

/** "12 Mayıs 2026" — mesajlarda tarihler böyle görünüyor. */
export function tarihYaz(gun: string): string {
  const [yil, ay, gunu] = gun.split("-").map(Number);
  return `${gunu} ${AY_ADLARI[ay - 1]} ${yil}`;
}

/** "12 – 15 Mayıs 2026"; tek günlük kiralamada tek tarih. */
export function araligiYaz(baslangic: string, bitis: string): string {
  if (baslangic === bitis) return tarihYaz(baslangic);

  const [yilA, ayA, gunA] = baslangic.split("-").map(Number);
  const [yilB, ayB] = bitis.split("-").map(Number);

  if (yilA === yilB && ayA === ayB) {
    return `${gunA} – ${tarihYaz(bitis)}`;
  }
  if (yilA === yilB) {
    return `${gunA} ${AY_ADLARI[ayA - 1]} – ${tarihYaz(bitis)}`;
  }
  return `${tarihYaz(baslangic)} – ${tarihYaz(bitis)}`;
}
