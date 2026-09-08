import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@/lib/supabase/server";
import { ara } from "@/lib/arama";
import { getOwnerCatalog, type CatalogProduct } from "@/lib/catalog";
import {
  computeOccupancySpan,
  datesInRange,
  firstSoldOutDate,
  nightsBetween,
  unitsLeftInRange,
} from "@/lib/bookings";
import { deliveryModeForCity, type Turnaround } from "@/lib/turnaround";
import { isDistrictOf, isProvince } from "@/lib/turkiye";

/**
 * Asistanın elleri.
 *
 * Modele veritabanı verilmiyor; şu dört fonksiyon veriliyor. Aradaki fark
 * güvenlik değil sadece — model SQL yazmadığı için okuyabileceği şeyin sınırını
 * biz çiziyoruz, ve her araç zaten panelin kendi kod yollarını çağırıyor. Yani
 * asistanın gördüğü müsaitlik, takvimin gösterdiği müsaitliğin ta kendisi;
 * ikinci bir hesap yok ki ikisi birbirinden ayrılabilsin.
 *
 * Yazma tarafı burada yok. `rezervasyon_olustur` bir *niyet* döndürüyor;
 * kaydı açan kod route'ta, kullanıcı onay kartına bastıktan sonra çalışıyor.
 */

/** Modelin bir seferde boğulmayacağı sonuç sayısı. */
const EN_FAZLA_SONUC = 8;

