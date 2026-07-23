import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/app/admin/products/actions";
import ProductForm from "@/components/admin/ProductForm";
import QRCodeCard from "@/components/admin/QRCodeCard";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

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

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product || product.owner_id !== user?.id) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">{product.name}</h1>
        <Link
          href={`/product/${id}`}
          className="text-sm font-medium text-neutral-600 underline"
        >
          View public page →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <ProductForm
            product={product}
            action={updateProduct.bind(null, id)}
            submitLabel="Save changes"
          />
        </div>

        <div className="space-y-6">
          <QRCodeCard productId={id} />
          <DeleteProductButton productId={id} />
        </div>
      </div>
    </div>
  );
}
