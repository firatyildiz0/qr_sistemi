import Link from "next/link";
import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "@/app/admin/products/actions";
import { IconChevronRight } from "@/components/icons";

export default function NewProductPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/admin" className="link-underline text-ink-muted hover:text-accent-hover">
          Ürünler
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink">Yeni ürün</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-ink sm:mb-8 sm:text-[28px]">Ürün ekle</h1>
      <div className="card">
        <ProductForm action={createProduct} submitLabel="Ürün oluştur" />
      </div>
    </div>
  );
}
