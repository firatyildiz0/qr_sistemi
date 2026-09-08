import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getTurnaroundForOwner } from "@/lib/settings";
import {
  ARACLAR,
  aracCalistir,
  type AracBaglami,
  type RezervasyonPlani,
  type UrunKarti,
} from "@/lib/asistan/araclar";
import {
  GUNLUK_LIMIT,
  onbellekIsaretle,
  MAX_GECMIS,
  MAX_TOKENS,
  MAX_TURLAR,
  MODEL,
  SISTEM_TALIMATI,
} from "@/lib/asistan/kurallar";

/**
 * Asistanın sunucu tarafı.
 *
 * Akış tek bir turda bitmiyor: model önce bir araç çağırıyor, sonucu görüyor,
 * sonra belki bir araç daha, en sonunda konuşuyor. Bu döngü burada dönüyor ve
 * bittiğinde istemciye ya bir cevap ya da bir onay kartı çıkıyor.
 *
 * ## Yetki
 *
 * Sorgular oturumun kendi anahtarıyla atılıyor (`lib/supabase/server`), service
 * role ile değil. Yani RLS devrede: asistan, satıcının kendi elleriyle
 * göremeyeceği hiçbir satırı göremez. `lib/supabase/admin` bu dosyaya bilerek
 * hiç girmiyor — girseydi asistan bir yetki yükseltme yoluna dönerdi.
 *
 * ## Yazma
 *
 * Model rezervasyonu kendi açmıyor. `rezervasyon_olustur` bir plan üretiyor,
 * plan kullanıcıya kart olarak gösteriliyor, kullanıcı onaylayınca istek
 * `onay` alanıyla geri geliyor ve kayıt `createBooking` ile açılıyor — yani
 * formun kullandığı kod yolunun tam olarak aynısıyla. Sahiplik, stok, çakışma
 * ve adres kontrolleri orada; buradaki kontroller kartın doğru görünmesi için.
 *
 * Geçmiş istemcide duruyor ve her istekte geri geliyor, dolayısıyla
 * kurcalanabilir. Bunun sınırı şu: kurcalayan kişi zaten o satıcı, ve
 * `createBooking` yine kendi ürünlerinden başkasına kayıt açtırmıyor. Yani
 * elde edilebilecek en kötü şey, panelden zaten yapılabilen bir işlem.
 */

export const runtime = "nodejs";
/** Sohbet kişiye özel ve her seferinde farklı; ara katmanların tutmaması gerek. */
export const dynamic = "force-dynamic";

type Istek = {
  mesajlar?: unknown;
  /** Onay kartının cevabı. `plan` yalnızca kabul edildiğinde okunuyor. */
  onay?: { arac_id?: unknown; kabul?: unknown; plan?: unknown };
};

type Yanit =
  | {
      tip: "yanit";
      metin: string;
      /**
       * Bu turda üretilen ürün kartları. Model cümlesini kurarken kart zaten
       * hazırdır; ekranda cümlenin yanında görünüyor. Sayı ve ad gibi yanlış
       * olması pahalı olan şeyler böylece modelin cümlesinden değil doğrudan
       * veritabanından geliyor.
       */
      kartlar: UrunKarti[];
      mesajlar: Anthropic.MessageParam[];
      kalan: number;
    }
  | {
      tip: "onay";
      metin: string;
      plan: RezervasyonPlani;
      arac_id: string;
      kartlar: UrunKarti[];
      mesajlar: Anthropic.MessageParam[];
      kalan: number;
    };

function hata(mesaj: string, durum: number) {
  return NextResponse.json({ hata: mesaj }, { status: durum });
}

