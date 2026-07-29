"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bookedCountByDate,
  computeOccupancySpan,
  firstSoldOutDate,
  formatDateRange,
  MAX_BOOKING_ITEMS,
  MAX_ITEM_QUANTITY,
  nightsBetween,
  occupancySpan,
  occupancySpanError,
  type DateSpan,
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

/** Rezervasyona giren tek bir kalem: bir ürün ve ondan kaç adet istendiği. */
export type BookingItem = { product_id: string; quantity: number };

/** Ürünün adı ve stoğu çözülmüş hali; hata mesajları ürünü adıyla anıyor. */
type ResolvedItem = BookingItem & { name: string; stock: number };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ürün sepeti forma JSON olarak geliyor: `[{"product_id":"…","quantity":2}]`.
 * Aynı ürün listede iki kez görünürse adetleri toplanır — satıcı hem listeden
 * seçip hem QR okuttuğunda bu oluyor ve iki ayrı satır göstermek yanıltıcı
 * olurdu.
 */
function readItems(
  formData: FormData,
  /** Sepet hiç gönderilmediğinde varsayılan ürün; yoksa sepet zorunlu. */
  fallbackProductId: string | null
): { error: string } | { values: BookingItem[] } {
  const raw = String(formData.get("items") ?? "").trim();

  // Alan hiç gelmediyse tek ürünlü klasik rezervasyon: taranan ürün, 1 adet.
  if (!raw) {
    return fallbackProductId
      ? { values: [{ product_id: fallbackProductId, quantity: 1 }] }
      : { error: "Rezervasyona en az bir ürün eklemelisiniz." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Ürün listesi okunamadı. Sayfayı yenileyip tekrar deneyin." };
  }

  if (!Array.isArray(parsed)) {
    return { error: "Ürün listesi okunamadı. Sayfayı yenileyip tekrar deneyin." };
  }

  const merged = new Map<string, number>();

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      return { error: "Geçersiz ürün seçimi." };
    }

    const { product_id: productId, quantity } = entry as Record<string, unknown>;

    if (typeof productId !== "string" || !UUID_PATTERN.test(productId)) {
      return { error: "Geçersiz ürün seçimi." };
    }

    const amount = Math.trunc(Number(quantity ?? 1));
    if (!Number.isFinite(amount) || amount < 1) {
      return { error: "Adet en az 1 olmalıdır." };
    }

    merged.set(productId, (merged.get(productId) ?? 0) + amount);
  }

  if (merged.size === 0) {
    return { error: "Rezervasyona en az bir ürün eklemelisiniz." };
  }
  if (merged.size > MAX_BOOKING_ITEMS) {
    return { error: `Bir rezervasyonda en fazla ${MAX_BOOKING_ITEMS} farklı ürün olabilir.` };
  }
  for (const amount of merged.values()) {
    if (amount > MAX_ITEM_QUANTITY) {
      return { error: `Aynı üründen en fazla ${MAX_ITEM_QUANTITY} adet seçebilirsiniz.` };
    }
  }

  return {
    values: [...merged].map(([product_id, quantity]) => ({ product_id, quantity })),
  };
}

/**
 * Sepetteki her ürünün gerçekten bu satıcıya ait olduğunu doğrular ve adıyla
 * stoğunu döndürür. Sepet tarayıcıdan geldiği için tek tek kontrol ediliyor;
 * `bookings_insert_owner` politikası zaten arkada duruyor ama oraya düşen hata
 * satıcıya hangi ürünün sorunlu olduğunu söylemez.
 */
async function resolveItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  items: BookingItem[]
): Promise<{ error: string } | { values: ResolvedItem[] }> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock, owner_id")
    .in(
      "id",
      items.map((item) => item.product_id)
    );

  if (error) return { error: error.message };

  const byId = new Map((data ?? []).map((product) => [product.id as string, product]));
  const values: ResolvedItem[] = [];

  for (const item of items) {
    const product = byId.get(item.product_id);

    if (!product || product.owner_id !== ownerId) {
      return { error: "Seçilen ürünlerden biri size ait değil." };
    }

    values.push({
      ...item,
      name: product.name as string,
      stock: product.stock as number,
    });
  }

  return { values };
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
 *
 * Sepetin tamamı tek sorguda kontrol ediliyor ve istenen adet hesaba katılıyor:
 * aynı üründen üç adet isteyen satıcıya, o gün iki ünite boş olması yetmez.
 */
