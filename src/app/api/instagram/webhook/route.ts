import { NextRequest, NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/security";
import { mesajiIsle } from "@/lib/instagram/akis";
import { kartGonder, mesajGonder, yaziyorGoster } from "@/lib/instagram/graph";
import { belirtecGecerli, imzaGecerli } from "@/lib/instagram/imza";
import { KARSILAMA, KOD_ISTE, METIN_DEGIL } from "@/lib/instagram/metin";
import { adminIstemci, hesapBul, olayYeni } from "@/lib/instagram/veri";

/**
 * Instagram mesajlarının girdiği kapı.
 *
 * Meta bu uca hem doğrulama (GET) hem de her yeni mesaj için bildirim (POST)
 * gönderiyor. Uç herkese açık olmak zorunda, o yüzden güvenlik tamamen imzaya
 * dayanıyor: gövde uygulama gizli anahtarıyla imzalanmamışsa istek hiç
 * okunmuyor (bkz. lib/instagram/imza.ts).
 *
 * ## Neden hep 200 dönüyor
 *
 * Meta 20 saniye içinde 200 alamazsa aynı olayı tekrar gönderiyor ve arka
 * arkaya başarısız olan bir uç bir süre sonra tamamen kapatılıyor. Bu yüzden
 * işlenemeyen bir olay (silinmiş hesap, bozuk gövde, veritabanı hatası) da 200
 * ile kapanıyor: tekrar denemek düzeltmeyeceği için tekrar istemek zarar.
 * Gerçekten tekrar denenmesi gereken tek şey mesajın kendisi değil, gönderim —
 * onun tekrarı da `graph.ts` içinde.
 *
 * ## Neden tekrar işlenmiyor
 *
 * Aynı olay birden çok kez gelebiliyor. `instagram_events` tablosu mesaj
 * kimliğini birincil anahtar olarak tutuyor; ikinci teslimat oraya
 * yazılamadığı için sessizce düşüyor. Bu, müşterinin iki cevap alması ve —
 * daha kötüsü — onay mesajının iki talep açması ihtimalini kapatıyor.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tek istekte işlenecek mesaj sayısı; 20 saniyelik pencereyi korur. */
const MAX_OLAY = 10;

type Mesaj = {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  quick_reply?: { payload?: string };
  attachments?: unknown[];
};

type Olay = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: Mesaj;
};

type Girdi = { id?: string; messaging?: Olay[] };

/**
 * Webhook kurulumunda Meta'nın bir kez sorduğu soru. Doğru belirteçle
 * gelmeyen istek "challenge" değerini öğrenemez.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (
    params.get("hub.mode") === "subscribe" &&
    belirtecGecerli(params.get("hub.verify_token"), process.env.INSTAGRAM_VERIFY_TOKEN)
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  await recordSecurityEvent({
    kind: "unauthorized",
    severity: "warning",
    detail: { yol: "instagram/webhook", adim: "dogrulama" },
  });

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const govde = await request.text();

  if (!imzaGecerli(govde, request.headers.get("x-hub-signature-256"), process.env.INSTAGRAM_APP_SECRET)) {
    // İmzasız istek ya yanlış yapılandırma ya da uydurma bir mesaj denemesi.
    // İkisi de görülmeli: biri entegrasyonu sessizce durdurur, diğeri satıcının
    // takvimine sahte talep düşürmeye çalışır.
    await recordSecurityEvent({
      kind: "unauthorized",
      severity: "critical",
      detail: { yol: "instagram/webhook", imza: request.headers.has("x-hub-signature-256") },
    });

    return new NextResponse("Forbidden", { status: 403 });
  }

  let veri: { object?: string; entry?: Girdi[] };

  try {
    veri = JSON.parse(govde);
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (veri.object !== "instagram") return NextResponse.json({ ok: true });

  const db = adminIstemci();
  let islenen = 0;

  for (const girdi of veri.entry ?? []) {
    const igUserId = girdi.id;
    if (!igUserId) continue;

    for (const olay of girdi.messaging ?? []) {
      if (islenen >= MAX_OLAY) break;

      // Kendi gönderdiğimiz mesajlar da webhook'a düşüyor; onlara cevap
      // yazmak sonsuz bir döngü olurdu.
      if (olay.message?.is_echo) continue;

      const senderId = olay.sender?.id;
      const mid = olay.message?.mid;
      if (!senderId || !mid || senderId === igUserId) continue;

      islenen += 1;

      try {
        await olayIsle(db, igUserId, senderId, mid, olay.message ?? {});
      } catch (err) {
        // Tek bir mesajın hatası diğerlerini düşürmesin; olay da tekrar
        // istenmesin (yukarıdaki gerekçe).
        console.error("[instagram] mesaj işlenemedi", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function olayIsle(
  db: ReturnType<typeof adminIstemci>,
  igUserId: string,
  senderId: string,
  mid: string,
  mesaj: Mesaj
): Promise<void> {
  const hesap = await hesapBul(db, igUserId);

  // Bağlı olmayan (ya da bağlantısı kapatılmış) bir hesaba gelen mesaj bizim
  // işimiz değil. Kayıt da tutulmuyor: satıcı entegrasyonu kapattıysa
  // müşterisinin mesajlarını biriktirmemiz gerekmiyor.
  if (!hesap) return;

  // Tekrar teslimat kontrolü hesabı bulduktan *sonra*: bağlı olmayan hesabın
  // mesaj kimliklerini tabloya doldurmanın anlamı yok.
  if (!(await olayYeni(db, mid))) return;

  // Hızlı cevap düğmesine basıldığında metin yerine yük geliyor; ikisi de aynı
  // akıştan geçiyor, çünkü müşteri düğmeye basmak yerine yazabilir de.
  const ham = (mesaj.quick_reply?.payload ?? mesaj.text ?? "").trim();

  if (!ham) {
    // Fotoğraf, sesli mesaj, beğeni. Akış metin üstünde çalışıyor.
    if ((mesaj.attachments ?? []).length > 0) {
      await mesajGonder(hesap.accessToken, senderId, METIN_DEGIL);
    }
    return;
  }

  await yaziyorGoster(hesap.accessToken, senderId);

  const sonuc = await mesajiIsle(db, hesap, senderId, ham);

  if (!sonuc) {
    console.error("[instagram] konuşma durumu yazılamadı", { senderId });
    return;
  }

  const cevaplar = [...sonuc.cevaplar];

  // İlk mesajda karşılama: müşteri "merhaba" yazdıysa yalnızca karşılama,
  // doğrudan ürün kodu yazdıysa karşılama cevabın önüne ekleniyor.
  if (sonuc.yeni) {
    if (cevaplar.length === 1 && cevaplar[0].metin === KOD_ISTE) {
      cevaplar[0] = { metin: KARSILAMA };
    } else {
      cevaplar.unshift({ metin: KARSILAMA });
    }
  }

  for (const cevap of cevaplar) {
    // Kart önce: müşteri önce ürünü görsün, sonra ne yazacağını okusun.
    // Kartın gitmemesi akışı durdurmuyor — metin zaten aynı bilgiyi taşıyor,
    // eksik olan yalnızca fotoğraf.
    if (cevap.kart) {
      const kart = await kartGonder(hesap.accessToken, senderId, cevap.kart);
      if (!kart.ok) console.error("[instagram] ürün kartı gönderilemedi", kart.hata);
    }

    const gonderim = await mesajGonder(hesap.accessToken, senderId, cevap.metin, cevap.hizli);

    if (!gonderim.ok) {
      console.error("[instagram] cevap gönderilemedi", gonderim.hata);
      break;
    }
  }
}
