import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSecurityEvent } from "@/lib/security";

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

  // Günlük bakım: güvenlik kayıtları 90 günden eskiyse silinsin. Zaten her sabah
  // çalışan tek zamanlanmış iş burası, ayrı bir cron açmaya değmez.
  await supabase.rpc("prune_security_events");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, product_id, customer_name, end_date, products(name)")
    .eq("end_date", tomorrow)
    .neq("status", "cancelled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const rows = bookings.map((b) => ({
    booking_id: b.id,
    product_id: b.product_id,
    message: `${b.customer_name} adlı kiracının "${
      (b.products as unknown as { name: string } | null)?.name ?? "bir ürün"
    }" kiralaması yarın teslim edilmeli.`,
  }));

  // The unique index on notifications.booking_id de-dupes if the job re-runs.
  const { error: insertError, count } = await supabase
    .from("notifications")
    .upsert(rows, { onConflict: "booking_id", ignoreDuplicates: true, count: "exact" });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: count ?? rows.length });
}