async function stockConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: ResolvedItem[],
  blocked: DateSpan,
  /** Düzenlenen satırlar: kendi günlerini kendilerine kapatmasınlar. */
  excludeBookingIds: string[] = []
): Promise<string | null> {
  let bookingsQuery = supabase
    .from("bookings")
    .select("id, product_id, start_date, end_date, blocked_start, blocked_end")
    .in(
      "product_id",
      items.map((item) => item.product_id)
    )
    .neq("status", "cancelled")
    // Meşguliyeti istek başlamadan bitmiş rezervasyonlar etkileyemez.
    .gte("blocked_end", blocked.start_date)
    .lte("blocked_start", blocked.end_date);

  if (excludeBookingIds.length > 0) {
    bookingsQuery = bookingsQuery.not(
      "id",
      "in",
      `(${excludeBookingIds.join(",")})`
    );
  }

  const { data: existing, error } = await bookingsQuery;
  if (error) throw new Error(error.message);

  const named = items.length > 1;

  for (const item of items) {
    if (item.stock <= 0) {
      return named
        ? `${item.name} stokta yok, rezervasyona eklenemez.`
        : "Bu ürün stokta yok, rezervasyon oluşturulamaz.";
    }

    const counts = bookedCountByDate(
      (existing ?? [])
        .filter((booking) => booking.product_id === item.product_id)
        .map((booking) => ({
          start_date: booking.blocked_start ?? booking.start_date,
          end_date: booking.blocked_end ?? booking.end_date,
        }))
    );

    const soldOut = firstSoldOutDate(
      counts,
      item.stock,
      blocked.start_date,
      blocked.end_date,
      item.quantity
    );

    if (soldOut) {
      const subject = named ? `${item.name} için` : "";
      const wanted = item.quantity > 1 ? `${item.quantity} adet ` : "";
      return `${formatDateRange(soldOut, soldOut)} tarihinde ${subject} ${wanted}müsait ürün yok (${item.stock} adet stok, kargo ve hazırlık süreleri dahil).`
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return null;
}

/**
 * Grubun satırlarını tek işlemde ekler. Biri stok yüzünden reddedilirse
 * hiçbiri kalmaz — yarım kalmış bir rezervasyon, satıcının müşteriye söz verip
 * ürünün elinde olmadığını sonradan görmesi demek olurdu.
 */
async function insertBookingGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  items: BookingItem[],
  shared: {
    customer_name: string;
    customer_phone: string | null;
    customer_city: string;
    customer_district: string;
    customer_address: string | null;
    start_date: string;
    end_date: string;
    delivery_mode: DeliveryMode;
    blocked_start: string;
    blocked_end: string;
  }
): Promise<string | null> {
  const { error } = await supabase.rpc("create_booking_group", {
    p_group_id: groupId,
    p_items: items,
    p_customer_name: shared.customer_name,
    p_customer_phone: shared.customer_phone,
    p_customer_city: shared.customer_city,
    p_customer_district: shared.customer_district,
    p_customer_address: shared.customer_address,
    p_start_date: shared.start_date,
    p_end_date: shared.end_date,
    p_delivery_mode: shared.delivery_mode,
    p_blocked_start: shared.blocked_start,
    p_blocked_end: shared.blocked_end,
  });

  return error ? error.message : null;
}

/** Rezervasyonun dokunduğu her ürün sayfası ve panelin listeleri tazelenir. */
function revalidateBooking(productIds: string[]) {
  for (const productId of new Set(productIds)) {
    revalidatePath(`/product/${productId}`);
    revalidatePath(`/admin/products/${productId}`);
  }
  // The panel home lists every booking, so it goes stale on any change here.
  revalidatePath("/admin");
  revalidatePath("/admin/customers", "layout");
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

/**
 * Bir rezervasyon, bir müşteri, bir tarih aralığı — ama birden çok ürün.
 *
 * Toplu alım (dört ayrı ürün, ya da aynı üründen üç adet) tek bir kayıt gibi
 * görünse de veritabanında her ürün ve her adet kendi satırında duruyor: stok
 * kontrolü, müsaitlik takvimi ve bloke aralığı hep ürün-gün bazında sayıyor.
 * Satırları birbirine `group_id` bağlıyor, müşteri bilgileri hepsine kopyalanıyor.
 */
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

  const itemsField = readItems(formData, productId);
  if ("error" in itemsField) return { error: itemsField.error };

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

  // Sepetteki *diğer* ürünler için de aynı sahiplik kontrolü: taranan ürünün
  // sahibi olmak, listeden seçilen her ürünün sahibi olmak demek değil.
  const resolved = await resolveItems(supabase, owner.ownerId, itemsField.values);
  if ("error" in resolved) return { error: resolved.error };

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

  const span: DateSpan = {
    start_date: blocked.blocked_start,
    end_date: blocked.blocked_end,
  };

  try {
    const conflict = await stockConflict(supabase, resolved.values, span);
    if (conflict) return { error: conflict };
  } catch (err) {
    return { error: (err as Error).message };
  }

  const failure = await insertBookingGroup(
    supabase,
    crypto.randomUUID(),
    itemsField.values,
    {
      customer_name,
      customer_phone: customer_phone || null,
      ...address.values,
      start_date,
      end_date,
      delivery_mode,
      ...blocked,
    }
  );

  if (failure) return { error: failure };

  revalidateBooking([productId, ...itemsField.values.map((item) => item.product_id)]);
  return { error: null, success: true };
}

/**
 * Kayıtlı bir rezervasyona sonradan ürün ekler.
 *
 * Satıcı müşteriyle konuşurken listeyi büyütüyor: "bir de şu takı setini
 * alayım". Müşteri bilgileri, tarihler ve bloke aralığı mevcut kayıttan
 * okunuyor — form yalnızca ürünleri gönderiyor, çünkü hiçbiri yeniden
 * yazılmasın diye bu özellik istendi. Eklenen satırlar aynı gruba giriyor;
 * grubu olmayan eski bir rezervasyona ilk kez ürün eklenirken grup burada
 * oluşturulup mevcut satıra da yazılıyor.
 */
export async function addBookingItems(
  bookingId: string,
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Bunu yapmak için giriş yapmalısınız." };

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*, products!inner(owner_id)")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { error: "Rezervasyon bulunamadı." };
  }

  const productOwner = (booking.products as { owner_id: string } | null)?.owner_id;
  if (productOwner !== user.id) {
    return { error: "Bu rezervasyonu değiştirme yetkiniz yok." };
  }

  if (booking.status === "cancelled") {
    return { error: "İptal edilmiş bir rezervasyona ürün eklenemez." };
  }

  const itemsField = readItems(formData, null);
  if ("error" in itemsField) return { error: itemsField.error };

  const resolved = await resolveItems(supabase, user.id, itemsField.values);
  if ("error" in resolved) return { error: resolved.error };

  if (!booking.customer_city || !booking.customer_district) {
    return {
      error:
        "Bu rezervasyonun il/ilçe bilgisi eksik. Önce rezervasyonu düzenleyip adresi tamamlayın.",
    };
  }

  const turnaround = await getTurnaroundForOwner(supabase, user.id);
  // Eklenen ürünler mevcut kaydın aralığını birebir devralıyor: aynı müşteri,
  // aynı teslimat, aynı günler. Kayıtta bloke aralığı yoksa (kolonlardan önceki
  // rezervasyonlar) ayarlardan hesaplanır.
  const span = occupancySpan(booking, turnaround);
  const delivery_mode =
    booking.delivery_mode ?? deliveryModeForCity(booking.customer_city);

  try {
    const conflict = await stockConflict(supabase, resolved.values, span);
    if (conflict) return { error: conflict };
  } catch (err) {
    return { error: (err as Error).message };
  }

  const groupId = booking.group_id ?? crypto.randomUUID();

  const failure = await insertBookingGroup(supabase, groupId, itemsField.values, {
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    customer_city: booking.customer_city,
    customer_district: booking.customer_district,
    customer_address: booking.customer_address,
    start_date: booking.start_date,
    end_date: booking.end_date,
    delivery_mode,
    blocked_start: span.start_date,
    blocked_end: span.end_date,
  });

  if (failure) return { error: failure };

  // Grubu olmayan kayda ilk ürün eklendi: mevcut satır da gruba katılmalı,
  // yoksa panel onu ayrı bir rezervasyon gibi gösterirdi. `group_id` stok
  // trigger'ının izlediği kolonlardan biri değil, bu update stok kontrolünü
  // yeniden çalıştırmıyor.
  if (!booking.group_id) {
    const { error } = await supabase
      .from("bookings")
      .update({ group_id: groupId })
      .eq("id", bookingId);

    if (error) return { error: error.message };
  }

  revalidateBooking([
    booking.product_id,
    ...itemsField.values.map((item) => item.product_id),
  ]);
  return { error: null, success: true };
}

