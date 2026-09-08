import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  bookedCountByDate,
  firstSoldOutDate,
  formatDateRange,
  nightsBetween,
} from "@/lib/bookings";
import { DELIVERY_MODE_LABEL, type DeliveryMode } from "@/lib/turnaround";
import { IconInbox } from "@/components/icons";
import TalepKarti, { type Talep } from "@/components/instagram/TalepKarti";

/**
 * Instagram'dan gelen rezervasyon talepleri.
 *
 * Ekranın tek işi satıcının "olur" ya da "olmaz" diyebilmesi, ama bunu bilerek
 * söyleyebilmesi: her talebin yanında ürünün o tarihlerde gerçekten müsait
 * olup olmadığı *şu an* hesaplanıyor. Talep açıldığında müsaitti diye onay
 * anında da müsait olacak diye bir kural yok — satıcı aradan geçen sürede
 * panelden başka bir rezervasyon açmış olabilir. Çakışma varsa kart bunu
 * söylüyor; söylemese bile onay veritabanında reddedilirdi, ama satıcının
 * bunu tıklamadan önce bilmesi gerekiyor.
 */

export const dynamic = "force-dynamic";

type KalemSatiri = {
  quantity: number;
  product_id: string;
  products: { name: string; barcode: string | null; stock: number } | null;
};

type TalepSatiri = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_city: string;
  customer_district: string;
  start_date: string;
  end_date: string;
  delivery_mode: DeliveryMode;
  blocked_start: string;
  blocked_end: string;
  status: string;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  group_id: string | null;
  booking_request_items: KalemSatiri[];
};

const SECIM =
  "id, customer_name, customer_phone, customer_city, customer_district, " +
  "start_date, end_date, delivery_mode, blocked_start, blocked_end, status, " +
  "decision_note, created_at, decided_at, group_id, " +
  "booking_request_items(quantity, product_id, products(name, barcode, stock))";

/**
 * Bekleyen taleplerin şu anki çakışma durumu.
 *
 * Tek sorgu: bütün taleplerin ürünleri ve en geniş tarih aralığı bir kerede
 * çekiliyor, sayım bellekte yapılıyor. Talep başına sorgu açmak, on beş
 * bekleyen talebi olan bir satıcıda ekranı yavaşlatırdı.
 */
async function cakismalariHesapla(
  supabase: Awaited<ReturnType<typeof createClient>>,
  talepler: TalepSatiri[]
): Promise<Record<string, string>> {
  const urunIdleri = [
    ...new Set(talepler.flatMap((talep) => talep.booking_request_items.map((k) => k.product_id))),
  ];

  if (urunIdleri.length === 0) return {};

  const enErken = talepler.reduce(
    (min, talep) => (talep.blocked_start < min ? talep.blocked_start : min),
    talepler[0].blocked_start
  );
  const enGec = talepler.reduce(
    (max, talep) => (talep.blocked_end > max ? talep.blocked_end : max),
    talepler[0].blocked_end
  );

  const { data } = await supabase
    .from("bookings")
    .select("product_id, blocked_start, blocked_end, start_date, end_date")
    .in("product_id", urunIdleri)
    .neq("status", "cancelled")
    .gte("blocked_end", enErken)
    .lte("blocked_start", enGec);

  const urunBasina = new Map<string, { start_date: string; end_date: string }[]>();

  for (const satir of data ?? []) {
    const liste = urunBasina.get(satir.product_id as string) ?? [];
    liste.push({
      start_date: (satir.blocked_start ?? satir.start_date) as string,
      end_date: (satir.blocked_end ?? satir.end_date) as string,
    });
    urunBasina.set(satir.product_id as string, liste);
  }

  const cakismalar: Record<string, string> = {};

  for (const talep of talepler) {
    for (const kalem of talep.booking_request_items) {
      const stok = kalem.products?.stock ?? 0;
      const sayim = bookedCountByDate(urunBasina.get(kalem.product_id) ?? []);
      const dolu = firstSoldOutDate(
        sayim,
        stok,
        talep.blocked_start,
        talep.blocked_end,
        kalem.quantity
      );

      if (dolu) {
        cakismalar[talep.id] =
          `${kalem.products?.name ?? "Ürün"} — ${formatDateRange(dolu, dolu)} tarihinde müsait değil.`;
        break;
      }
    }
  }

  return cakismalar;
}

function talebeCevir(satir: TalepSatiri, cakisma: string | undefined): Talep {
  return {
    id: satir.id,
    ad: satir.customer_name,
    telefon: satir.customer_phone,
    bolge: `${satir.customer_city} / ${satir.customer_district}`,
    tarihler: formatDateRange(satir.start_date, satir.end_date),
    gunSayisi: nightsBetween(satir.start_date, satir.end_date) + 1,
    blokeAralik: formatDateRange(satir.blocked_start, satir.blocked_end),
    teslimat: DELIVERY_MODE_LABEL[satir.delivery_mode],
    olusturuldu: satir.created_at,
    durum: satir.status,
    not: satir.decision_note,
    grupId: satir.group_id,
    cakisma: cakisma ?? null,
    kalemler: satir.booking_request_items.map((kalem) => ({
      ad: kalem.products?.name ?? "Silinmiş ürün",
      kod: kalem.products?.barcode ?? null,
      adet: kalem.quantity,
    })),
  };
}

export default async function TaleplerPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  const [{ data: bekleyenler }, { data: sonuclananlar }] = await Promise.all([
    supabase
      .from("booking_requests")
      .select(SECIM)
      .eq("owner_id", user?.id ?? "")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("booking_requests")
      .select(SECIM)
      .eq("owner_id", user?.id ?? "")
      .neq("status", "pending")
      .order("decided_at", { ascending: false })
      .limit(10),
  ]);

  const bekleyen = (bekleyenler ?? []) as unknown as TalepSatiri[];
  const gecmis = (sonuclananlar ?? []) as unknown as TalepSatiri[];
  const cakismalar = await cakismalariHesapla(supabase, bekleyen);

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto flex-col gap-1 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Talepler</h1>
          <p className="text-sm text-ink-muted">
            Instagram’dan gelen rezervasyon istekleri. Onayladığınızda rezervasyon oluşur.
          </p>
        </div>
        <Link href="/admin/instagram" className="btn btn-secondary self-start sm:self-auto">
          Instagram bağlantısı
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-4 sm:p-8">
        {bekleyen.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 border-dashed py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-ink-muted">
              <IconInbox className="h-6 w-6" />
            </span>
            <p className="font-semibold text-ink">Bekleyen talep yok</p>
            <p className="max-w-sm text-sm text-ink-muted">
              Müşteriler Instagram’dan mesaj atarak rezervasyon isteyebilir. Gelen istekler onayınız
              için burada birikir.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Onay bekleyen ({bekleyen.length})
            </h2>
            {bekleyen.map((satir, sira) => (
              <TalepKarti
                key={satir.id}
                talep={talebeCevir(satir, cakismalar[satir.id])}
                delay={sira * 40}
              />
            ))}
          </section>
        )}

        {gecmis.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Sonuçlananlar
            </h2>
            {gecmis.map((satir) => (
              <TalepKarti key={satir.id} talep={talebeCevir(satir, undefined)} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
