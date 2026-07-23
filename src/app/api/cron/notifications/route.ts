import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function tomorrowDateString() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const tomorrow = tomorrowDateString();

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
    message: `${b.customer_name}'s rental of "${
      (b.products as unknown as { name: string } | null)?.name ?? "a product"
    }" is due back tomorrow.`,
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
