import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { iyzicoConfig, verifyWebhook, type WebhookPayload } from "@/lib/iyzico";
import { recordSecurityEvent } from "@/lib/security";

/**
 * iyzico webhook'u — aylık yenilemelerin haberi buradan geliyor.
 *
 * İlk ödeme geri dönüş adresinden (`/abonelik/tamamlandi`) işleniyor; ikinci
 * aydan itibaren tahsilatı iyzico kendisi yapıyor ve sonucu yalnızca buraya
 * bildiriyor. Yani bu uç olmadan abonelikler ilk ayın sonunda sessizce
 * kapanırdı.
 *
 * Yetki `CRON_SECRET` gibi paylaşılan bir sırla değil, iyzico'nun imzasıyla
 * doğrulanıyor (`X-IYZ-SIGNATURE-V3`). İmzasız ya da yanlış imzalı istek
 * hiçbir şey yapmadan 401 alıyor — aksi halde herkes kendi aboneliğini
 * "ödendi" diye işaretletebilirdi.
 *
 * iyzico 2xx alana kadar 15 dakikada bir, en fazla 3 kez tekrar deniyor. Bu
 * yüzden *bizim* hatalarımızda (veritabanı düşmüş) 5xx dönüp tekrarı davet
 * ediyoruz, ama tanımadığımız olay türlerinde 200 dönüyoruz: onları tekrar
 * denemek de aynı sonucu verirdi.
 */

/** Yenileme başarılıysa dönemin ne kadar uzayacağı. */
function nextPeriodEnd(): string {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export async function POST(request: NextRequest) {
  const config = iyzicoConfig();
  if (!config) {
    return NextResponse.json({ error: "iyzico yapılandırılmadı." }, { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Gövde okunamadı." }, { status: 400 });
  }

  if (!payload.iyziEventType) {
    return NextResponse.json({ error: "Olay türü yok." }, { status: 400 });
  }

  // Başlık adı büyük/küçük harf duyarsız okunuyor; Next başlıkları zaten
  // normalize ediyor ama uç elle test edilirken de çalışsın.
  const signature = request.headers.get("x-iyz-signature-v3");

  if (!verifyWebhook(config, payload, signature)) {
    // Kayda geçiyor: geçersiz imzalı isteklerin birden artması ya bir saldırı
    // ya da bizim anahtarımızın yanlış olduğu anlamına gelir; ikisi de
    // görülmeli.
    await recordSecurityEvent({
      kind: "unauthorized",
      severity: "warning",
      detail: {
        endpoint: "/api/iyzico/webhook",
        eventType: payload.iyziEventType,
        hasSignature: signature !== null,
      },
    });

    return NextResponse.json({ error: "İmza doğrulanamadı." }, { status: 401 });
  }

  const subscriptionRef = payload.subscriptionReferenceCode;
  if (!subscriptionRef) {
    return NextResponse.json({ ok: true, ignored: "abonelik referansı yok" });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  let update: Record<string, unknown>;

  switch (payload.iyziEventType) {
    case "subscription.order.success":
      update = {
        status: "active",
        current_period_end: nextPeriodEnd(),
        last_event_at: now,
        last_failure_reason: null,
      };
      break;

    case "subscription.order.failure":
      // Durum `past_due`, ama `current_period_end` **değişmiyor**: ödenmiş
      // dönemin kalan günleri kullanıcının hakkı. Erişim o tarih geçince
      // kendiliğinden kapanıyor (bkz. `has_subscription`).
      update = {
        status: "past_due",
        last_event_at: now,
        last_failure_reason: "Aylık yenileme tahsil edilemedi.",
      };
      break;

    default:
      // Tanımadığımız olay: 200 dön ki iyzico tekrar denemesin.
      return NextResponse.json({ ok: true, ignored: payload.iyziEventType });
  }

  const { data, error } = await admin
    .from("subscriptions")
    .update(update)
    .eq("iyzico_subscription_ref", subscriptionRef)
    .select("owner_id")
    .maybeSingle();

  if (error) {
    // Bizim tarafımızdaki hata: 5xx dönüp iyzico'nun tekrar denemesini
    // istiyoruz, yoksa bir yenileme sessizce kaybolurdu.
    return NextResponse.json({ error: "Kayıt güncellenemedi." }, { status: 503 });
  }

  if (!data) {
    // Tanımadığımız bir abonelik — muhtemelen başka bir ortamdan (sandbox
    // yerine canlı, ya da tersi) geliyor. Tekrar denemenin faydası yok.
    return NextResponse.json({ ok: true, ignored: "eşleşen abonelik yok" });
  }

  revalidatePath("/abonelik");
  revalidatePath("/admin", "layout");

  return NextResponse.json({ ok: true });
}
