import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/app/admin/products/actions";
import ProductForm from "@/components/admin/ProductForm";
import QRCodeCard from "@/components/admin/QRCodeCard";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import type { Booking } from "@/lib/types";
import BookingForm from "@/components/booking/BookingForm";
import BookingList from "@/components/booking/BookingList";
import { IconChevronRight, IconExternal } from "@/components/icons";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: product }, { data: bookings }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("bookings")
      .select("*")
      .eq("product_id", id)
      .order("start_date", { ascending: true }),
  ]);

  if (!product || product.owner_id !== user?.id) notFound();

  const activeBookings = (bookings ?? []).filter(
    (b: Booking) => b.status !== "cancelled"
  );
  const bookedRanges = activeBookings.map((b) => ({
    from: new Date(b.start_date + "T00:00:00"),
    to: new Date(b.end_date + "T00:00:00"),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Link href="/admin" className="link-underline text-ink-muted hover:text-accent-hover">
            Ürünler
          </Link>
          <IconChevronRight className="h-3.5 w-3.5" />
          <span className="text-ink">{product.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/product/${id}`} target="_blank" className="btn btn-secondary">
            <IconExternal className="h-4 w-4" />
            Herkese açık sayfayı görüntüle
          </Link>
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-ink sm:mb-8 sm:text-[28px]">{product.name}</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
        <div className="card">
          <ProductForm
            product={product}
            action={updateProduct.bind(null, id)}
            submitLabel="Değişiklikleri kaydet"
          />
        </div>

        <div className="space-y-6">
          <QRCodeCard productId={id} />
          <DeleteProductButton productId={id} />
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-lg font-semibold text-ink">Müsaitlik</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="field-label">Yeni rezervasyon</h3>
            <BookingForm productId={id} bookedRanges={bookedRanges} />
          </div>
          <div>
            <h3 className="field-label">Kiralamalar</h3>
            <BookingList bookings={bookings ?? []} productId={id} />
          </div>
        </div>
      </section>
    </div>
  );
}