export async function POST(request: Request) {
  const me = await getProfile();
  if (!me || me.status !== "approved") {
    return hata("Bu özelliği kullanma yetkiniz yok.", 401);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return hata("Asistan yapılandırılmamış: ANTHROPIC_API_KEY tanımlı değil.", 503);
  }

  let govde: Istek;
  try {
    govde = (await request.json()) as Istek;
  } catch {
    return hata("İstek okunamadı.", 400);
  }

  const gelen = Array.isArray(govde.mesajlar)
    ? (govde.mesajlar as Anthropic.MessageParam[])
    : [];

  if (gelen.length === 0) {
    return hata("Mesaj yok.", 400);
  }
  if (gelen.length > MAX_GECMIS) {
    return hata(
      "Bu sohbet uzadı. Yeni bir sohbet başlatın — asistan baştan başlasın.",
      413
    );
  }

  const supabase = await createClient();

  // Kota, model çağrılmadan önce harcanıyor: sınırı aşan istek bir kuruş
  // harcamadan dönmeli. Sayaç ile kontrol tek ifadede, aynı anda gelen iki
  // istek aynı hakkı iki kez kullanamasın diye (bkz. 0026 göçü).
  const { data: kota, error: kotaHatasi } = await supabase.rpc("asistan_kota_harca", {
    p_limit: GUNLUK_LIMIT,
  });

  if (kotaHatasi) {
    return hata("Kullanım sayacı okunamadı (0026 göçü çalıştırıldı mı?).", 500);
  }

  const { izin, kalan } = kota as { izin: boolean; kalan: number };
  if (!izin) {
    return hata(
      `Bugünlük asistan hakkınız doldu (${GUNLUK_LIMIT} mesaj). Yarın sıfırlanır.`,
      429
    );
  }

  const baglam: AracBaglami = {
    supabase,
    ownerId: me.id,
    turnaround: await getTurnaroundForOwner(supabase, me.id),
    katalog: null,
  };

  const mesajlar = [...gelen];

  // Onay kartının cevabı geçmişe *yeni bir kullanıcı turu* olarak giriyor,
  // araç sonucu olarak değil.
  //
  // İlk yazışta araç sonucu olarak eklenmişti ve API her isteği reddetti: bir
  // `tool_use` yalnızca bir `tool_result` alabiliyor, oysa o kimliğin sonucu
  // zaten aşağıdaki döngüde yazılmıştı ("kart gösterildi, kayıt açılmadı").
  // Onay ikinci bir kopya ekliyordu.
  //
  // Doğrusu da bu: kart gösterildiği anda aracın işi bitmişti. Kullanıcının
  // kararı ondan sonra olmuş yeni bir olay, ve sohbete öyle giriyor. Kullanıcı
  // onaylamak yerine bambaşka bir şey yazarsa da geçmiş tutarlı kalıyor —
  // cevapsız bir araç çağrısı asılı kalmıyor.
  if (govde.onay) {
    const aracId = typeof govde.onay.arac_id === "string" ? govde.onay.arac_id : "";
    if (!aracId) return hata("Onay kimliği eksik.", 400);

    // Kart gerçekten gösterilmiş mi: istemcinin, hiç önerilmemiş bir planı
    // onaylatmaya çalışmadığını doğruluyor. `createBooking` zaten kendi
    // kontrollerini yapıyor, bu ondan önceki ucuz elemek.
    const kartVar = mesajlar.some(
      (mesaj) =>
        mesaj.role === "assistant" &&
        Array.isArray(mesaj.content) &&
        mesaj.content.some(
          (blok) => blok.type === "tool_use" && blok.id === aracId
        )
    );
    if (!kartVar) return hata("Onaylanacak bir kart bulunamadı.", 400);

    const sonuc = govde.onay.kabul
      ? await rezervasyonuAc(govde.onay.plan, me.id)
      : "Kullanıcı kaydı onaylamadı, rezervasyon açılmadı.";

    mesajlar.push({ role: "user", content: `[onay kartının sonucu] ${sonuc}` });
  }

  const client = new Anthropic();

  let plan: { plan: RezervasyonPlani; aracId: string } | null = null;
  const kartlar: UrunKarti[] = [];

  try {
    for (let tur = 0; tur < MAX_TURLAR; tur++) {
      const yanit = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SISTEM_TALIMATI,
        tools: ARACLAR,
        messages: onbellekIsaretle(mesajlar),
      });

      mesajlar.push({ role: "assistant", content: yanit.content });

      if (yanit.stop_reason !== "tool_use") {
        return NextResponse.json<Yanit>({
          tip: "yanit",
          metin: metniTopla(yanit.content),
          kartlar,
          mesajlar,
          kalan,
        });
      }

      // Paralel araç çağrıları tek bir kullanıcı mesajında toplanmalı; ayrı
      // mesajlara bölmek modelin paralel çağırmayı bırakmasına yol açıyor.
      const sonuclar: Anthropic.ToolResultBlockParam[] = [];

      for (const blok of yanit.content) {
        if (blok.type !== "tool_use") continue;

        const sonuc = await aracCalistir(
          blok.name,
          (blok.input ?? {}) as Record<string, unknown>,
          baglam
        );

        sonuclar.push({
          type: "tool_result",
          tool_use_id: blok.id,
          content: sonuc.metin,
        });

        // Kart bir kere gösterilir: aynı turda iki plan çıkarsa ilki geçerli.
        if (sonuc.tip === "plan" && !plan) {
          plan = { plan: sonuc.plan, aracId: blok.id };
        }

        // Aynı ürün iki kez sorulursa kart bir kez çıksın.
        if (sonuc.tip === "kart" && !kartlar.some((k) => k.id === sonuc.kart.id)) {
          kartlar.push(sonuc.kart);
        }
      }

      mesajlar.push({ role: "user", content: sonuclar });

      // Plan varsa döngü burada duruyor. Modeli bir tur daha konuşturmanın
      // anlamı yok: söz sırası kullanıcıda, kararı o verecek.
      if (plan) {
        return NextResponse.json<Yanit>({
          tip: "onay",
          metin: "Şunu kaydedeyim mi?",
          plan: plan.plan,
          arac_id: plan.aracId,
          kartlar,
          mesajlar,
          kalan,
        });
      }
    }

    return NextResponse.json<Yanit>({
      tip: "yanit",
      metin: "Bu isteği çözemedim. Daha kısa ve net anlatır mısın?",
      kartlar,
      mesajlar,
      kalan,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return hata("Asistan anahtarı geçersiz.", 503);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return hata("Asistan şu an yoğun. Birkaç saniye sonra tekrar deneyin.", 429);
    }
    console.error("asistan", err);
    return hata("Asistana ulaşılamadı.", 502);
  }
}

