/**
 * Anasayfanın deneme seçenekleri.
 *
 * Kullanıcı logo, menü, bölüm imleci, hizmet görünümü ve metinler için birden
 * fazla tasarımı sitenin kendisinde görüp karar verecek. Seçim adres
 * çubuğunda duruyor (`?logo=L2&menu=N2…`): sayfa sunucuda o seçimle çiziliyor,
 * seçim paneli de yalnızca adresi değiştiriyor. Karar verildiğinde seçilmeyenler
 * ve bu dosya kalkacak.
 */

export const SECENEKLER = {
  logo: ["L1", "L2", "L3", "L4", "L5"],
  menu: ["N1", "N2", "N3", "N4"],
  imlec: ["I1", "I2", "I3", "I4"],
  hizmet: ["H1", "H2"],
  metin: ["eski", "yeni"],
} as const;

export type Secim = { [K in keyof typeof SECENEKLER]: (typeof SECENEKLER)[K][number] };

export const VARSAYILAN: Secim = { logo: "L1", menu: "N1", imlec: "I1", hizmet: "H2", metin: "yeni" };

export const ETIKETLER: { [K in keyof Secim]: { baslik: string; adlar: Record<Secim[K], string> } } = {
  logo: {
    baslik: "Logo",
    adlar: { L1: "Katlanmış şerit", L2: "Etiket V", L3: "QR modülleri", L4: "Sözcük logo", L5: "Kırmızı karo" },
  },
  menu: {
    baslik: "Menü",
    adlar: { N1: "Sade", N2: "Hizmet menülü", N3: "Çift katlı", N4: "Yüzen alt çubuk" },
  },
  imlec: {
    baslik: "Sağ kenar imleci",
    adlar: { I1: "Cetvel", I2: "Etiket sekmeleri", I3: "Sayaç ve liste", I4: "Mini harita" },
  },
  hizmet: { baslik: "Hizmetler", adlar: { H1: "Yana kayan şerit", H2: "Yelpaze (labs.google)" } },
  metin: { baslik: "Metinler", adlar: { eski: "Şimdiki", yeni: "Önerilen" } },
};

/**
 * Menünün kapladığı yükseklik; sayfa içeriği bunun altından başlıyor. Burada,
 * menünün kendi dosyasında değil: o dosya bir istemci bileşeni ve sunucu
 * tarafındaki sayfa ondan bir değer değil, yalnızca bileşen alabiliyor.
 */
export const MENU_BOSLUGU: Record<Secim["menu"], string> = {
  N1: "pt-20",
  N2: "pt-24",
  N3: "pt-28",
  N4: "pt-20",
};

export function secimiOku(params: Record<string, string | string[] | undefined>): Secim {
  const sonuc = { ...VARSAYILAN } as Record<string, string>;
  for (const anahtar of Object.keys(SECENEKLER) as (keyof Secim)[]) {
    const deger = params[anahtar];
    if (typeof deger === "string" && (SECENEKLER[anahtar] as readonly string[]).includes(deger)) {
      sonuc[anahtar] = deger;
    }
  }
  return sonuc as Secim;
}
