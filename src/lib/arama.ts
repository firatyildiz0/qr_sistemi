/**
 * Türkçe metin araması — yapay zekasız.
 *
 * Panelin her yerinde ürün aranıyor ve şimdiye kadar bu düz bir `includes`
 * ile yapılıyordu: adı "Gelinlik - Kırmızı Dantelli" olan ürün "kırmızı
 * gelinlik" yazınca bulunamıyordu, çünkü o harf dizisi adın içinde o sırayla
 * geçmiyor. Satıcı ürünü aklındaki sırayla yazıyor, kataloğa kaydettiği
 * sırayla değil.
 *
 * Buradaki eşleştirme üç şeye dayanıyor:
 *
 * 1. **Sıra önemsiz.** Sorgu kelimelere bölünüyor ve her kelimenin adın
 *    *herhangi* bir kelimesini tutması yetiyor.
 * 2. **Ek toleransı.** "gelinliği", "gelinlikten", "gelinlik" birbirini
 *    tutmalı. Türkçe eklerin tamamını çözmek bir kütüphane işi; burada önek
 *    karşılaştırması yapılıyor — iki kelimeden biri diğeriyle başlıyorsa
 *    eşleşme sayılıyor. Ekler sona geldiği için bu pratikte yetiyor.
 * 3. **Aksan ve büyük harf körlüğü.** "İpek" ile "ipek", "çiçek" ile "cicek"
 *    aynı. Türkçenin i/ı ayrımı yüzünden `toLowerCase()` tek başına yetmiyor:
 *    "IŞIK" İngilizce kurallarla "ışık" değil "isik" olur. O yüzden önce
 *    Türkçe yerel ayarla küçültülüp sonra harfler sadeleştiriliyor.
 *
 * Yapay zeka bu iş için yanlış araç olurdu: bu eşleştirme anında, bedava,
 * çevrimdışı ve deterministik. Asistan da ürün ararken buraya düşüyor
 * (bkz. lib/asistan/araclar.ts) — modelin uydurma ürün adı üretmesi değil,
 * gerçek katalogdan seçmesi için.
 */

/**
 * Türkçe harfleri aksansız karşılıklarına indirger.
 *
 * `normalize("NFD")` ile ayrıştırma burada işe yaramıyor: "ı" bir aksanlı "i"
 * değil, kendi başına bir harf — Unicode onu parçalamıyor. O yüzden eşleme
 * elle yazılı.
 */
const HARFLER: Record<string, string> = {
  ı: "i",
  ş: "s",
  ğ: "g",
  ü: "u",
  ö: "o",
  ç: "c",
  â: "a",
  î: "i",
  û: "u",
};

