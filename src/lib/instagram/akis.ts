import { MAX_BOOKING_ITEMS, MAX_ITEM_QUANTITY } from "@/lib/bookings";
import { deliveryModeForCity } from "@/lib/turnaround";
import { adresOku, ilceOku } from "@/lib/instagram/adres";
import { sadelestir } from "@/lib/instagram/harf";
import type { HizliCevap, UrunKarti } from "@/lib/instagram/graph";
import * as metin from "@/lib/instagram/metin";
import { tarihOku } from "@/lib/instagram/tarih";
import type { Adim, BagliHesap, Konusma, Taslak, TaslakUrun } from "@/lib/instagram/tipler";
import {
  cakismaBul,
  enGenisAralik,
  konusmaBul,
  konusmaYaz,
  surelerOku,
  talepAraligi,
  talepOlustur,
  urunBul,
  type adminIstemci,
} from "@/lib/instagram/veri";

/**
 * Sohbetin beyni: gelen mesaj, konuşmanın o anki adımı, ve dışarı çıkan cevap.
 *
 * Akış bilerek bir durum makinesi — serbest bir sohbet değil. Sebep şu: bu
 * konuşmanın sonunda gerçek bir takvim kapanıyor. Müşterinin "bir de şu olsun,
 * aslında 15'i değil 16'sı" demesini serbest metinden çıkarmaya çalışsaydık,
 * yanlış anlaşılan her cümle satıcının stoğunda yanlış bir gün olurdu. Bunun
 * yerine her adım tek bir şey soruyor, anlamadığında tekrar soruyor, ve
 * anladığı her şeyi onay ekranında müşteriye geri okutuyor.
 *
 * Müsaitlik iki kez kontrol ediliyor — tarih girildiğinde ve onay anında.
 * İkincisi şart: aradan geçen sürede satıcı panelden başka bir rezervasyon
 * açmış olabilir ve müşteriye verilmiş söz o anda geçersizleşir.
 */

/**
 * Tek bir cevap. `kart` varsa metinden *önce* gönderiliyor: fotoğraf gelir,
 * altında ne yapılacağını söyleyen mesaj durur.
 */
export type Cevap = { metin: string; hizli?: HizliCevap[]; kart?: UrunKarti };

export type AkisSonucu = {
  adim: Adim;
  taslak: Taslak;
  cevaplar: Cevap[];
  /** Talep açıldıysa kimliği — webhook bunu kayda düşüyor. */
  talepId?: string;
  /** Konuşma bu mesajla açıldıysa: karşılama mesajı buna göre ekleniyor. */
  yeni?: boolean;
};

type Db = ReturnType<typeof adminIstemci>;

const IPTAL_SOZLERI = new Set([
  "iptal",
  "vazgec",
  "vazgectim",
  "bastan",
  "basa don",
  "sifirla",
  "yeni",
  "yeniden",
  "yeni rezervasyon",
]);

const DEVAM_SOZLERI = new Set(["devam", "devam et", "tamam", "bitti", "hepsi bu", "yeter"]);
const EVET_SOZLERI = new Set(["evet", "onayliyorum", "onay", "onayla", "olur", "tamamdir", "kabul"]);
const HAYIR_SOZLERI = new Set(["hayir", "yok", "olmaz", "istemiyorum"]);
const ATLA_SOZLERI = new Set(["atla", "gec", "yok", "telefonum yok", "-"]);
const YARDIM_SOZLERI = new Set(["yardim", "yardım", "help", "nasil", "nasıl"]);

/** Ürün kodunun veritabanındaki şekli (`products_barcode_shape`) ile aynı. */
const KOD_DESENI = /[A-Za-z0-9][A-Za-z0-9._/-]{0,31}/g;
/** Bir mesajda kaç kod aranacağı; her aday bir sorgu demek. */
const MAX_KOD_ADAYI = 5;

/**
 * Mesajdaki kod adayları ve yanlarındaki adet.
 *
 * "104523 x2, A-14" gibi bir mesaj tek seferde iki kalem ekleyebiliyor —
 * müşteriyi ürün başına bir tur mesajlaşmaya zorlamamak için. Adaylar
 * veritabanında aranıyor, yani "merhaba" gibi bir kelime kod sanılsa bile
 * yalnızca sonuçsuz bir sorgu oluyor.
 */
