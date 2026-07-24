"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rangesOverlap } from "@/lib/bookings";

export type BookingFormState = { error: string | null; success?: boolean };

async function assertProductOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Bunu yapmak için giriş yapmalısınız.";

  const { data: product } = await supabase
    .from("products")
    .select("owner_id")
    .eq("id", productId)
    .single();

  if (!product || product.owner_id !== user.id) {
    return "Bu rezervasyonu değiştirme yetkiniz yok.";
  }

  return null;
}

async function hasOverlap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
) {
  let query = supabase
    .from("bookings")
    .select("id, start_date, end_date")
    .eq("product_id", productId)
    .neq("status", "cancelled");

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data: existing, error } = await query;
  if (error) throw new Error(error.message);

  return (existing ?? []).some((b) =>
    rangesOverlap(startDate, endDate, b.start_date, b.end_date)
  );
}

function validateDates(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return "Başlangıç ve bitiş tarihi gereklidir.";
  if (endDate < startDate) return "Bitiş tarihi başlangıç tarihiyle aynı veya sonrasında olmalıdır.";
  return null;
}

export async function createBooking(
  productId: string,
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");

  if (!customer_name) {
    return { error: "Müşteri adı gereklidir." };
  }

  const dateError = validateDates(start_date, end_date);
  if (dateError) return { error: dateError };

  const supabase = await createClient();

  try {
    if (await hasOverlap(supabase, productId, start_date, end_date)) {
      return { error: "Bu tarihler mevcut bir rezervasyonla çakışıyor." };
    }
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { error } = await supabase.from("bookings").insert({
    product_id: productId,
    customer_name,
    customer_phone: customer_phone || null,
    start_date,
    end_date,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/product/${productId}`);
  return { error: null, success: true };
}

export async function editBooking(
  productId: string,
  bookingId: string,
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const customer_name = String(formData.get("customer_name") ?? "").trim();
  const customer_phone = String(formData.get("customer_phone") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "");
  const end_date = String(formData.get("end_date") ?? "");

  if (!customer_name) {
    return { error: "Müşteri adı gereklidir." };
  }

  const dateError = validateDates(start_date, end_date);
  if (dateError) return { error: dateError };

  const supabase = await createClient();

  const ownerError = await assertProductOwner(supabase, productId);
  if (ownerError) return { error: ownerError };

  try {
    if (await hasOverlap(supabase, productId, start_date, end_date, bookingId)) {
      return { error: "Bu tarihler mevcut bir rezervasyonla çakışıyor." };
    }
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ customer_name, customer_phone: customer_phone || null, start_date, end_date })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/product/${productId}`);
  return { error: null, success: true };
}

export async function cancelBooking(productId: string, bookingId: string) {
  const supabase = await createClient();

  const ownerError = await assertProductOwner(supabase, productId);
  if (ownerError) throw new Error(ownerError);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/product/${productId}`);
}
