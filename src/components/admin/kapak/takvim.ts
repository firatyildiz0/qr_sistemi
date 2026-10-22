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
};

export type GunKiralama = {
  id: string;
  urunAdi: string;
  musteri: string;
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
    const oge: GunKiralama = { id: k.id, urunAdi: k.urunAdi, musteri: k.musteri };
    for (const gun of gunler) {
      if (gun.tarih === k.baslangic) gun.baslayan.push(oge);
      else if (gun.tarih === k.bitis) gun.biten.push(oge);
      else if (k.baslangic < gun.tarih && gun.tarih < k.bitis) gun.kirada.push(oge);
    }
  }
  return gunler;
}