function metniTopla(icerik: Anthropic.ContentBlock[]): string {
  return icerik
    .filter((blok): blok is Anthropic.TextBlock => blok.type === "text")
    .map((blok) => blok.text)
    .join("\n")
    .trim();
}

/**
 * Onaylanan planı gerçek bir rezervasyona çevirir.
 *
 * `createBooking` bir form eylemi: girdisini `FormData` olarak alıyor. Onu
 * burada yeniden kurmak, kuralları ikinci kez yazmaktan iyi — sahiplik
 * kontrolü, stok çakışması, meşguliyet aralığı ve adres doğrulaması o
 * fonksiyonun içinde ve asistan da tam olarak onlara tabi olmalı.
 *
 * `blocked_start`/`blocked_end` bilerek gönderilmiyor: gönderilse asistanın
 * hesabı satıcının ayarlarının önüne geçerdi. Boş bırakıldığında `createBooking`
 * aralığı güncel ayarlardan kendisi hesaplıyor.
 */
async function rezervasyonuAc(ham: unknown, ownerId: string): Promise<string> {
  if (typeof ham !== "object" || ham === null) {
    return "Rezervasyon bilgileri okunamadı, kayıt açılmadı.";
  }

  const plan = ham as Partial<RezervasyonPlani>;

  if (typeof plan.urun_id !== "string" || typeof plan.musteri_adi !== "string") {
    return "Rezervasyon bilgileri eksik, kayıt açılmadı.";
  }

  const adet = Math.trunc(Number(plan.adet ?? 1));

  const form = new FormData();
  form.set("customer_name", plan.musteri_adi);
  form.set("customer_phone", plan.telefon ?? "");
  form.set("customer_city", plan.il ?? "");
  form.set("customer_district", plan.ilce ?? "");
  form.set("customer_address", plan.adres ?? "");
  form.set("start_date", plan.baslangic ?? "");
  form.set("end_date", plan.bitis ?? "");
  form.set(
    "items",
    JSON.stringify([
      { product_id: plan.urun_id, quantity: Number.isFinite(adet) && adet >= 1 ? adet : 1 },
    ])
  );

  // `createBooking` sunucu eylemi; buradan çağrılabilmesi için içe aktarılıyor.
  // Eylemin kendisi `ownerId`yi oturumdan okuyor, parametredeki yalnızca
  // günlüğe yazmak için.
  const { createBooking } = await import("@/app/product/[id]/actions");

  try {
    const sonuc = await createBooking(plan.urun_id, { error: null }, form);
    if (sonuc.error) return `Kayıt açılamadı: ${sonuc.error}`;
    return `Rezervasyon oluşturuldu: ${plan.urun_adi ?? "ürün"}, ${plan.musteri_adi}.`;
  } catch (err) {
    console.error("asistan rezervasyon", ownerId, err);
    return "Kayıt açılırken beklenmeyen bir hata oldu.";
  }
}
