/**
 * Ana sayfa takviminin veri tarafı: kiralamaları güne dökmek ve tarih
 * anahtarlarıyla (`YYYY-MM-DD`) hesap. Bütün hesap gece yarısı UTC üstünden —
 * anahtarlar saat dilimi taşımıyor, `displayStatus` da "bugün"ü aynı yoldan
 * buluyor.
 */

export type TakvimKiralama = {
  id: string;
  urunAdi: string;
  musteri: string;
  /** YYYY-MM-DD */
  baslangic: string;
  /** YYYY-MM-DD */
  bitis: string;
  /** GEÇİCİ örnek veri: bağlantısı yok, tıklanınca bir yere gitmiyor. */
  ornek?: boolean;
};

export type GunKiralama = {
  id: string;
  urunAdi: string;
  musteri: string;
  ornek?: boolean;
};

export type Gun = {
  /** YYYY-MM-DD */
  tarih: string;
  baslayan: GunKiralama[];
  biten: GunKiralama[];
  /** O gün başlamayıp bitmeyen, arada süren kiralamalar. */
  kirada: GunKiralama[];
};

export function utc(tarih: string) {
  return new Date(`${tarih}T00:00:00Z`);
}

export function gunEkle(tarih: string, adet: number) {
  const gun = utc(tarih);
  gun.setUTCDate(gun.getUTCDate() + adet);
  return gun.toISOString().slice(0, 10);
}

/** `baslangic`'tan itibaren `adet` gün, her biri o günün kiralamalarıyla. */
export function gunleriOlustur(kiralamalar: TakvimKiralama[], baslangic: string, adet: number): Gun[] {
  const gunler: Gun[] = Array.from({ length: adet }, (_, i) => ({
    tarih: gunEkle(baslangic, i),
    baslayan: [],
    biten: [],
    kirada: [],
  }));
  const son = gunler[gunler.length - 1]?.tarih ?? baslangic;

  for (const k of kiralamalar) {
    if (k.bitis < baslangic || k.baslangic > son) continue;
    const oge: GunKiralama = { id: k.id, urunAdi: k.urunAdi, musteri: k.musteri, ornek: k.ornek };
    for (const gun of gunler) {
      if (gun.tarih === k.baslangic) gun.baslayan.push(oge);
      else if (gun.tarih === k.bitis) gun.biten.push(oge);
      else if (k.baslangic < gun.tarih && gun.tarih < k.bitis) gun.kirada.push(oge);
    }
  }
  return gunler;
}

const ORNEK_URUNLER = [
  "Gelinlik · Beyaz dantel",
  "Canon EOS R6",
  "Kamp çadırı 4 kişilik",
  "Abiye · Lacivert",
  "Elektrikli bisiklet",
  "Projeksiyon cihazı",
  "Smokin · Siyah",
  "DJI Mini drone",
];
const ORNEK_MUSTERILER = [
  "Elif Kaya",
  "Mert Demir",
  "Ayşe Yılmaz",
  "Can Öztürk",
  "Zeynep Arslan",
  "Burak Şahin",
  "Selin Aydın",
  "Emre Koç",
];
/** [bugünden kaç gün sonra başlıyor, kaç gün sürüyor] */
const ORNEK_ARALIKLAR: [number, number][] = [
  [-21, 6], [-13, 3], [-7, 5], [-3, 4], [-1, 2], [0, 3], [0, 1], [1, 2],
  [2, 6], [3, 3], [3, 1], [5, 4], [6, 2], [9, 3], [12, 1], [15, 5], [21, 2], [28, 4],
];

/**
 * GEÇİCİ — takvimin dolu hâlini görmek için sahte kiralamalar. Yalnızca
 * ekranda: veritabanına hiçbir şey yazılmıyor. Bugüne göre kurulduğu için her
 * gün aynı görünüyor.
 */
export function ornekKiralamalar(bugun: string): TakvimKiralama[] {
  return ORNEK_ARALIKLAR.map(([kaydir, sure], i) => {
    const baslangic = gunEkle(bugun, kaydir);
    return {
      id: `ornek-${i}`,
      urunAdi: ORNEK_URUNLER[i % ORNEK_URUNLER.length],
      musteri: ORNEK_MUSTERILER[(i * 3) % ORNEK_MUSTERILER.length],
      baslangic,
      bitis: gunEkle(baslangic, sure - 1),
      ornek: true,
    };
  });
}