export function kodlariBul(ham: string): { kod: string; adet: number }[] {
  const adaylar: { kod: string; adet: number }[] = [];
  const parcalar = ham.split(/[,\n;]+/);

  for (const parca of parcalar) {
    const adetEslesme = parca.match(/[x×*]\s*(\d{1,2})\b/i);
    const adet = adetEslesme ? Math.min(Number(adetEslesme[1]), MAX_ITEM_QUANTITY) : 1;
    // Adet eki koddan ayrılıyor, yoksa "104523x2" tek bir kod sanılırdı.
    const kodlar = parca.replace(/[x×*]\s*\d{1,2}\b/i, " ").match(KOD_DESENI) ?? [];

    for (const kod of kodlar) {
      if (adaylar.length >= MAX_KOD_ADAYI) return adaylar;
      adaylar.push({ kod, adet: Math.max(1, adet) });
    }
  }

  return adaylar;
}

/** "0555 123 45 67" — panelde ve aramalarda tek biçim görünsün diye. */
export function telefonOku(ham: string): string | null {
  const rakamlar = ham.replace(/\D/g, "");
  const yerel = rakamlar.startsWith("90")
    ? rakamlar.slice(2)
    : rakamlar.startsWith("0")
      ? rakamlar.slice(1)
      : rakamlar;

  if (yerel.length !== 10) return null;

  return `0${yerel.slice(0, 3)} ${yerel.slice(3, 6)} ${yerel.slice(6, 8)} ${yerel.slice(8)}`;
}

function adGecerli(ad: string): boolean {
  return ad.length >= 2 && ad.length <= 60 && /\p{L}{2}/u.test(ad);
}

function sonuc(adim: Adim, taslak: Taslak, ...cevaplar: Cevap[]): AkisSonucu {
  return { adim, taslak, cevaplar };
}

/**
 * Bir mesajın tamamı: hangi adımda olduğumuza bakılır, cevap üretilir, yeni
 * durum döndürülür. Yazma işini çağıran taraf yapıyor (bkz. `mesajiIsle`),
 * çünkü yazma başarısız olursa mesajın baştan değerlendirilmesi gerekiyor.
 */
async function adimIsle(
  db: Db,
  hesap: BagliHesap,
  konusma: Konusma,
  ham: string
): Promise<AkisSonucu> {
  const taslak = konusma.taslak;
  const komut = sadelestir(ham);

  if (YARDIM_SOZLERI.has(komut)) {
    return sonuc(konusma.adim, taslak, { metin: metin.YARDIM });
  }

  // "iptal" her adımda geçerli — müşteri yanlış bir yere saplandığında çıkış
  // yolu hep aynı cümle olmalı.
  if (IPTAL_SOZLERI.has(komut)) {
    return sonuc("kod", { urunler: [] }, { metin: metin.IPTAL_EDILDI });
  }

  switch (konusma.adim) {
    case "kod":
      return kodAdimi(db, hesap, taslak, ham, komut);
    case "tarih":
      return tarihAdimi(db, hesap, taslak, ham);
    case "ad":
      return adAdimi(taslak, ham);
    case "telefon":
      return telefonAdimi(taslak, ham, komut);
    case "adres":
      return adresAdimi(taslak, ham);
    case "onay":
      return onayAdimi(db, hesap, konusma, taslak, komut);
    case "bekliyor":
      return sonuc("bekliyor", taslak, {
        metin: metin.BEKLIYOR,
        hizli: metin.HIZLI_YENI,
      });
  }
}

