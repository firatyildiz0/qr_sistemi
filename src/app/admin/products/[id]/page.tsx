import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProduct } from "@/app/admin/products/actions";
import ProductForm from "@/components/admin/ProductForm";
import QRCodeCard from "@/components/admin/QRCodeCard";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import type { Booking } from "@/lib/types";
import { availabilityOf } from "@/lib/bookings";
import { getBookingGroups, getOwnerCatalog } from "@/lib/catalog";
import { getTurnaround } from "@/lib/settings";
import BookingForm from "@/components/booking/BookingForm";
import BookingList from "@/components/booking/BookingList";
import { IconChevronRight } from "@/components/icons";
import UrunDetayDuzeni from "@/components/admin/kapak/UrunDetayDuzeni";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);

  // Identity resolution and both queries go out together; previously the user
  // lookup blocked the queries even though nothing needed it until the
  // ownership check below.
  const [user, { data: product }, { data: bookings }, turnaround] = await Promise.all([
    getCurrentUser(),
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("bookings")
      .select("*")
      .eq("product_id", id)
      .order("start_date", { ascending: true }),
    getTurnaround(),
  ]);

  if (!product || product.owner_id !== user?.id) notFound();

  // Toplu rezervasyonun ürün seçicisi satıcının bütün kataloğunu, satırlardaki
  // grup özeti de kayıtlı grupların içeriğini istiyor.
  const [catalog, groups] = await Promise.all([
    getOwnerCatalog(supabase, product.owner_id, turnaround),
    getBookingGroups(supabase, product.owner_id),
  ]);

  // Per-day counts rather than plain ranges: a day is unavailable only when
  // as many bookings cover it as the product has units in stock. Sayılan
  // aralık kiralama günleri değil, ürünün elde olmadığı günler.
  const availability = availabilityOf(
    (bookings ?? []).filter((b: Booking) => b.status !== "cancelled"),
    turnaround
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/admin/products" className="link-underline text-ink-muted hover:text-accent-hover">
          Ürünler
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink">{product.name}</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-ink sm:mb-8 sm:text-[28px]">{product.name}</h1>

      {/* GEÇİCİ: dizilişi düzen seçimi belirliyor (bkz. kapak/duzen.ts). */}
      <UrunDetayDuzeni
        bilgiler={
          <ProductForm
            product={product}
            action={updateProduct.bind(null, id)}
            submitLabel="Değişiklikleri kaydet"
          />
        }
        qr={
          <>
            <QRCodeCard
              productId={id}
              productName={product.name}
              productBarcode={product.barcode ?? null}
            />
            <DeleteProductButton productId={id} />
          </>
        }
        takvim={
          <BookingForm
            productId={id}
            availability={availability}
            stock={product.stock}
            turnaround={turnaround}
            catalog={catalog}
          />
        }
        kiralamalar={
          <BookingList
            bookings={bookings ?? []}
            productId={id}
            stock={product.stock}
            turnaround={turnaround}
            catalog={catalog}
            groups={groups}
          />
        }
      />
    </div>
  );
}