export const ARACLAR: Anthropic.Tool[] = [
  {
    name: "urun_ara",
    description:
      "Satıcının kataloğunda ürün arar. Kullanıcının bahsettiği her ürün için " +
      "önce bunu çağır — katalogda gerçekten ne olduğunu başka türlü bilemezsin. " +
      "Sorguyu kullanıcının kullandığı kelimelerle ver; arama sıraya ve eklere " +
      "duyarlı değildir. \"Hangi ürünlerim var\", \"kataloğumu göster\" gibi liste " +
      "istekleri için de bunu çağır, sorguyu boş dize bırak: bütün katalog döner. " +
      "Katalogda ne olduğunu bu araç dışında hiçbir yerden bilemezsin. Bu araç " +
      "yalnızca ürünün adını ve kimliğini verir; fiyat, teminat, stok ve " +
      "açıklama için urun_detay'ı çağır.",
    input_schema: {
      type: "object",
      properties: {
        sorgu: {
          type: "string",
          description: "Aranacak ürün adı, örneğin 'kırmızı gelinlik'.",
        },
      },
      required: ["sorgu"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "musaitlik_sorgula",
    description:
      "Bir ürünün verilen tarih aralığında kaç adedinin kiralanabilir olduğunu " +
      "söyler. Hesap kiralama günlerini değil ürünün fiilen elde olmadığı aralığı " +
      "kapsar: kargo ve temizlik süreleri dahildir. Rezervasyon önermeden önce " +
      "mutlaka çağır.",
    input_schema: {
      type: "object",
      properties: {
        urun_id: {
          type: "string",
          description: "urun_ara sonucundan gelen kimlik.",
        },
        baslangic: { type: "string", description: "YYYY-AA-GG" },
        bitis: { type: "string", description: "YYYY-AA-GG" },
        il: {
          type: "string",
          description:
            "Teslimatın yapılacağı il — biliniyorsa. Kargo mu elden mi olduğunu " +
            "belirler, o da ürünün kaç gün bloke kalacağını değiştirir. İSTEĞE " +
            "BAĞLI: kullanıcı il söylemediyse bu alanı hiç gönderme ve sorma da. " +
            "İlsiz sorguda kargo süresi varsayılır, yani en geniş bloke aralığı " +
            "hesaplanır; cevap yine anlamlıdır.",
        },
      },
      required: ["urun_id", "baslangic", "bitis"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "urun_detay",
    description:
      "Tek bir ürünün bütün bilgilerini kullanıcıya bir KART olarak gösterir: " +
      "görsel, günlük fiyat, teminat, stok, bugünkü müsaitlik, etiket numarası " +
      "ve açıklama. Kullanıcı bir ürünün bilgilerini, fiyatını, stoğunu ya da " +
      "detayını sorduğunda bunu çağır. Kartı kullanıcı görüyor, o yüzden " +
      "cevabında kartın içindekileri tek tek sayma — bir cümlede özetle.",
    input_schema: {
      type: "object",
      properties: {
        urun_id: { type: "string", description: "urun_ara sonucundan gelen kimlik." },
      },
      required: ["urun_id"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "musteri_ara",
    description:
      "Geçmiş rezervasyonlardaki müşterileri isme veya telefona göre arar. " +
      "Müşterinin daha önce verdiği adresi bulmak için kullanışlıdır. Kayıtlı " +
      "müşteri listesi diye ayrı bir şey yoktur; buradan dönenler geçmiş " +
      "rezervasyonlardan çıkarılmıştır.",
    input_schema: {
      type: "object",
      properties: {
        sorgu: { type: "string", description: "Müşteri adı veya telefon numarası." },
      },
      required: ["sorgu"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "rezervasyon_olustur",
    description:
      "Rezervasyon için bir onay kartı hazırlar. Bu araç kaydı AÇMAZ — kullanıcıya " +
      "özet gösterilir ve kaydı o onaylar. Zorunlu alanlar: ürün, adet, iki tarih, " +
      "müşteri adı, il, ilçe. Eksik olanı kullanıcıya sor, uydurma. Telefon ve " +
      "açık adres isteğe bağlı — verilmediyse sorma, kartı onlarsız çıkar.",
    input_schema: {
      type: "object",
      properties: {
        urun_id: { type: "string", description: "urun_ara sonucundan gelen kimlik." },
        adet: {
          type: "integer",
          description: "Kaç adet kiralanacak. Belirtilmediyse 1.",
        },
        baslangic: { type: "string", description: "YYYY-AA-GG" },
        bitis: { type: "string", description: "YYYY-AA-GG" },
        musteri_adi: { type: "string" },
        telefon: {
          type: "string",
          description:
            "Müşteri telefonu. İSTEĞE BAĞLI: kullanıcı söylemediyse bu alanı hiç " +
            "gönderme ve sorma da.",
        },
        il: { type: "string", description: "Teslimat ili. Zorunlu." },
        ilce: { type: "string", description: "Teslimat ilçesi. Zorunlu." },
        adres: {
          type: "string",
          description:
            "Açık adres (sokak, kapı no). İSTEĞE BAĞLI: kullanıcı söylemediyse bu " +
            "alanı hiç gönderme ve sorma da — il ve ilçe yeterli.",
        },
      },
      // Yalnızca gerçekten zorunlu olanlar burada. İsteğe bağlı bir alanı
      // `required` içine koyup "boş dize ver" demek işe yaramıyor: model boş
      // dize göndermek yerine kullanıcıya soruyor ve akış tıkanıyor.
      required: ["urun_id", "adet", "baslangic", "bitis", "musteri_adi", "il", "ilce"],
      additionalProperties: false,
    },
    strict: true,
  },
];

export type AracBaglami = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  turnaround: Turnaround;
  /**
   * Katalog istek başına bir kez okunuyor: bir rezervasyon konuşmasında üç
   * araç da aynı listeye bakıyor, üç kez sorgulamanın anlamı yok.
   */
  katalog: CatalogProduct[] | null;
};

async function katalogAl(baglam: AracBaglami): Promise<CatalogProduct[]> {
  if (!baglam.katalog) {
    baglam.katalog = await getOwnerCatalog(
      baglam.supabase,
      baglam.ownerId,
      baglam.turnaround
    );
  }
  return baglam.katalog;
}

/** Rezervasyon niyeti — onay kartının gösterdiği ve onaylandığında kaydedilen şey. */
export type RezervasyonPlani = {
  urun_id: string;
  urun_adi: string;
  adet: number;
  baslangic: string;
  bitis: string;
  gece: number;
  musteri_adi: string;
  telefon: string;
  il: string;
  ilce: string;
  adres: string;
  gunluk_fiyat: number | null;
  toplam: number | null;
  /** Ürünün fiilen kapanacağı aralık — kartta "kargo dahil" satırı için. */
  bloke_baslangic: string;
  bloke_bitis: string;
};

/**
 * Ürün kartı — kullanıcının gördüğü ürün künyesi.
 *
 * Modelin bu alanları cümle içinde tekrar etmesine gerek yok, hatta
 * istenmiyor: ölçümde Haiku 4.5 eline verilen listeyi doğru alıp adları
 * uydurabiliyor. Sayı ve ad gibi yanlış olması pahalı olan her şey buradan,
 * yani veritabanından doğrudan ekrana gidiyor; modelin payına yalnızca
 * bağlayıcı cümle kalıyor.
 */
export type UrunKarti = {
  id: string;
  ad: string;
  aciklama: string | null;
  ozellikler: string[];
  gorsel: string | null;
  gunluk_fiyat: number | null;
  teminat: number | null;
  stok: number;
  /** Bugün itibarıyla kaç adedi elde. */
  bugun_musait: number;
  etiket: string | null;
};

/** Aracın sonucu: modele dönen metin, ve gerekiyorsa kullanıcıya çıkan bir görsel. */
export type AracSonucu =
  | { tip: "metin"; metin: string }
  | { tip: "plan"; plan: RezervasyonPlani; metin: string }
  | { tip: "kart"; kart: UrunKarti; metin: string };

const GUN_BICIMI = /^\d{4}-\d{2}-\d{2}$/;

function gunGecerli(gun: unknown): gun is string {
  if (typeof gun !== "string" || !GUN_BICIMI.test(gun)) return false;
  // `2025-02-31` biçime uyar ama gün değildir; Date onu 3 Mart'a kaydırır, o
  // yüzden geri çevirip aynı yazıyı verip vermediğine bakılıyor.
  const tarih = new Date(gun + "T00:00:00Z");
  return !Number.isNaN(tarih.getTime()) && tarih.toISOString().slice(0, 10) === gun;
}

function metin(deger: unknown): string {
  return typeof deger === "string" ? deger.trim() : "";
}

/**
 * Bir araç çağrısını çalıştırır.
 *
 * Hiçbir dalda istisna fırlatılmıyor: modele dönen her şey metin, hata mesajları
 * dahil. Fırlatılan bir hata sohbeti komple düşürürdü; oysa "böyle bir ürün yok"
 * modelin toparlayabileceği bir cevap.
 */
export async function aracCalistir(
  ad: string,
  girdi: Record<string, unknown>,
  baglam: AracBaglami
): Promise<AracSonucu> {
  switch (ad) {
    case "urun_ara":
      return urunAra(metin(girdi.sorgu), baglam);
    case "musaitlik_sorgula":
      return musaitlikSorgula(girdi, baglam);
    case "urun_detay":
      return urunDetay(metin(girdi.urun_id), baglam);
    case "musteri_ara":
      return musteriAra(metin(girdi.sorgu), baglam);
    case "rezervasyon_olustur":
      return rezervasyonPlanla(girdi, baglam);
    default:
      return { tip: "metin", metin: `Bilinmeyen araç: ${ad}` };
  }
}

// ---------------------------------------------------------------------------

async function urunAra(sorgu: string, baglam: AracBaglami): Promise<AracSonucu> {
  const katalog = await katalogAl(baglam);

  if (katalog.length === 0) {
    return { tip: "metin", metin: "Katalogda hiç ürün yok." };
  }

  const bulunan = ara(katalog, sorgu, (urun) => [urun.name]).slice(0, EN_FAZLA_SONUC);

  if (bulunan.length === 0) {
    return {
      tip: "metin",
      metin: `"${sorgu}" ile eşleşen ürün yok. Katalogda ${katalog.length} ürün var.`,
    };
  }

  const satirlar = bulunan.map((urun) =>
    [
      `id: ${urun.id}`,
      `ad: ${urun.name}`,
      `stok: ${urun.stock}`,
      `gunluk_fiyat: ${urun.dailyPrice ?? "belirtilmemis"}`,
    ].join(" | ")
  );

  return { tip: "metin", metin: satirlar.join("\n") };
}

// ---------------------------------------------------------------------------

async function musaitlikSorgula(
  girdi: Record<string, unknown>,
  baglam: AracBaglami
): Promise<AracSonucu> {
  const urunId = metin(girdi.urun_id);
  const baslangic = metin(girdi.baslangic);
  const bitis = metin(girdi.bitis);
  const il = metin(girdi.il);

  if (!gunGecerli(baslangic) || !gunGecerli(bitis)) {
    return { tip: "metin", metin: "Tarihler YYYY-AA-GG biçiminde olmalı." };
  }
  if (bitis < baslangic) {
    return { tip: "metin", metin: "Bitiş tarihi başlangıçtan önce olamaz." };
  }

  const katalog = await katalogAl(baglam);
  const urun = katalog.find((kayit) => kayit.id === urunId);
  if (!urun) {
    return { tip: "metin", metin: "Bu kimlikte bir ürün yok. Önce urun_ara ile bul." };
  }

  // Sorulan şey kiralama aralığı, ama ürünü kapatan aralık ondan geniş: ilden
  // türetilen teslimat şekline göre kargo ve temizlik günleri ekleniyor. Takvim
  // de tam olarak bunu yapıyor.
  const mod = deliveryModeForCity(il || null);
  const bloke = computeOccupancySpan(baslangic, bitis, mod, baglam.turnaround);

  const kalan = unitsLeftInRange(
    urun.availability.occupied,
    urun.stock,
    bloke.start_date,
    bloke.end_date
  );

  if (kalan > 0) {
    return {
      tip: "metin",
      metin:
        `${urun.name}: ${baslangic} - ${bitis} arası ${kalan} adet müsait ` +
        `(stok ${urun.stock}). Ürün ${bloke.start_date} - ${bloke.end_date} ` +
        `arası bloke olur, kargo ve hazırlık dahil.`,
    };
  }

  const doluGun = firstSoldOutDate(
    urun.availability.occupied,
    urun.stock,
    bloke.start_date,
    bloke.end_date
  );

  // Boşalacağı ilk günü söylemek, kullanıcının yeni tarih önerebilmesi için
  // "dolu"dan çok daha işe yarar bir cevap.
  const ilkBos = doluGun
    ? datesInRange(doluGun, addGun(bloke.end_date, 60)).find(
        (gun) => (urun.availability.occupied[gun] ?? 0) < urun.stock
      )
    : null;

  return {
    tip: "metin",
    metin:
      `${urun.name}: bu tarihlerde müsait değil.` +
      (doluGun ? ` İlk dolu gün ${doluGun}.` : "") +
      (ilkBos ? ` ${ilkBos} tarihinden itibaren tekrar boş.` : ""),
  };
}

/** Yerel gün aritmetiği — `addDays` bookings.ts'te ama burada 60 günlük tarama için. */
function addGun(gun: string, adet: number): string {
  const tarih = new Date(gun + "T00:00:00Z");
  tarih.setUTCDate(tarih.getUTCDate() + adet);
  return tarih.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------

type MusteriSatiri = {
  customer_name: string;
  customer_phone: string | null;
  customer_city: string | null;
  customer_district: string | null;
  customer_address: string | null;
  start_date: string;
};

/**
 * Bir ürünün künyesini kart olarak hazırlar.
 *
 * Katalog sorgusu (`getOwnerCatalog`) yalnızca ad, stok, fiyat ve müsaitlik
 * getiriyor — seçici için gereken bu. Kartın istediği açıklama, görsel, teminat
 * ve etiket numarası orada yok, o yüzden ürün satırı ayrıca okunuyor. Sorgu
 * yine oturumun anahtarıyla gidiyor: `products_select_own` politikası satırı
 * zaten sahibiyle sınırlıyor, `owner_id` koşulu da hata mesajının "yetkin yok"
 * yerine "böyle bir ürün yok" olması için.
 */
async function urunDetay(urunId: string, baglam: AracBaglami): Promise<AracSonucu> {
  const katalog = await katalogAl(baglam);
  const ozet = katalog.find((kayit) => kayit.id === urunId);
  if (!ozet) {
    return { tip: "metin", metin: "Bu kimlikte bir ürün yok. Önce urun_ara ile bul." };
  }

  const { data, error } = await baglam.supabase
    .from("products")
    .select("description, features, images, deposit_price, barcode")
    .eq("id", urunId)
    .eq("owner_id", baglam.ownerId)
    .maybeSingle();

  if (error) return { tip: "metin", metin: "Ürün bilgileri okunamadı." };

  const satir = (data ?? {}) as {
    description?: string | null;
    features?: string[] | null;
    images?: string[] | null;
    deposit_price?: number | string | null;
    barcode?: string | null;
  };

  const bugun = new Date();
  const bugunIso = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(bugun.getDate()).padStart(2, "0")}`;

  const kart: UrunKarti = {
    id: ozet.id,
    ad: ozet.name,
    aciklama: satir.description?.trim() || null,
    ozellikler: (satir.features ?? []).filter((o) => typeof o === "string" && o.trim()),
    gorsel: satir.images?.[0] ?? null,
    gunluk_fiyat: ozet.dailyPrice,
    teminat: satir.deposit_price === null || satir.deposit_price === undefined
      ? null
      : Number(satir.deposit_price),
    stok: ozet.stock,
    bugun_musait: unitsLeftInRange(
      ozet.availability.occupied,
      ozet.stock,
      bugunIso,
      bugunIso
    ),
    etiket: satir.barcode?.trim() || null,
  };

  // Modele dönen metin kartın kopyası değil özeti: kartı kullanıcı zaten
  // görüyor, modelin işi onu tekrar okumak değil bağlayıcı cümleyi kurmak.
  return {
    tip: "kart",
    kart,
    metin:
      `"${kart.ad}" kartı kullanıcıya gösterildi. Stok ${kart.stok}, bugün ` +
      `${kart.bugun_musait} adet müsait, günlük fiyat ` +
      `${kart.gunluk_fiyat ?? "belirtilmemiş"}, teminat ` +
      `${kart.teminat ?? "yok"}. Kullanıcı belirli bir şey sorduysa (fiyat, ` +
      `teminat, stok) onu tek cümlede rakamla söyle; sormadıysa kartın ` +
      `tamamını okuma, bir sonraki adımı sor.`,
  };
}

async function musteriAra(sorgu: string, baglam: AracBaglami): Promise<AracSonucu> {
  if (!sorgu) {
    return { tip: "metin", metin: "Aranacak bir isim ya da telefon gerekli." };
  }

  // Müşteri diye bir tablo yok — kimlik rezervasyonların içinde duruyor
  // (bkz. lib/customers.ts). En yeni kayıtlar önce, çünkü adres en son
  // verilendir.
  const { data, error } = await baglam.supabase
    .from("bookings")
    .select(
      "customer_name, customer_phone, customer_city, customer_district, customer_address, start_date, products!inner(owner_id)"
    )
    .eq("products.owner_id", baglam.ownerId)
    .order("start_date", { ascending: false })
    .limit(300);

  if (error) {
    return { tip: "metin", metin: "Müşteri kayıtları okunamadı." };
  }

  const satirlar = (data ?? []) as unknown as MusteriSatiri[];

  // Aynı kişinin birden çok rezervasyonu var; ada göre teke indiriliyor ve en
  // yeni kayıt kazanıyor.
  const teklestirilmis = new Map<string, MusteriSatiri>();
  for (const satir of satirlar) {
    const anahtar = satir.customer_name.toLocaleLowerCase("tr-TR").trim();
    if (!teklestirilmis.has(anahtar)) teklestirilmis.set(anahtar, satir);
  }

  const bulunan = ara([...teklestirilmis.values()], sorgu, (musteri) => [
    musteri.customer_name,
    musteri.customer_phone,
  ]).slice(0, EN_FAZLA_SONUC);

  if (bulunan.length === 0) {
    return { tip: "metin", metin: `"${sorgu}" ile eşleşen geçmiş müşteri yok.` };
  }

  return {
    tip: "metin",
    metin: bulunan
      .map((musteri) =>
        [
          `ad: ${musteri.customer_name}`,
          `telefon: ${musteri.customer_phone ?? "yok"}`,
          `il: ${musteri.customer_city ?? "yok"}`,
          `ilce: ${musteri.customer_district ?? "yok"}`,
          `adres: ${musteri.customer_address ?? "yok"}`,
          `son_kiralama: ${musteri.start_date}`,
        ].join(" | ")
      )
      .join("\n"),
  };
}

// ---------------------------------------------------------------------------

/**
 * Rezervasyon niyetini doğrular ve onay kartına dönüştürür.
 *
 * Buradaki kontroller kaydı açan kontroller *değil* — o iş `createBooking`'de ve
 * onay verildiğinde baştan yapılıyor. Bunlar kullanıcıya gösterilecek kartın
 * doğru olması için: eksik ilçeyi kart basıldıktan sonra fark etmek, modele
 * hemen söylemekten kötü.
 */
async function rezervasyonPlanla(
  girdi: Record<string, unknown>,
  baglam: AracBaglami
): Promise<AracSonucu> {
  const urunId = metin(girdi.urun_id);
  const baslangic = metin(girdi.baslangic);
  const bitis = metin(girdi.bitis);
  const musteriAdi = metin(girdi.musteri_adi);
  const il = metin(girdi.il);
  const ilce = metin(girdi.ilce);
  const adres = metin(girdi.adres);
  const telefon = metin(girdi.telefon);

  const adetHam = Math.trunc(Number(girdi.adet ?? 1));
  const adet = Number.isFinite(adetHam) && adetHam >= 1 ? adetHam : 1;

  if (!musteriAdi) return { tip: "metin", metin: "Müşteri adı eksik, kullanıcıya sor." };
  if (!gunGecerli(baslangic) || !gunGecerli(bitis)) {
    return { tip: "metin", metin: "Tarihler YYYY-AA-GG biçiminde olmalı." };
  }
  if (bitis < baslangic) {
    return { tip: "metin", metin: "Bitiş tarihi başlangıçtan önce olamaz." };
  }
  if (!il) return { tip: "metin", metin: "İl eksik, kullanıcıya sor." };
  if (!isProvince(il)) {
    return { tip: "metin", metin: `"${il}" bir il değil. Doğru ili kullanıcıya sor.` };
  }
  if (!ilce) return { tip: "metin", metin: "İlçe eksik, kullanıcıya sor." };
  if (!isDistrictOf(il, ilce)) {
    return {
      tip: "metin",
      metin: `"${ilce}", ${il} iline ait bir ilçe değil. Doğru ilçeyi kullanıcıya sor.`,
    };
  }

  const katalog = await katalogAl(baglam);
  const urun = katalog.find((kayit) => kayit.id === urunId);
  if (!urun) {
    return { tip: "metin", metin: "Bu kimlikte bir ürün yok. Önce urun_ara ile bul." };
  }

  const mod = deliveryModeForCity(il);
  const bloke = computeOccupancySpan(baslangic, bitis, mod, baglam.turnaround);

  const kalan = unitsLeftInRange(
    urun.availability.occupied,
    urun.stock,
    bloke.start_date,
    bloke.end_date
  );

  if (kalan < adet) {
    return {
      tip: "metin",
      metin:
        `${urun.name} bu tarihlerde ${adet} adet müsait değil; ${kalan} adet kaldı. ` +
        `Kartı gösterme, kullanıcıya durumu söyle.`,
    };
  }

  const gece = nightsBetween(baslangic, bitis);
  const gunSayisi = gece + 1;

  const plan: RezervasyonPlani = {
    urun_id: urun.id,
    urun_adi: urun.name,
    adet,
    baslangic,
    bitis,
    gece,
    musteri_adi: musteriAdi,
    telefon,
    il,
    ilce,
    adres,
    gunluk_fiyat: urun.dailyPrice,
    toplam: urun.dailyPrice === null ? null : urun.dailyPrice * gunSayisi * adet,
    bloke_baslangic: bloke.start_date,
    bloke_bitis: bloke.end_date,
  };

  return {
    tip: "plan",
    plan,
    // Modele dönen metin: kartın kullanıcıya gösterildiğini bilmeli ki "kaydı
    // açtım" demesin.
    metin:
      `Onay kartı kullanıcıya gösterildi: ${urun.name}, ${adet} adet, ` +
      `${baslangic} - ${bitis}, ${musteriAdi}, ${ilce}/${il}. ` +
      `Kayıt henüz açılmadı; kullanıcı onaylayacak.`,
  };
}
