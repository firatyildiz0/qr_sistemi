"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@/components/icons";

/**
 * Ürün listesinin arama kutusu — yazdıkça arıyor.
 *
 * Satıcı çoğu zaman elindeki etiketin numarasını yazıyor ve tek bir ürün
 * arıyor; her seferinde Enter'a basması gereksiz bir adımdı. Her tuşta değil,
 * yazmaya ara verilince sorgu gidiyor: barkod numarası yazarken aradaki her
 * karakter için ayrı bir sorgu açılmasın diye.
 *
 * Adres çubuğu yine sorguyu taşıyor (`?q=`), böylece sonuç sayfası
 * paylaşılabilir ve geri tuşu çalışıyor — ama `replace` ile, yoksa geçmiş her
 * harf için bir kayıt biriktirirdi.
 */
export default function ProductSearch({ query }: { query: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();

  // En son adres çubuğuna yazdığımız sorgu. Aynı sorgu tekrar gönderilmesin
  // diye tutuluyor. Adres dışarıdan değişince (geri/ileri tuşu, başka bir
  // sayfadan gelen bağlantı) kutu da onu gösteriyor.
  const [applied, setApplied] = useState(query);
  if (query !== applied) {
    setApplied(query);
    setValue(query);
  }

  // Her tuşta değil, yazmaya ara verilince: barkod numarası yazılırken aradaki
  // her karakter için ayrı bir sorgu açılmasın.
  useEffect(() => {
    if (value === applied) return;

    const timer = setTimeout(() => {
      setApplied(value);
      const trimmed = value.trim();
      startTransition(() => {
        router.replace(
          trimmed ? `/admin/products?q=${encodeURIComponent(trimmed)}` : "/admin/products",
          { scroll: false },
        );
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [value, applied, router]);

  return (
    <form
      action="/admin/products"
      // JavaScript açıkken Enter'ın yapacağı bir iş kalmıyor: sorgu zaten
      // yolda. Sayfayı baştan yüklemesin diye durduruluyor, ama form etiketi
      // duruyor — telefon klavyesindeki "ara" tuşu ve JS kapalıyken çalışan
      // gönderim ona bağlı.
      onSubmit={(e) => e.preventDefault()}
      className="relative flex w-full items-center rounded-md border border-border bg-card sm:w-64"
    >
      <IconSearch className="pointer-events-none absolute left-3 h-4 w-4 text-ink-muted" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ürün adı veya barkod ara…"
        aria-label="Ürün adı veya barkod ara"
        className="w-full bg-transparent py-2.5 pl-10 pr-9 text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-sm"
      />
      {pending && (
        <span
          aria-hidden="true"
          className="nav-spinner absolute right-3 h-3.5 w-3.5 rounded-full border-2 border-border border-t-accent"
        />
      )}
    </form>
  );
}
