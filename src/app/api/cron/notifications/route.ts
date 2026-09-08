import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSecurityEvent } from "@/lib/security";
import { tokenTazele } from "@/lib/instagram/graph";

/**
 * Guards the only endpoint that reaches for the service-role key, so it has to
 * fail closed.
 *
 * A plain `header !== \`Bearer ${process.env.CRON_SECRET}\`` compares against
 * the literal "Bearer undefined" when the variable is missing, which would hand
 * an RLS-bypassing client to anyone who guessed that. Here a missing secret is
 * a configuration error, not an open door. The comparison itself is constant
 * time; lengths are checked first because `timingSafeEqual` throws when the
 * buffers differ in size.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");

  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

function tomorrowDateString() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    // Bu uca yalnızca Vercel Cron gelir. Başka biri denediyse ya anahtarı
    // arıyor ya da bulmuş — ikisi de anında bilinmeli, o yüzden `critical`.
    await recordSecurityEvent({
      kind: "cron_unauthorized",
      severity: "critical",
      detail: { hasHeader: request.headers.has("authorization") },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const tomorrow = tomorrowDateString();

  // Günlük bakım: güvenlik kayıtları 90, QR okutma kayıtları 400 günden eskiyse
  // silinsin, kapanmış sekmelerden kalan etkinlik satırları da temizlensin.
  // Zaten her sabah çalışan tek zamanlanmış iş burası, ayrı bir cron açmaya
  // değmez.
  await Promise.all([
    supabase.rpc("prune_security_events"),
    supabase.rpc("prune_product_scans"),
    supabase.rpc("prune_presence"),
    supabase.rpc("prune_instagram_events"),
    // Başlangıç tarihi geçmiş talepler artık onaylanamaz; bekleyen listede
    // durmaları satıcıyı yanıltırdı.
    supabase.rpc("expire_booking_requests"),
  ]);

  await instagramBelirteclerimiTazele(supabase);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, product_id, customer_name, end_date, products(name, owner_id)")
    .eq("end_date", tomorrow)
    .neq("status", "cancelled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const rows = bookings.flatMap((b) => {
    const product = b.products as unknown as { name: string; owner_id: string } | null;

    // Ürünü silinmiş bir rezervasyonun bildirimi kimseye ait olamaz.
    if (!product) return [];

    return [
      {
        booking_id: b.id,
        product_id: b.product_id,
        owner_id: product.owner_id,
        kind: "iade",
        message: `${b.customer_name} adlı kiracının "${product.name}" kiralaması yarın teslim edilmeli.`,
      },
    ];
  });

  // The unique index on notifications.booking_id de-dupes if the job re-runs.
  const { error: insertError, count } = await supabase
    .from("notifications")
    .upsert(rows, { onConflict: "booking_id", ignoreDuplicates: true, count: "exact" });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: count ?? rows.length });
}

/**
 * Instagram belirteçlerinin tazelenmesi.
 *
 * Uzun ömürlü belirteç 60 gün yaşıyor ve süresi dolduğunda entegrasyon *sessizce*
 * duruyor: webhook gelmeye devam ediyor, cevap gidemiyor. Satıcının bunu
 * müşterisinden öğrenmemesi için son on güne girenler her sabah yenileniyor.
 *
 * Yenilenemeyen bağlantı kapatılıyor (`is_active = false`) — cevapsız kalan bir
 * sohbet, kapalı olduğu bilinen bir sohbetten daha kötü. Panel bunu bağlantı
 * ekranında gösteriyor.
 */
async function instagramBelirteclerimiTazele(
  supabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  const esik = new Date(Date.now() + 10 * 86_400_000).toISOString();

  const { data: hesaplar } = await supabase
    .from("instagram_accounts")
    .select("owner_id, access_token")
    .eq("is_active", true)
    .not("token_expires_at", "is", null)
    .lt("token_expires_at", esik);

  for (const hesap of hesaplar ?? []) {
    const sonuc = await tokenTazele(hesap.access_token as string);

    if (sonuc.ok) {
      await supabase
        .from("instagram_accounts")
        .update({
          access_token: sonuc.token,
          token_expires_at: sonuc.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("owner_id", hesap.owner_id);
    } else {
      console.error("[instagram] belirteç tazelenemedi", sonuc.hata);
      await supabase
        .from("instagram_accounts")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("owner_id", hesap.owner_id);
    }
  }
}
