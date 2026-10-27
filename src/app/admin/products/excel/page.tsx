import Link from "next/link";
import ExcelImport from "@/app/admin/products/excel/ExcelImport";
import { IconChevronRight } from "@/components/icons";

export default function ProductExcelImportPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/admin/products" className="link-underline text-ink-muted hover:text-accent-hover">
          Ürünler
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink">Excel ile ekle</span>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-ink sm:text-[28px]">Excel ile toplu ürün ekle</h1>
      <p className="mb-6 text-sm text-ink-muted sm:mb-8">
        Ürünlerinizi tek tek girmek yerine bir Excel dosyasıyla hepsini birden ekleyin.
      </p>
      <ExcelImport />
    </div>
  );
}
