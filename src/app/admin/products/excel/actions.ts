"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWorkbook, type ImportRow } from "@/lib/urun-excel";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "preview"; rows: ImportRow[] }
  | { status: "saved"; created: number; skipped: number };

/**
 * Server Action gövdesi varsayılan olarak 1 MB'la sınırlı; dosya sınırı ondan
 * biraz aşağıda ki form alanlarının payı kalsın. 500 satırlık bir şablon
 * bunun çok altında kalıyor.
 */
const MAX_FILE_BYTES = 900 * 1024;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Yüklenen dosyayı okur, satırları doğrular ve satıcının mevcut ürünlerinde
 * zaten kullanılan etiket numaralarını satırlara hata olarak yazar.
 */
async function readUpload(
  supabase: Supabase,
  ownerId: string,
  formData: FormData
): Promise<{ error: string } | { rows: ImportRow[] }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir Excel dosyası seçin." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Dosya çok büyük. Satırları birkaç dosyaya bölüp yükleyin." };
  }

  const parsed = await parseWorkbook(await file.arrayBuffer());
  if (!parsed.ok) return { error: parsed.error };

  const barcodes = parsed.rows.flatMap((r) => (r.barcode ? [r.barcode] : []));
  if (barcodes.length > 0) {
    const { data: taken } = await supabase
      .from("products")
      .select("barcode")
      .eq("owner_id", ownerId)
      .in("barcode", barcodes);
    const takenSet = new Set((taken ?? []).map((p) => p.barcode as string));
    for (const row of parsed.rows) {
      if (row.barcode && takenSet.has(row.barcode)) {
        row.errors.push("Bu etiket no başka bir ürününüzde kullanılıyor.");
      }
    }
  }

  return { rows: parsed.rows };
}

export async function previewProductImport(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Giriş yapmalısınız." };

  const result = await readUpload(supabase, user.id, formData);
  if ("error" in result) return { status: "error", error: result.error };
  return { status: "preview", rows: result.rows };
}

/**
 * Hatasız satırları tek seferde ekler; hatalı satırlar atlanır. Dosya
 * yeniden okunup yeniden doğrulanıyor: önizlemede gösterilen satırlar
 * tarayıcıdan geri alınsaydı, araya giren biri doğrulanmamış ürün ekleyebilirdi.
 */
export async function saveProductImport(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Giriş yapmalısınız." };

  const result = await readUpload(supabase, user.id, formData);
  if ("error" in result) return { status: "error", error: result.error };

  const valid = result.rows.filter((r) => r.errors.length === 0);
  if (valid.length === 0) {
    return { status: "error", error: "Eklenebilecek hatasız satır yok. Dosyayı düzeltip yeniden yükleyin." };
  }

  // Numarası boş satırlarda alan null gidiyor; veritabanındaki trigger null
  // numaraya yeni bir numara üretiyor (bkz. 0024), tek tek eklemedeki gibi.
  const { error } = await supabase.from("products").insert(
    valid.map((r) => ({
      owner_id: user.id,
      name: r.name,
      features: r.features,
      daily_price: r.dailyPrice,
      stock: r.stock,
      images: [],
      barcode: r.barcode,
    }))
  );

  if (error) {
    // Tek bir satır bile reddedilirse hiçbiri eklenmiyor; satıcı tekrar
    // denediğinde ikinci kez eklenen ürün olmuyor.
    if (error.code === "23505") {
      return {
        status: "error",
        error: "Etiket numaraları başka bir ürünle çakıştı, hiçbir ürün eklenmedi. Lütfen tekrar deneyin.",
      };
    }
    return { status: "error", error: `Ürünler eklenemedi: ${error.message}` };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { status: "saved", created: valid.length, skipped: result.rows.length - valid.length };
}