async function kodAdimi(
  db: Db,
  hesap: BagliHesap,
  taslak: Taslak,
  ham: string,
  komut: string
): Promise<AkisSonucu> {
  if (DEVAM_SOZLERI.has(komut) && taslak.urunler.length > 0) {
    return sonuc("tarih", taslak, { metin: metin.TARIH_ISTE });
  }

  const adaylar = kodlariBul(ham);
  if (adaylar.length === 0) {
    return sonuc("kod", taslak, { metin: metin.KOD_ISTE });
  }

  const urunler = [...taslak.urunler];
  const bulunamayanlar: string[] = [];
  const stoksuzlar: string[] = [];
  let sonEklenen: TaslakUrun | null = null;

  for (const aday of adaylar) {
    const urun = await urunBul(db, hesap.ownerId, aday.kod);

    if (!urun) {
      bulunamayanlar.push(aday.kod);
      continue;
    }

    if (urun.stok <= 0) {
      stoksuzlar.push(urun.ad);
      continue;
    }

    const mevcut = urunler.find((secili) => secili.id === urun.id);

    if (mevcut) {
      // Aynı ürün ikinci kez yazıldıysa adet artıyor; iki ayrı kalem
      // göstermek toplu talepte yanıltıcı olurdu (bkz. `readItems`).
      mevcut.adet = Math.min(mevcut.adet + aday.adet, MAX_ITEM_QUANTITY, urun.stok);
      sonEklenen = mevcut;
    } else if (urunler.length >= MAX_BOOKING_ITEMS) {
      bulunamayanlar.push(aday.kod);
    } else {
      const eklenen = { ...urun, adet: Math.min(aday.adet, MAX_ITEM_QUANTITY, urun.stok) };
      urunler.push(eklenen);
      sonEklenen = eklenen;
    }
  }

  const yeniTaslak: Taslak = { ...taslak, urunler };
  const cevaplar: Cevap[] = [];

  for (const ad of stoksuzlar) cevaplar.push({ metin: metin.kodStoktaYok(ad) });

  if (sonEklenen) {
    if (bulunamayanlar.length > 0) {
      cevaplar.push({ metin: metin.kodBulunamadi(bulunamayanlar[0]) });
    }
    cevaplar.push({
      metin: metin.urunEklendi(sonEklenen, yeniTaslak),
      hizli: metin.HIZLI_DEVAM,
      // Görseli olmayan üründe kart yok; mesaj yine tek başına yeterli.
      kart: metin.urunKarti(sonEklenen) ?? undefined,
    });
    return sonuc("kod", yeniTaslak, ...cevaplar);
  }

  // Hiçbir şey bulunamadı. Mesajda rakam yoksa bu bir kod denemesi bile
  // değildir — "merhaba", "gelinlik kiralamak istiyorum" gibi bir cümledir ve
  // ona "104523 koduna ait ürün bulamadım" demek anlamsız olurdu. Kodlar da
  // çoğunlukla numaradır (bkz. `allocate_product_barcode`), o yüzden ayrım
  // rakamdan geçiyor: sorgu yine yapılıyor, yalnızca hata cümlesi değişiyor.
  if (bulunamayanlar.length > 0 && /\d/.test(ham)) {
    cevaplar.push({ metin: metin.kodBulunamadi(bulunamayanlar[0]) });
  } else if (cevaplar.length === 0) {
    cevaplar.push({ metin: metin.KOD_ISTE });
  }

  return sonuc("kod", yeniTaslak, ...cevaplar);
}

async function tarihAdimi(
  db: Db,
  hesap: BagliHesap,
  taslak: Taslak,
  ham: string
): Promise<AkisSonucu> {
  const okunan = tarihOku(ham);

  if ("hata" in okunan) {
    return sonuc("tarih", taslak, {
      metin: metin.TARIH_HATALARI[okunan.hata] ?? metin.TARIH_ISTE,
    });
  }

  const sureler = await surelerOku(db, hesap.ownerId);
  // Teslimat şekli henüz bilinmiyor (il sonra soruluyor), o yüzden en geniş
  // aralık: müşteriye "boş" deyip sonra "dolu" demektense, tersini yapıyoruz.
  const aralik = enGenisAralik(okunan.baslangic, okunan.bitis, sureler);
  const cakisma = await cakismaBul(db, taslak.urunler, aralik);

  if (cakisma) {
    return sonuc("tarih", taslak, {
      metin: metin.tarihDolu(cakisma.urun.ad, cakisma.gun, taslak.urunler.length === 1),
    });
  }

  return sonuc(
    "ad",
    { ...taslak, baslangic: okunan.baslangic, bitis: okunan.bitis },
    { metin: metin.AD_ISTE }
  );
}

function adAdimi(taslak: Taslak, ham: string): AkisSonucu {
  const ad = ham.trim().replace(/\s+/g, " ");

  if (!adGecerli(ad)) {
    return sonuc("ad", taslak, { metin: metin.AD_HATALI });
  }

  return sonuc("telefon", { ...taslak, ad }, {
    metin: metin.TELEFON_ISTE,
    hizli: metin.HIZLI_ATLA,
  });
}

function telefonAdimi(taslak: Taslak, ham: string, komut: string): AkisSonucu {
  if (ATLA_SOZLERI.has(komut)) {
    return sonuc("adres", { ...taslak, telefon: null }, { metin: metin.ADRES_ISTE });
  }

  const telefon = telefonOku(ham);
  if (!telefon) {
    return sonuc("telefon", taslak, {
      metin: metin.TELEFON_HATALI,
      hizli: metin.HIZLI_ATLA,
    });
  }

  return sonuc("adres", { ...taslak, telefon }, { metin: metin.ADRES_ISTE });
}