/**
 * Kartın kapsadığı satır kimlikleri. İstemciden geldikleri için sorguya
 * girmeden önce şekilleri doğrulanıyor; hangi satırlara dokunulabileceğini ise
 * sorgudaki ürün ve sahiplik koşulu belirliyor.
 */
function readBookingIds(ids: string[]): { error: string } | { values: string[] } {
  const values = [...new Set(ids)];

  if (values.length === 0 || values.some((id) => !UUID_PATTERN.test(id))) {
    return { error: "Geçersiz rezervasyon seçimi." };
  }

  return { values };
}

/**
 * Bir kalemin düzenlenmesi. `bookingIds` aynı kartta toplanan satırların hepsi:
 * aynı üründen dört adet alınmışsa dördü birden aynı tarihlere taşınır, çünkü
 * satıcı listede tek bir kiralama görüyor.
 */
export async function editBooking(
  productId: string,
  bookingIds: string[],
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const ids = readBookingIds(bookingIds);
  if ("error" in ids) return { error: ids.error };

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

  // Düzenleme hep tek ürüne ait: grup içindeki bir kalemin tarihleri
  // değiştiğinde de kontrol edilmesi gereken yalnızca o ürünün stoğu — ama
  // kalem kaç adetse yeni tarihlerde o kadar ünite boş olmalı.
  const resolved = await resolveItems(supabase, owner.ownerId, [
    { product_id: productId, quantity: ids.values.length },
  ]);
  if ("error" in resolved) return { error: resolved.error };

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
      resolved.values,
      { start_date: blocked.blocked_start, end_date: blocked.blocked_end },
      ids.values
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
    .in("id", ids.values)
    .eq("product_id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidateBooking([productId]);
  return { error: null, success: true };
}

/**
 * Rezervasyonu kaydından tamamen siler.
 *
 * Eskiden iptal ediliyordu — satır kalıyor, yalnızca durumu değişiyordu. Satıcı
 * iptal edilmiş kayıtları listede taşımak istemediği için artık siliniyor;
 * ürünün o günleri de kayıt ortadan kalktığı anda yeniden müsait oluyor.
 *
 * Silinen, listede görünen kalemin tamamı: aynı üründen dört adet alınmışsa
 * dördü birden gider. Siparişin *öbür* ürünleri kalır — satıcı siparişten
 * yalnızca bir kalemi çıkarıyor olabilir.
 */
export async function deleteBooking(productId: string, bookingIds: string[]) {
  const ids = readBookingIds(bookingIds);
  if ("error" in ids) throw new Error(ids.error);

  const supabase = await createClient();

  const owner = await assertProductOwner(
    supabase,
    productId,
    "Bu rezervasyonu silme yetkiniz yok."
  );
  if ("error" in owner) throw new Error(owner.error);

  // `select()` so a delete blocked by RLS — which reports no error, just no
  // rows — fails loudly instead of looking like it worked.
  const { data: deleted, error } = await supabase
    .from("bookings")
    .delete()
    .in("id", ids.values)
    .eq("product_id", productId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if ((deleted ?? []).length === 0) {
    throw new Error("Rezervasyon bulunamadı ya da silme yetkiniz yok.");
  }

  revalidateBooking([productId]);
}
