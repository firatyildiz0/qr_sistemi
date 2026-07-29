"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bookedCountByDate,
  computeOccupancySpan,
  firstSoldOutDate,
  formatDateRange,
  nightsBetween,
  occupancySpanError,
} from "@/lib/bookings";
import { getTurnaroundForOwner } from "@/lib/settings";
import {
  deliveryModeForCity,
  isDeliveryMode,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";
import { isDistrictOf, isProvince } from "@/lib/turkiye";

export type BookingFormState = { error: string | null; success?: boolean };

/**
 * Ownership check that also hands back the owner id, because the turnaround
 * settings that decide the blocked window are stored per seller.
 */
async function assertProductOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  denied = "Bu rezervasyonu değiştirme yetkiniz yok."
): Promise<{ error: string } | { ownerId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Bunu yapmak için giriş yapmalısınız." };

  const { data: product } = await supabase
    .from("products")
    .select("owner_id")
    .eq("id", productId)
    .single();

  if (!product || product.owner_id !== user.id) {
    return { error: denied };
  }

  return { ownerId: product.owner_id };
}

/**
 * Stock is what limits a date, not the calendar: two units means two bookings
 * can share the same day, and only the day where the last unit goes out is
 * refused. Returns a ready-to-show message, or null when the range fits.
 *
 * Karşılaştırılan aralık kiralama günleri değil meşguliyet aralığı: ürün kına
 * gününden önce yola çıkıyor, düğünden sonra da dönüp temizleniyor. Yani iki
 * rezervasyonun kiralama günleri hiç kesişmese bile kargo süreleri kesişiyorsa
 * ikincisi reddedilir.
 */
async function stockConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  blocked: { start_date: string; end_date: string },
  excludeBookingId?: string
): Promise<string | null> {
  let bookingsQuery = supabase
    .from("bookings")
    .select("id, start_date, end_date, delivery_mode, blocked_start, blocked_end")
    .eq("product_id", productId)
    .neq("status", "cancelled")
    // Meşguliyeti istek başlamadan bitmiş rezervasyonlar etkileyemez.
    .gte("blocked_end", blocked.start_date)
    .lte("blocked_start", blocked.end_date);

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

  const counts = bookedCountByDate(
    (existing ?? []).map((booking) => ({
      start_date: booking.blocked_start ?? booking.start_date,
      end_date: booking.blocked_end ?? booking.end_date,
    }))
  );
  const soldOut = firstSoldOutDate(
    counts,
    product.stock,
    blocked.start_date,
    blocked.end_date
  );
  if (!soldOut) return null;

  return `${formatDateRange(soldOut, soldOut)} tarihinde ürün müsait değil (${product.stock} adet stok, kargo ve hazırlık süreleri dahil). Başka tarih seçin.`;
}

const MAX_ADDRESS_LENGTH = 500;

type AddressFields = {
  customer_city: string;
  customer_district: string;
  customer_address: string | null;
};

/**
 * İl ve ilçe artık zorunlu: ürünün kaç gün bloke kalacağı teslimatın Bursa
 * içinde mi dışında mı olduğuna bağlı, dolayısıyla il olmadan takvim doğru
 * hesaplanamaz. Açık adres opsiyonel kalır.
 *
 * Tarayıcıdaki seçim listesi tutarlılığı zaten sağlıyor; buradaki kontroller
 * elle atılan isteğe karşı.
 */
function readAddress(
  formData: FormData
): { error: string } | { values: AddressFields } {
  const city = String(formData.get("customer_city") ?? "").trim();
  const district = String(formData.get("customer_district") ?? "").trim();
  const address = String(formData.get("customer_address") ?? "").trim();

  if (!city) {
    return { error: "İl seçimi zorunludur — teslimat süresi buna göre hesaplanıyor." };
  }
  if (!isProvince(city)) {
    return { error: "Geçersiz il seçimi." };
  }
  if (!district) {
    return { error: "İlçe seçimi zorunludur." };
  }
  if (!isDistrictOf(city, district)) {
    return { error: `${district}, ${city} iline ait bir ilçe değil.` };
  }
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { error: `Açık adres en fazla ${MAX_ADDRESS_LENGTH} karakter olabilir.` };
  }

  return {
    values: {
      customer_city: city,
      customer_district: district,
      customer_address: address || null,
    },
  };
}

