import Anthropic from "@anthropic-ai/sdk";
import { formatPrice } from "@/lib/format";
import type { InstagramAyarlari } from "@/lib/instagram/ayarlar";
import type { GecmisMesaj } from "@/lib/instagram/tipler";
import type { KatalogUrunu } from "@/lib/instagram/veri";

/**
 * Müşterinin serbest sorusuna cevap: "kargo var mı", "kapora ne kadar",
 * "siyah abiye var mı", "hafta sonu açık mısınız".
 *
 * Rezervasyon akışı (bkz. akis.ts) bilerek bir durum makinesi olarak kalıyor —
 * takvimi kapatan şey serbest metinden çıkarılmamalı. Bu dosya onun yanında
 * duruyor ve yalnızca *konuşuyor*: hiçbir aracı yok, hiçbir şey yazamıyor,
 * tarih kapatamıyor. Dayanağı satıcının panelden yazdığı bilgiler ve
 * katalogdaki ürünler; orada olmayan bir şeyi uydurmaması istemin en sert
 * kuralı.
 *
 * Cevap alınamazsa (anahtar yok, zaman aşımı, ret) `null` dönüyor ve çağıran
 * taraf eski sabit cümleye düşüyor: müşteri hiçbir durumda cevapsız kalmıyor.
 */

const MODEL = "claude-sonnet-5";
/** Webhook 20 saniye içinde 200 dönmek zorunda; cevap bunun içinde bitmeli. */
const ZAMAN_ASIMI_MS = 12_000;

