import { PROVINCES } from "@/lib/turkiye";
import { sadelestir } from "@/lib/instagram/harf";

/**
 * "bursa nilüfer", "Bursa / Nilüfer", "nilufer/bursa" → il ve ilçe.
 *
 * Serbest metinden il ve ilçeye inmek zorundayız, çünkü teslimat şekli (kargo
 * mu elden mi) ilden çıkıyor ve ürünün kaç gün kapanacağını o belirliyor —
 * yani il yanlışsa takvim yanlış olur. Bu yüzden burada tahmin yok: yalnızca
 * resmi listedeki adlar kabul ediliyor (bkz. lib/turkiye.ts), eşleşme yoksa
 * müşteriye tekrar soruluyor.
 *
 * Dönen adlar her zaman kanonik yazımıyla ("Nilüfer"), müşterinin yazdığı
 * biçimde değil: `bookings` tablosuna giren değerle panelin seçim listesindeki
 * değer aynı olmak zorunda.
 */

export type AdresSonucu =
  | { il: string; ilce: string }
  | { il: string; ilce: null }
  | null;

/** İl adları uzunluğa göre: "Afyonkarahisar" önce denensin, "Afyon" yutmasın. */
const ILLER = [...PROVINCES]
  .map((il) => ({ ad: il.name, sade: sadelestir(il.name), ilceler: il.districts }))
  .sort((a, b) => b.sade.length - a.sade.length);

/** Sözcük sınırında geçiyor mu — "van" ararken "vanilya"ya takılmayalım. */
function iceriyor(metin: string, parca: string): boolean {
  const index = metin.indexOf(parca);
  if (index === -1) return false;

  const onceki = metin[index - 1];
  const sonraki = metin[index + parca.length];
  const harf = /[a-z0-9]/;

  return !(onceki && harf.test(onceki)) && !(sonraki && harf.test(sonraki));
}

export function adresOku(ham: string): AdresSonucu {
  const metin = sadelestir(ham).replace(/[/,\-–|]+/g, " ").replace(/\s+/g, " ");
  if (!metin) return null;

  const il = ILLER.find((aday) => iceriyor(metin, aday.sade));
  if (!il) return null;

  // İl adı metinden çıkarılıyor: "Merkez" gibi ilçe adları il adının kendisiyle
  // karışmasın, "Bursa Bursa" gibi tekrarlar da sorun çıkarmasın.
  const kalan = metin.replace(il.sade, " ").replace(/\s+/g, " ").trim();

  if (kalan) {
    const ilceler = [...il.ilceler].sort((a, b) => b.length - a.length);
    const ilce = ilceler.find((aday) => iceriyor(kalan, sadelestir(aday)));
    if (ilce) return { il: il.ad, ilce };
  }

  return { il: il.ad, ilce: null };
}

/**
 * İl belliyken yalnızca ilçe arar — müşteriye "ilçeyi de yazar mısınız?" diye
 * sorduğumuzda gelen cevap için.
 */
export function ilceOku(il: string, ham: string): string | null {
  const metin = sadelestir(ham).replace(/[/,\-–|]+/g, " ").replace(/\s+/g, " ");
  if (!metin) return null;

  const ilceler = PROVINCES.find((aday) => aday.name === il)?.districts ?? [];

  return (
    [...ilceler]
      .sort((a, b) => b.length - a.length)
      .find((aday) => iceriyor(metin, sadelestir(aday))) ?? null
  );
}
