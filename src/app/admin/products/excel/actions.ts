"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseWorkbook,
  readRawRows,
  validateRows,
  type ImportRow,
  type RawRow,
} from "@/lib/urun-excel";

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
 * Satırları doğrular ve satıcının mevcut ürünlerinde zaten kullanılan etiket
 * numaralarını satırlara hata olarak yazar.
 */
async function checkRows(supabase: Supabase, ownerId: string, rawRows: RawRow[]): Promise<ImportRow[]> {
  const rows = validateRows(rawRows);

  const barcodes = rows.flatMap((r) => (r.barcode ? [r.barcode] : []));
  if (barcodes.length > 0) {
    const { data: taken } = await supabase
      .from("products")
      .select("barcode")
      .eq("owner_id", ownerId)
      .in("barcode", barcodes);
    const takenSet = new Set((taken ?? []).map((p) => p.barcode as string));
    for (const row of rows) {
      if (row.barcode && takenSet.has(row.barcode)) {
        row.errors.push("Bu etiket no başka bir ürününüzde kullanılıyor.");
      }
    }
  }

  return rows;
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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", error: "Bir Excel dosyası seçin." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", error: "Dosya çok büyük. Satırları birkaç dosyaya bölüp yükleyin." };
  }

  const parsed = await parseWorkbook(await file.arrayBuffer());
  if (!parsed.ok) return { status: "error", error: parsed.error };
  const rows = await checkRows(
    supabase,
    user.id,
    parsed.rows.map((r) => r.raw)
  );
  return { status: "preview", rows };
}

/** Önizlemede bir satır düzenlenince ya da silinince satırları yeniden doğrular. */
export async function recheckProductImport(input: unknown): Promise<ImportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Giriş yapmalısınız." };

  const rawRows = readRawRows(input);
  if (!rawRows) return { status: "error", error: "Satırlar okunamadı. Dosyayı yeniden seçin." };
  return { status: "preview", rows: await checkRows(supabase, user.id, rawRows) };
}

/**
 * Hatasız satırları tek seferde ekler; hatalı satırlar atlanır. Satırlar
 * önizlemede düzenlenebildiği için tarayıcıdan geliyor, ama önizlemenin
 * sonucuna güvenilmiyor: hepsi burada baştan doğrulanıyor.
 */
export async function saveProductImport(input: unknown): Promise<ImportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Giriş yapmalısınız." };

  const rawRows = readRawRows(input);
  if (!rawRows) return { status: "error", error: "Satırlar okunamadı. Dosyayı yeniden seçin." };
  const rows = await checkRows(supabase, user.id, rawRows);

  const valid = rows.filter((r) => r.errors.length === 0);
  if (valid.length === 0) {
    return { status: "error", error: "Eklenebilecek hatasız satır yok. Hatalı satırları düzeltin ya da silin." };
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
  return { status: "saved", created: valid.length, skipped: rows.length - valid.length };
}