export function asistanYapilandirildi(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const USLUP_TARIFI: Record<InstagramAyarlari["uslup"], string> = {
  samimi:
    "Samimi ve sıcak yaz; mahalledeki güler yüzlü esnaf gibi. Kısa cümleler, gündelik dil. Gerektiğinde tek bir emoji kullanabilirsin, abartma.",
  dengeli:
    "Sıcak ama ölçülü yaz; ne resmi ne laubali. Emoji kullanma ya da en fazla bir tane.",
  resmi: "Kibar ve düzgün yaz ama robot gibi değil, kalıp cümlelerden kaçın. Emoji kullanma.",
};

type Baglam = {
  ayarlar: InstagramAyarlari;
  katalog: KatalogUrunu[];
  isletmeAdi: string | null;
};

function katalogMetni(katalog: KatalogUrunu[]): string {
  if (katalog.length === 0) return "(Katalogda ürün yok.)";

  return katalog
    .map((u) => {
      const parcalar = [
        u.kod ? `Kod: ${u.kod}` : null,
        u.ad,
        u.gunlukFiyat != null ? `${formatPrice(u.gunlukFiyat)}/gün` : null,
        u.stok <= 0 ? "şu an kiralamaya kapalı" : null,
        u.aciklama ? `Açıklama: ${u.aciklama.replace(/\s+/g, " ")}` : null,
      ].filter(Boolean);
      return `- ${parcalar.join(" | ")}`;
    })
    .join("\n");
}

/**
 * Sabit kısım: satıcı ayarını değiştirmedikçe aynı kalıyor, önbelleğe alınıyor.
 * Değişken olan (sohbet, o anki adım) mesajlarda.
 */
function sistemIstemi({ ayarlar, katalog, isletmeAdi }: Baglam): string {
  const ornekler = ayarlar.ornekler.length
    ? ayarlar.ornekler.map((o) => `Müşteri: ${o.soru}\nSen: ${o.cevap}`).join("\n\n")
    : "(Örnek yok.)";

  // Satıcının yüklediği gerçek konuşmaların dökümleri. "Siz" satırları
  // satıcının kendi cevapları; üslubun en güvenilir kaynağı bunlar.
  const gercekKonusmalar = ayarlar.gorselOrnekler
    .filter((o) => o.dokum)
    .map((o, i) => `### Konuşma ${i + 1}\n${o.dokum}`)
    .join("\n\n");

  return [
    `Sen ${isletmeAdi ? `@${isletmeAdi} adlı` : "bir"} kiralama işletmesinin Instagram mesajlarına cevap veren çalışanısın. Müşterilere Türkçe cevap veriyorsun.`,
    "",
    "## Nasıl yazacaksın",
    `- Müşteriye "${ayarlar.hitap}" diye hitap et.`,
    `- ${USLUP_TARIFI[ayarlar.uslup]}`,
    "- Gerçek bir insan gibi yaz. \"Size nasıl yardımcı olabilirim\", \"Değerli müşterimiz\", \"Sorunuz için teşekkür ederiz\" gibi kalıp ve yapmacık cümleler kurma.",
    "- Sorulana cevap ver, uzatma. Çoğu cevap bir iki cümle olmalı. Sorulmayan bilgiyi sıralama.",
    "- Markdown, başlık, madde işareti kullanma; bu bir Instagram mesajı. Birkaç ürün sayacaksan kısa satırlar yeterli.",
    "- Yapay zekâ ya da bot olduğunu söyleme, ama biri doğrudan sorarsa dürüstçe otomatik asistan olduğunu söyle.",
    "",
    "## Neye dayanacaksın",
    "- Yalnızca aşağıdaki işletme bilgisi, kurallar, örnek konuşmalar ve katalog. Bunlarda olmayan bir fiyatı, kuralı, adresi, saati, indirimi asla uydurma.",
    "- Bilmediğin bir şey sorulursa bunu satıcıya ileteceğini ve kısa sürede buradan dönüleceğini söyle.",
    "- Örnek konuşmalar satıcının kendi cevapları: bilgiyi de üslubu da oradan al. Aynı soru gelirse aynı özü ver.",
    "- Kurallardaki şartlar ve istisnalar kesindir; müşteri ısrar etse de esnetme, pazarlık vaadi verme.",
    "- Bir ürünün belirli tarihte boş olup olmadığını bilemezsin. Müsaitlik sorulursa bunu kesin söyleme.",
    ayarlar.rezervasyonAcik
      ? "- Rezervasyon buradan mesajla yapılıyor: müşteri ürünün kodunu yazınca sistem tarihleri sorup müsaitliği kontrol ediyor. Müşteri kiralamak istediğini söylerse ya da müsaitlik sorarsa ürün kodunu yazmasını söyle; katalogdan uygun ürünün kodunu verebilirsin."
      : "- Mesajdan rezervasyon alınmıyor. Kiralamak isteyen müşteriyi işletme bilgisindeki yola yönlendir; yol yazılmamışsa satıcının dönüş yapacağını söyle.",
    ayarlar.yasaklar ? `\n## Kesinlikle yapma / konuşma\n${ayarlar.yasaklar}` : "",
    "",
    "## İşletme bilgisi",
    ayarlar.isletmeBilgisi || "(Satıcı henüz bilgi girmedi.)",
    "",
    "## Kurallar, şartlar, istisnalar",
    ayarlar.kurallar || "(Belirtilmemiş.)",
    ayarlar.minGun ? `En az ${ayarlar.minGun} günlük kiralama kabul ediliyor.` : "",
    "",
    "## Örnek konuşmalar",
    ornekler,
    "",
    gercekKonusmalar
      ? "## Satıcının gerçek konuşmaları (ekran görüntülerinden)\n" +
        "\"Siz\" satırları satıcının müşterilerine gerçekten yazdığı cevaplar. Uzunluğu, samimiyeti, emoji kullanımını ve kelime seçimini bunlara benzet; içlerindeki bilgiler de geçerli. Köşeli parantezli yerler ([isim], [telefon]) gizlenmiş kişisel bilgidir, onları kullanma.\n\n" +
        gercekKonusmalar +
        "\n"
      : "",
    "## Katalog",
    katalogMetni(katalog),
  ].join("\n");
}

export type SoruGirdisi = Baglam & {
  gecmis: GecmisMesaj[];
  mesaj: string;
  /**
   * Konuşmanın ilk mesajı: satıcının karşılama mesajı bu cevabın hemen önünde
   * gidiyor, asistan ikinci kez selam vermemeli.
   */
  karsilamaGitti: boolean;
  /**
   * Müşteri rezervasyonun ortasındaysa, cevabın sonunda ne yazması
   * gerektiğini hatırlatmak için. Örn. "tarih aralığını yazması bekleniyor".
   */
  bekleyenAdim?: string;
};

let istemci: Anthropic | null = null;

function anthropic(): Anthropic {
  istemci ??= new Anthropic({ timeout: ZAMAN_ASIMI_MS, maxRetries: 1 });
  return istemci;
}

export async function soruyaCevap(girdi: SoruGirdisi): Promise<string | null> {
  if (!asistanYapilandirildi()) return null;

  const mesajlar: Anthropic.MessageParam[] = [];

  // Geçmiş müşteri mesajıyla başlamalı; baştaki bizim mesajlarımız atlanıyor.
  const gecmis = [...girdi.gecmis];
  while (gecmis.length && gecmis[0].kim === "biz") gecmis.shift();

  for (const m of gecmis) {
    mesajlar.push({ role: m.kim === "musteri" ? "user" : "assistant", content: m.metin });
  }

  const notlar = [
    girdi.karsilamaGitti
      ? "Bu müşterinin ilk mesajı ve karşılama mesajı az önce gönderildi; tekrar selam verme, doğrudan cevapla."
      : null,
    girdi.bekleyenAdim
      ? `Müşteri rezervasyonun ortasında; sistem ondan ${girdi.bekleyenAdim}. Soruyu cevapladıktan sonra tek cümleyle bunu yazmasını hatırlat.`
      : null,
  ].filter(Boolean);

  mesajlar.push({
    role: "user",
    content: notlar.length
      ? `${girdi.mesaj}\n\n[Sistem notu, müşteri görmüyor: ${notlar.join(" ")}]`
      : girdi.mesaj,
  });

  try {
    const cevap = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: sistemIstemi(girdi),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: mesajlar,
    });

    if (cevap.stop_reason === "refusal") return null;

    const metin = cevap.content
      .flatMap((blok) => (blok.type === "text" ? [blok.text] : []))
      .join("")
      .trim();

    return metin || null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("[instagram] asistan cevap veremedi", err.status, err.message);
    } else {
      console.error("[instagram] asistan cevap veremedi", err);
    }
    return null;
  }
}