/** Karşılaştırmaya hazır hâl: küçük harf, aksansız, noktalama boşluk. */
export function sadelestir(metin: string): string {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replace(/[ışğüöçâîû]/g, (harf) => HARFLER[harf] ?? harf)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Sadeleştirilmiş metnin kelimeleri. Boş metin boş dizi verir. */
export function kelimeler(metin: string): string[] {
  const sade = sadelestir(metin);
  return sade ? sade.split(" ") : [];
}

/**
 * Ünsüz yumuşaması: ek geldiğinde kökün son sessizi değişiyor.
 *
 * "gelinlik" + "i" → "gelinliği", "kitap" + "ı" → "kitabı", "damat" + "ı" →
 * "damadı". Yani ek yalnızca sona eklenmiyor, kökün kendisi de bir harf
 * oynuyor — düz önek karşılaştırması tam bu yüzden yetmiyor.
 *
 * Harfler `sadelestir()`ten geçmiş hâlleriyle yazılı: "ğ" oraya "g" olarak
 * geliyor, "ç" de "c".
 */
const YUMUSAMA: Record<string, string> = { k: "g", p: "b", t: "d", c: "c" };

function yumusamaMi(a: string, b: string): boolean {
  return YUMUSAMA[a] === b || YUMUSAMA[b] === a;
}

/**
 * Ekleri yok sayan kelime karşılaştırması.
 *
 * İki yönlü bakılıyor çünkü ek hangi tarafta olursa olsun eşleşmeli: satıcı
 * "gelinlikten" yazıp "Gelinlik"i bulabilmeli, "gelinlik" yazıp "Gelinlikler"i
 * de. Üç harften kısa ortak parçalarda karşılaştırma her şeyi tutturmaya
 * başladığı için orada tam eşitlik aranıyor — yoksa "şal" ile "şah" da eşleşir.
 */
const EN_KISA_ONEK = 3;

function kelimeTutuyor(hedef: string, aranan: string): boolean {
  if (hedef === aranan) return true;

  const kisa = Math.min(hedef.length, aranan.length);
  if (kisa < EN_KISA_ONEK) return false;

  let ortak = 0;
  while (ortak < kisa && hedef[ortak] === aranan[ortak]) ortak++;

  // Biri diğerinin öneki: "gelinlik" ↔ "gelinlikten".
  if (ortak === kisa) return true;

  // Yalnızca son sessiz ayrılıyorsa ve ayrılma yumuşamaysa yine aynı kelime:
  // "gelinlik" ↔ "gelinligi". Ayrımın son harfte olması şart, ortada değil.
  return (
    ortak === kisa - 1 &&
    ortak >= EN_KISA_ONEK &&
    yumusamaMi(hedef[ortak], aranan[ortak])
  );
}

/**
 * Sorgunun metinde ne kadar tuttuğu. Tutmuyorsa 0.
 *
 * Sorgunun **her** kelimesi tutmak zorunda: "kırmızı gelinlik" yazan kişi
 * bütün gelinlikleri değil kırmızı olanı arıyor. Puan sıralama için: tam
 * kelime eşleşmesi önek eşleşmesinden değerli, baştan eşleşen ad ortadan
 * eşleşenden değerli.
 */
export function puan(metin: string, sorgu: string): number {
  const aranacaklar = kelimeler(sorgu);
  if (aranacaklar.length === 0) return 1;

  const hedefler = kelimeler(metin);
  if (hedefler.length === 0) return 0;

  let toplam = 0;

  for (const aranan of aranacaklar) {
    let enIyi = 0;

    for (let i = 0; i < hedefler.length; i++) {
      const hedef = hedefler[i];
      if (!kelimeTutuyor(hedef, aranan)) continue;

      // Tam eşleşme 2, önek eşleşmesi 1. Baştaki kelimeler yarım puan fazla:
      // "Gelinlik Duvağı" araması "gelinlik" için "Duvak Gelinlik"ten önde.
      const kalite = hedef === aranan ? 2 : 1;
      enIyi = Math.max(enIyi, kalite + (i === 0 ? 0.5 : 0));
    }

    // Bir kelime hiç tutmadıysa sonuç eleniyor.
    if (enIyi === 0) return 0;
    toplam += enIyi;
  }

  return toplam;
}

/** Sorgu metni tutuyor mu — puana değil yalnızca varlığa bakanlar için. */
export function tutuyor(metin: string, sorgu: string): boolean {
  return puan(metin, sorgu) > 0;
}

/**
 * Bir listeyi sorguya göre süzüp sıralar.
 *
 * `alanlar` her kaydın aranacak metinlerini veriyor: ürün için adı ve satıcının
 * kendi etiket numarası, müşteri için adı ve telefonu. Bir kaydın puanı
 * alanlarının en yüksek puanı — ada göre eşleşen kayıt, etiketine göre
 * eşleşenle aynı torbaya girmesin diye toplama değil en iyiye bakılıyor.
 *
 * Boş sorgu her şeyi verir, sırasını bozmadan: arama kutusu boşken liste
 * kataloğun kendi sırasında kalmalı.
 */
export function ara<T>(
  kayitlar: readonly T[],
  sorgu: string,
  alanlar: (kayit: T) => (string | null | undefined)[]
): T[] {
  if (!sadelestir(sorgu)) return [...kayitlar];

  const puanlanmis: { kayit: T; puan: number; sira: number }[] = [];

  kayitlar.forEach((kayit, sira) => {
    let enIyi = 0;
    for (const alan of alanlar(kayit)) {
      if (!alan) continue;
      enIyi = Math.max(enIyi, puan(alan, sorgu));
    }
    if (enIyi > 0) puanlanmis.push({ kayit, puan: enIyi, sira });
  });

  // Eşit puanlı kayıtlar geldikleri sırayı korusun — katalog zaten ada göre
  // sıralı geliyor, aynı puandaki iki ürünü rastgele yer değiştirtmek listeyi
  // her aramada oynatırdı.
  puanlanmis.sort((a, b) => b.puan - a.puan || a.sira - b.sira);

  return puanlanmis.map((girdi) => girdi.kayit);
}