/**
 * Teslimat şekli ilden türetilir, ama satıcı bunu değiştirebilir: İstanbul'dan
 * gelip ürünü elden alan müşteri de var, Bursa'nın uzak ilçesine kargolanan
 * ürün de. Form alanı yoksa (ya da tanınmayan bir değer geldiyse) il kazanır.
 */
function readDeliveryMode(formData: FormData, city: string): DeliveryMode {
  const raw = formData.get("delivery_mode");
  return isDeliveryMode(raw) ? raw : deliveryModeForCity(city);
}

/**
 * Rezervasyonun ürünü fiilen kapattığı aralık. Okuma anında değil kayıt anında
 * hesaplanıp saklanıyor; böylece hem müsaitlik sorguları hem veritabanındaki
 * stok trigger'ı tek bir kolon çiftine bakabiliyor.
 *
 * Ayarlardaki süreler ortalamayı anlatıyor, tek bir rezervasyon onlara
 * uymayabilir — o yüzden satıcı formda tarihleri elle de girebiliyor. Alanlar
 * gelmişse (ya da bozuksa) hesaplanan aralığa düşülür; geldiyse `bookings`
 * tablosundaki `bookings_blocked_range` kısıtıyla aynı kural uygulanır.
 */
function readBlocked(
  formData: FormData,
  startDate: string,
  endDate: string,
  mode: DeliveryMode,
  turnaround: Turnaround
): { error: string } | { values: { blocked_start: string; blocked_end: string } } {
  const computed = computeOccupancySpan(startDate, endDate, mode, turnaround);
  const start = String(formData.get("blocked_start") ?? "").trim();
  const end = String(formData.get("blocked_end") ?? "").trim();
  const span = start && end ? { start_date: start, end_date: end } : computed;

  const error = occupancySpanError(span, startDate, endDate);
  if (error) return { error };

  return { values: { blocked_start: span.start_date, blocked_end: span.end_date } };
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
  const owner = await assertProductOwner(
    supabase,
    productId,
    "Bu ürüne rezervasyon ekleme yetkiniz yok."
  );
  if ("error" in owner) return { error: owner.error };

  const turnaround = await getTurnaroundForOwner(supabase, owner.ownerId);
  const delivery_mode = readDeliveryMode(formData, address.values.customer_city);
  const blockedField = readBlocked(
    formData,
    start_date,
    end_date,
    delivery_mode,
    turnaround
  );
  if ("error" in blockedField) return { error: blockedField.error };
  const blocked = blockedField.values;

  try {
    const conflict = await stockConflict(supabase, productId, {
      start_date: blocked.blocked_start,
      end_date: blocked.blocked_end,
    });
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
    delivery_mode,
    ...blocked,
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

  const owner = await assertProductOwner(supabase, productId);
  if ("error" in owner) return { error: owner.error };

  const turnaround = await getTurnaroundForOwner(supabase, owner.ownerId);
  const delivery_mode = readDeliveryMode(formData, address.values.customer_city);
  const blockedField = readBlocked(
    formData,
    start_date,
    end_date,
    delivery_mode,
    turnaround
  );
  if ("error" in blockedField) return { error: blockedField.error };
  const blocked = blockedField.values;

  try {
    const conflict = await stockConflict(
      supabase,
      productId,
      { start_date: blocked.blocked_start, end_date: blocked.blocked_end },
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
      delivery_mode,
      ...blocked,
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

  const owner = await assertProductOwner(supabase, productId);
  if ("error" in owner) throw new Error(owner.error);

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