const DOKUM_TALIMATI = [
  "Bu görsel bir Instagram mesajlaşmasının ekran görüntüsü. Ekran görüntüsünü alan kişi işletme sahibi.",
  "Konuşmayı baştan sona, sırasıyla yazıya dök:",
  "- İşletmenin mesajlarını (genellikle sağdaki, renkli balonlar) \"Siz:\" ile, karşı tarafın mesajlarını (genellikle soldaki balonlar) \"Müşteri:\" ile başlat.",
  "- Her mesaj ayrı satırda. Yazım, emoji ve noktalama aynen kalsın; düzeltme yapma.",
  "- Kişisel bilgileri gizle: isim → [isim], telefon → [telefon], adres → [adres], e-posta → [e-posta]. Fiyat, tarih, ürün adı gibi işletme bilgileri kalsın.",
  "- Saat, \"Görüldü\", tepki, kullanıcı adı başlığı gibi arayüz öğelerini yazma. Fotoğraf ya da gönderi paylaşılmışsa kısaca [fotoğraf: kırmızı abiye] gibi belirt.",
  "- Yalnızca dökümü yaz, başka hiçbir açıklama ekleme.",
  "Görselde bir mesajlaşma yoksa yalnızca YOK yaz.",
].join("\n");

export type DokumSonucu = { dokum: string } | { hata: string };

/**
 * Ekran görüntüsündeki konuşmayı yazıya döker. Yükleme anında bir kez
 * çalışıyor; sonucu satıcı panelde görüp düzeltebiliyor.
 */
export async function gorselOrnegiCoz(
  veri: string,
  tur: "image/jpeg" | "image/png" | "image/webp"
): Promise<DokumSonucu> {
  if (!asistanYapilandirildi()) return { hata: "Görsel okuma bu kurulumda yapılandırılmamış." };

  try {
    const cevap = await anthropic().messages.create(
      {
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: tur, data: veri } },
              { type: "text", text: DOKUM_TALIMATI },
            ],
          },
        ],
      },
      // Uzun bir konuşmanın dökümü bir DM cevabından uzun sürüyor.
      { timeout: 60_000 }
    );

    if (cevap.stop_reason === "refusal") return { hata: "Bu görsel okunamadı." };

    const dokum = cevap.content
      .flatMap((blok) => (blok.type === "text" ? [blok.text] : []))
      .join("")
      .trim();

    if (!dokum || dokum === "YOK") {
      return { hata: "Görselde bir mesajlaşma bulunamadı. Instagram konuşmasının ekran görüntüsünü yükleyin." };
    }

    return { dokum };
  } catch (err) {
    console.error("[instagram] görsel örnek okunamadı", err);
    return { hata: "Görsel şu an okunamadı. Biraz sonra tekrar deneyin." };
  }
}
