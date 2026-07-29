import type { createClient } from "@/lib/supabase/server";
import { addDays, availabilityOf, type Availability } from "@/lib/bookings";
import {
  MAX_TURNAROUND_DAYS,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";

/**
 * Toplu rezervasyon ürün seçicisinin ihtiyaç duyduğu şey: satıcının bütün
 * ürünleri, her birinin gün gün müsaitliğiyle birlikte. Seçici tarayıcıda
 * çalıştığı için müsaitliği orada tekrar sorgulayamaz — satıcı listeden bir
 * ürün seçtiği anda "bu tarihlerde 2 adet kaldı" yazabilmesi lazım.
 */
export type CatalogProduct = {
  id: string;
  name: string;
  stock: number;
  dailyPrice: number | null;
  availability: Availability;
};

type BookingRow = {
  product_id: string;
  start_date: string;
  end_date: string;
  delivery_mode: DeliveryMode | null;
  blocked_start: string | null;
  blocked_end: string | null;
  customer_city: string | null;
};

/**
 * Satıcının kataloğu, ürün adına göre sıralı.
 *
 * Geçmişte bitmiş rezervasyonlar bugünden sonrasını etkileyemez, o yüzden
 * sorgu son `MAX_TURNAROUND_DAYS` günle sınırlı: kuyruğu (iade + temizlik) hâlâ
 * devam ediyor olabilecek kayıtlar dahil, gerisi değil. Seçicinin baktığı
 * tarihler her zaman bugün ya da sonrası olduğu için bu kayıp değil.
 */
export async function getOwnerCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  turnaround: Turnaround
): Promise<CatalogProduct[]> {
  const since = addDays(new Date().toISOString().slice(0, 10), -MAX_TURNAROUND_DAYS);

  const [{ data: products }, { data: bookings }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, stock, daily_price")
      .eq("owner_id", ownerId)
      .order("name"),
    supabase
      .from("bookings")
      .select(
        "product_id, start_date, end_date, delivery_mode, blocked_start, blocked_end, customer_city, products!inner(owner_id)"
      )
      .eq("products.owner_id", ownerId)
      .neq("status", "cancelled")
      .gte("end_date", since),
  ]);

  const byProduct = new Map<string, BookingRow[]>();
  for (const row of (bookings ?? []) as unknown as BookingRow[]) {
    const list = byProduct.get(row.product_id);
    if (list) list.push(row);
    else byProduct.set(row.product_id, [row]);
  }

  return (products ?? []).map((product) => ({
    id: product.id as string,
    name: product.name as string,
    stock: product.stock as number,
    dailyPrice: (product.daily_price ?? null) as number | null,
    availability: availabilityOf(byProduct.get(product.id) ?? [], turnaround),
  }));
}

/** Toplu rezervasyonun bir kalemi: ürün ve o rezervasyondaki adedi. */
export type GroupMember = { productId: string; name: string; quantity: number };

/**
 * Toplu rezervasyonların içerikleri, grup kimliğine göre.
 *
 * Bir ürünün sayfası yalnızca kendi rezervasyonlarını listeliyor, oysa toplu
 * alımın diğer ürünleri başka sayfalarda duruyor. Satıcının "bu müşteri bir de
 * şunları almıştı"yı satırın üstünde görebilmesi için grubun tamamı burada
 * toplanıyor. İptal edilenler sayılmıyor — onlar artık siparişin parçası değil.
 */
export async function getBookingGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string
): Promise<Record<string, GroupMember[]>> {
  const { data } = await supabase
    .from("bookings")
    .select("group_id, product_id, products!inner(name, owner_id)")
    .eq("products.owner_id", ownerId)
    .neq("status", "cancelled")
    .not("group_id", "is", null);

  const groups: Record<string, GroupMember[]> = {};

  for (const row of data ?? []) {
    const groupId = row.group_id as string;
    const productId = row.product_id as string;
    const name = (row.products as unknown as { name: string }).name;

    const members = (groups[groupId] ??= []);
    const existing = members.find((member) => member.productId === productId);

    if (existing) existing.quantity += 1;
    else members.push({ productId, name, quantity: 1 });
  }

  return groups;
}