function adresAdimi(taslak: Taslak, ham: string): AkisSonucu {
  // İl bir önceki mesajda anlaşıldıysa artık yalnızca ilçe aranıyor: "Merkez"
  // tek başına anlamlı bir cevap ve il olmadan hiçbir listede bulunmaz.
  if (taslak.il) {
    const ilce = ilceOku(taslak.il, ham);
    if (!ilce) {
      return sonuc("adres", taslak, { metin: metin.ilceIste(taslak.il) });
    }
    return ozetAdimi({ ...taslak, ilce });
  }

  const okunan = adresOku(ham);

  if (!okunan) {
    return sonuc("adres", taslak, { metin: metin.ADRES_HATALI });
  }

  if (!okunan.ilce) {
    return sonuc("adres", { ...taslak, il: okunan.il }, { metin: metin.ilceIste(okunan.il) });
  }

  return ozetAdimi({ ...taslak, il: okunan.il, ilce: okunan.ilce });
}

function ozetAdimi(taslak: Taslak): AkisSonucu {
  const kargoMu = deliveryModeForCity(taslak.il) === "kargo";

  return sonuc("onay", taslak, {
    metin: metin.ozet(taslak, kargoMu),
    hizli: metin.HIZLI_ONAY,
  });
}

async function onayAdimi(
  db: Db,
  hesap: BagliHesap,
  konusma: Konusma,
  taslak: Taslak,
  komut: string
): Promise<AkisSonucu> {
  if (HAYIR_SOZLERI.has(komut)) {
    return sonuc("kod", { urunler: [] }, { metin: metin.IPTAL_EDILDI });
  }

  if (!EVET_SOZLERI.has(komut)) {
    return sonuc("onay", taslak, {
      metin: metin.ozet(taslak, deliveryModeForCity(taslak.il) === "kargo"),
      hizli: metin.HIZLI_ONAY,
    });
  }

  if (
    !taslak.baslangic ||
    !taslak.bitis ||
    !taslak.ad ||
    !taslak.il ||
    !taslak.ilce ||
    taslak.urunler.length === 0
  ) {
    // Buraya normalde gelinmez; gelinirse eldeki bilgi eksik demektir ve
    // yarım bir talep açmaktansa baştan başlamak doğru.
    return sonuc("kod", { urunler: [] }, { metin: metin.IPTAL_EDILDI });
  }

  const sureler = await surelerOku(db, hesap.ownerId);
  const aralik = talepAraligi(taslak.baslangic, taslak.bitis, taslak.il, sureler);

  // Son kontrol, gerçek aralıkla. Sohbet başladığından beri satıcı panelden
  // başka bir rezervasyon açmış olabilir; talebi yine de kaydetseydik satıcı
  // onaylayamayacağı bir talebi onaylamaya çalışırdı.
  const cakisma = await cakismaBul(db, taslak.urunler, {
    start_date: aralik.blockedStart,
    end_date: aralik.blockedEnd,
  });

  if (cakisma) {
    return sonuc("tarih", taslak, {
      metin: metin.tarihDolu(cakisma.urun.ad, cakisma.gun, taslak.urunler.length === 1),
    });
  }

  const talep = await talepOlustur(db, {
    ownerId: hesap.ownerId,
    threadId: konusma.id,
    senderId: konusma.senderId,
    taslak,
    aralik,
  });

  if ("hata" in talep) {
    return sonuc("onay", taslak, {
      metin: metin.TALEP_GONDERILEMEDI,
      hizli: metin.HIZLI_ONAY,
    });
  }

  return {
    adim: "bekliyor",
    taslak: { ...taslak },
    cevaplar: [{ metin: metin.TALEP_ALINDI }],
    talepId: talep.id,
  };
}

/** Sürüm çakışmasında mesajın kaç kez yeniden değerlendirileceği. */
const MAX_DENEME = 3;

/**
 * Mesajın işlenmesi ve sonucun yazılması.
 *
 * Yazma başarısız olursa (araya başka bir mesaj girmiş, durum değişmiş) mesaj
 * baştan, *yeni* duruma göre değerlendiriliyor. Eski cevabı yine de göndermek
 * müşteriye iki farklı adımdan iki cevap yollamak olurdu.
 */
export async function mesajiIsle(
  db: Db,
  hesap: BagliHesap,
  senderId: string,
  ham: string
): Promise<AkisSonucu | null> {
  for (let deneme = 0; deneme < MAX_DENEME; deneme += 1) {
    const { konusma, yeni } = await konusmaBul(db, hesap, senderId);
    const cikti = await adimIsle(db, hesap, konusma, ham);

    if (!(await konusmaYaz(db, konusma, cikti.adim, cikti.taslak))) continue;

    return { ...cikti, yeni };
  }

  return null;
}
