import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { availabilityOf } from "@/lib/bookings";
import { getBookingGroups, getOwnerCatalog } from "@/lib/catalog";
import { getTurnaround } from "@/lib/settings";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";
import BookingForm from "@/components/booking/BookingForm";
import BookingList from "@/components/booking/BookingList";
import { IconQrCode, IconTag } from "@/components/icons";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: product },
    { data: bookings },
    // Ziyaretçi satıcı değilse RLS bunu okutmaz ve varsayılanlar döner — sorun
    // değil, çünkü kayıtlı rezervasyonların bloke aralığı zaten kendi
    // kolonlarında yazılı. Süreler yalnızca satıcının formundaki canlı
    // önizleme için gerekiyor.
    turnaround,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("bookings")
      .select("*")
      .eq("product_id", id)
      .order("start_date", { ascending: true }),
    getTurnaround(),
  ]);

  if (!product) notFound();

  const isOwner = user?.id === product.owner_id;
  const images: string[] = (product.images ?? []).slice(0, 2);

  // Toplu rezervasyon için satıcının bütün ürünleri ve grup içerikleri gerekiyor;
  // ziyaretçiye rezervasyon formu hiç gösterilmediği için o sorgular da atılmıyor.
  const [catalog, groups] = isOwner
    ? await Promise.all([
        getOwnerCatalog(supabase, product.owner_id, turnaround),
        getBookingGroups(supabase, product.owner_id),
      ])
    : [[], {}];

  // Per-day counts rather than plain ranges: a day is unavailable only when
  // as many bookings cover it as the product has units in stock. Sayılan
  // aralık kiralama günleri değil, ürünün elde olmadığı günler.
  const availability = availabilityOf(
    (bookings ?? []).filter((b: Booking) => b.status !== "cancelled"),
    turnaround
  );

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative h-64 overflow-hidden border-b border-border bg-surface sm:h-80">
        {images.length > 0 ? (
          <div className={`grid h-full ${images.length > 1 ? "grid-cols-2 gap-3" : "grid-cols-1"} p-3`}>
            {images.map((src: string, i: number) => (
              <div key={src} className="relative h-full">
                {/* object-contain, not cover: the whole product has to be
                    visible at its original proportions, never cropped. */}
                <Image
                  src={src}
                  alt={`${product.name} görseli ${i + 1}`}
                  fill
                  sizes={images.length > 1 ? "(max-width: 640px) 50vw, 320px" : "(max-width: 640px) 100vw, 640px"}
                  priority={i === 0}
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="diagonal-stripes absolute inset-0 opacity-40" />
            <IconQrCode className="h-20 w-20 text-ink-muted/30" strokeWidth={1} />
          </div>
        )}
        <div className="pill pill-accent absolute left-4 top-4">
          <IconQrCode className="h-3.5 w-3.5" /> QR ile tarandı
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-[28px] font-bold text-ink">{product.name}</h1>
            {product.daily_price != null && (
              <span className="pill pill-accent shrink-0 text-sm!">
                {formatPrice(product.daily_price)}/gün
              </span>
            )}
          </div>
          <p className="mt-2">
            <span className={`pill ${product.stock > 0 ? "pill-success" : "pill-danger"}`}>
              {product.stock > 0 ? `Stokta ${product.stock} adet` : "Stokta yok"}
            </span>
          </p>
          {product.description && (
            <p className="mt-3 text-ink-muted">{product.description}</p>
          )}
          {product.features && product.features.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.features.map((f: string) => (
                <li key={f} className="pill pill-muted">
                  <IconTag className="h-3 w-3" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">
            {isOwner ? "Yeni rezervasyon" : "Müsaitlik"}
          </h2>
          {isOwner ? (
            <BookingForm
              productId={id}
              availability={availability}
              stock={product.stock}
              turnaround={turnaround}
              catalog={catalog}
            />
          ) : (
            <AvailabilityCalendar availability={availability} stock={product.stock} />
          )}
        </section>

        {isOwner && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-ink">Kiralamalar</h2>
            <BookingList
              bookings={bookings ?? []}
              productId={id}
              stock={product.stock}
              turnaround={turnaround}
              catalog={catalog}
              groups={groups}
            />
          </section>
        )}
      </div>
    </main>
  );
}
