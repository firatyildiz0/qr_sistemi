import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "@/app/admin/products/actions";

export default function NewProductPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Add product</h1>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <ProductForm action={createProduct} submitLabel="Create product" />
      </div>
    </div>
  );
}
