"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bookedCountByDate,
  firstSoldOutDate,
  formatDateRange,
  nightsBetween,
} from "@/lib/bookings";
import { isDistrictOf, isProvince } from "@/lib/turkiye";

export type BookingFormState = { error: string | null; success?: boolean };

async function assertProductOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  denied = "Bu rezervasyonu değiştirme yetkiniz yok."
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
    return denied;
  }

  return null;
}

/**
 * Stock is what limits a date, not the calendar: two units means two bookings
 * can share the same day, and only the day where the last unit goes out is
 * refused. Returns a ready-to-show message, or null when the range fits.
 */
async function stockConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<string | null> {
  let bookingsQuery = supabase
    .from("bookings")
    .select("id, start_date, end_date")
    .eq("product_id", productId)
    .neq("status", "cancelled")
    // Bookings that ended before the request starts can't affect it.
    .gte("end_date", startDate)
    .lte("start_date", endDate);

  if (excludeBookingId) {
    bookingsQuery = bookingsQuery.neq("id", excludeBookingId);
  }

  const [{ data: product, error: productError }, { data: existing, error }] =
    await Promise.all([
      supabase.from("products").select("stock").eq("id", productId).single(),
      bookingsQuery,
    ]);

  if (productError) throw new Error(productError.message);
  if (error) throw new Error(error.message);
  if (!product) throw new Error("Ürün bulunamadı.");

  if (product.stock <= 0) {
    return "Bu ürün stokta yok, rezervasyon oluşturulamaz.";
  }

  const counts = bookedCountByDate(existing ?? []);
  const soldOut = firstSoldOutDate(counts, product.stock, startDate, endDate);
  if (!soldOut) return null;

  return `${formatDateRange(soldOut, soldOut)} tarihinde stok dolu (${product.stock} adet), başka tarih seçin.`;
}

const MAX_ADDRESS_LENGTH = 500;

type AddressFields = {
  customer_city: string | null;
  customer_district: string | null;
  customer_address: string | null;
};

/**
 * Adres tamamen opsiyoneldir, ama girildiği kadarı tutarlı olmak zorunda:
 * ilçe kendi iline ait olmalı ve il olmadan ilçe gönderilememeli. Tarayıcıdaki
 * seçim listesi bunu zaten sağlar; buradaki kontrol elle atılan isteğe karşı.
 */
function readAddress(
  formData: FormData
): { error: string } | { values: AddressFields } {
  const city = String(formData.get("customer_city") ?? "").trim();
  const district = String(formData.get("customer_district") ?? "").trim();
  const address = String(formData.get("customer_address") ?? "").trim();

  if (city && !isProvince(city)) {
    return { error: "Geçersiz il seçimi." };
  }
  if (district && !city) {
    return { error: "İlçe seçmek için önce il seçin." };
  }
  if (district && !isDistrictOf(city, district)) {
    return { error: `${district}, ${city} iline ait bir ilçe değil.` };
  }
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { error: `Açık adres en fazla ${MAX_ADDRESS_LENGTH} karakter olabilir.` };
  }

  return {
    values: {
      customer_city: city || null,
      customer_district: district || null,
      customer_address: address || null,
    },
  };
}

/** Guards the per-day availability scan against an absurdly long range. */
const MAX_BOOKING_DAYS = 366;

function validateDates(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return "Başlangıç ve bitiş tarihi gereklidir.";
  if (endDate < startDate) return "Bitiş tarihi başlangıç tarihiyle aynı veya sonrasında olmalıdır.";
  if (nightsBetween(startDate, endDate) + 1 > MAX_BOOKING_DAYS) {
    return `Bir rezervasyon en fazla ${MAX_BOOKING_DAYS} gün sürebilir.`;
  }
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

  const address = readAddress(formData);
  if ("error" in address) return { error: address.error };

  const dateError = validateDates(start_date, end_date);
  if (dateError) return { error: dateError };

  const supabase = await createClient();

  // Only the seller books their own product. The public page renders a
  // read-only calendar, but that is presentation — this check (and the
  // matching RLS insert policy) is what stops a hand-rolled request from
  // filling someone else's calendar.
  const ownerError = await assertProductOwner(
    supabase,
    productId,
    "Bu ürüne rezervasyon ekleme yetkiniz yok."
  );
  if (ownerError) return { error: ownerError };

  try {
    const conflict = await stockConflict(supabase, productId, start_date, end_date);
    if (conflict) return { error: conflict };
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { error } = await supabase.from("bookings").insert({
    product_id: productId,
    customer_name,
    customer_phone: customer_phone || null,
    ...address.values,
    start_date,
    end_date,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/product/${productId}`);
  revalidatePath(`/admin/products/${productId}`);
  // The panel home lists every booking, so it goes stale on any change here.
  revalidatePath("/admin");
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

  const address = readAddress(formData);
  if ("error" in address) return { error: address.error };

  const dateError = validateDates(start_date, end_date);
  if (dateError) return { error: dateError };

  const supabase = await createClient();

  const ownerError = await assertProductOwner(supabase, productId);
  if (ownerError) return { error: ownerError };

  try {
    const conflict = await stockConflict(
      supabase,
      productId,
      start_date,
      end_date,
      bookingId
    );
    if (conflict) return { error: conflict };
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      customer_name,
      customer_phone: customer_phone || null,
      ...address.values,
      start_date,
      end_date,
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/product/${productId}`);
  revalidatePath(`/admin/products/${productId}`);
  // The panel home lists every booking, so it goes stale on any change here.
  revalidatePath("/admin");
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
  revalidatePath(`/admin/products/${productId}`);
  // The panel home lists every booking, so it goes stale on any change here.
  revalidatePath("/admin");
}
