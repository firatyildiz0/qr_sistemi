import ExcelJS from "exceljs";
import { parsePriceInput, readPriceField } from "@/lib/format";

/**
 * Toplu ürün eklemenin Excel tarafı: boş şablonu üretmek ve doldurulmuş
 * dosyayı satır satır okumak. Kaydetme `admin/products/excel/actions.ts`'te.
 *
 * Doğrulama, tek tek ürün eklerken uygulananla aynı kuralları izliyor (bkz.
 * `admin/products/actions.ts`): Excel'den gelen bir ürün formdan girilmiş
 * bir üründen farklı davranmamalı.
 */

/** Tek dosyada en fazla bu kadar ürün. */
export const MAX_IMPORT_ROWS = 500;

/** Şablonun başlıkları; dosya okunurken sütunlar bu adlarla bulunuyor. */
const COLUMNS = [
  { key: "name", header: "Ürün adı", width: 36, note: "Zorunlu." },
  { key: "daily_price", header: "Günlük fiyat (₺)", width: 18, note: "Zorunlu. Örnek: 1250 ya da 1.250,50" },
  { key: "stock", header: "Stok", width: 10, note: "Boş bırakılırsa 1." },
  {
    key: "barcode",
    header: "Etiket no",
    width: 18,
    note: "İsteğe bağlı. Boş bırakılırsa otomatik verilir. Harf, rakam, - _ . / (en fazla 32 karakter).",
  },
  { key: "features", header: "Özellikler", width: 48, note: "İsteğe bağlı. Virgülle ayırın." },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const BARCODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/;

export type ImportRow = {
  /** Excel'deki satır numarası; hata mesajında satıcı satırı buradan bulur. */
  row: number;
  name: string;
  dailyPrice: number | null;
  stock: number | null;
  barcode: string | null;
  features: string[];
  errors: string[];
};

export type ParsedWorkbook =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; error: string };

/** Boş şablon: başlık satırı, açıklama notları ve bir örnek satır. */
export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ürünler", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({ key: c.key, header: c.header, width: c.width }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.note = c.note;
  });

  sheet.addRow({
    name: "Örnek: Kamp çadırı 4 kişilik",
    daily_price: 350,
    stock: 2,
    barcode: "",
    features: "Su geçirmez, 4 kişilik, Taşıma çantalı",
  });
  sheet.getRow(2).font = { italic: true, color: { argb: "FF6B7280" } };

  // Etiket numarası metin: "00123" gibi bir numaranın başındaki sıfırlar
  // Excel'in sayıya çevirmesiyle kaybolmasın.
  sheet.getColumn("barcode").numFmt = "@";

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Hücrenin değerini düz metne çevirir: formül sonucu, zengin metin, bağlantı. */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text);
    if ("error" in value) return "";
  }
  return String(value).trim();
}

/** Başlıkları karşılaştırmak için: büyük/küçük harf, boşluk ve "(₺)" fark etmesin. */
function normalizeHeader(text: string) {
  return text
    .toLocaleLowerCase("tr")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readPrice(value: ExcelJS.CellValue): number | null | undefined {
  // Sayı hücresi olduğu gibi; metin hücresi "1.250,50 ₺" gibi yazılmış olabilir.
  if (typeof value === "number") return value >= 0 ? value : undefined;
  const text = cellText(value).replace(/[₺\s]|TL$/gi, "");
  if (!text) return null;
  if (text.startsWith("-")) return undefined;
  // Virgül yoksa tek nokta ve ardından en fazla iki hane ondalıktır ("1250.50");
  // gerisi Türkçe yazım: nokta binlik, virgül ondalık.
  if (/^\d+\.\d{1,2}$/.test(text)) return readPriceField(text);
  // Rakamı olmayan metin ("yok", "?") boş değil, hatalı sayılıyor.
  return readPriceField(parsePriceInput(text) || "-");
}

function readStock(value: ExcelJS.CellValue): number | null {
  const text = cellText(value);
  if (!text) return 1;
  const stock = Number(text.replace(",", "."));
  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) return null;
  return stock;
}

/**
 * Doldurulmuş dosyayı okur. Sütunlar başlık adlarıyla bulunuyor, yani
 * satıcı sütunların yerini değiştirse de dosya okunuyor. Boş satırlar
 * atlanıyor; şablondaki örnek satır da.
 *
 * Satır hataları dosyayı reddetmiyor, satıra yazılıyor: satıcı hatasız
 * satırları ekleyip kalanları düzeltebilsin.
 */
export async function parseWorkbook(data: ArrayBuffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data);
  } catch {
    return { ok: false, error: "Dosya okunamadı. Excel'de .xlsx olarak kaydedip tekrar deneyin." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { ok: false, error: "Dosyada sayfa yok." };

  const positions = new Map<ColumnKey, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const header = normalizeHeader(cellText(cell.value));
    const column = COLUMNS.find((c) => normalizeHeader(c.header) === header);
    if (column) positions.set(column.key, col);
  });

  if (!positions.has("name") || !positions.has("daily_price")) {
    return {
      ok: false,
      error: "İlk satırda \"Ürün adı\" ve \"Günlük fiyat\" başlıkları bulunamadı. Şablonu indirip onun üzerinde çalışın.",
    };
  }

  const read = (row: ExcelJS.Row, key: ColumnKey): ExcelJS.CellValue => {
    const col = positions.get(key);
    return col ? row.getCell(col).value : null;
  };

  const rows: ImportRow[] = [];
  const seenBarcodes = new Map<string, number>();

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const name = cellText(read(row, "name"));
    const priceCell = read(row, "daily_price");
    const stockCell = read(row, "stock");
    const barcodeRaw = cellText(read(row, "barcode"));
    const featuresRaw = cellText(read(row, "features"));

    if (!name && !cellText(priceCell) && !cellText(stockCell) && !barcodeRaw && !featuresRaw) {
      continue;
    }
    if (name.startsWith("Örnek:")) continue;

    if (rows.length === MAX_IMPORT_ROWS) {
      return {
        ok: false,
        error: `Bir dosyada en fazla ${MAX_IMPORT_ROWS} ürün olabilir. Dosyayı bölüp parça parça yükleyin.`,
      };
    }

    const errors: string[] = [];
    if (!name) errors.push("Ürün adı boş.");
    else if (name.length > 200) errors.push("Ürün adı 200 karakterden uzun.");

    const price = readPrice(priceCell);
    if (price === null) errors.push("Günlük fiyat boş.");
    else if (price === undefined) errors.push("Günlük fiyat 0 ya da daha büyük bir sayı olmalı.");

    const stock = readStock(stockCell);
    if (stock === null) errors.push("Stok 0 ya da daha büyük bir tam sayı olmalı.");

    const barcode = barcodeRaw || null;
    if (barcode && !BARCODE_PATTERN.test(barcode)) {
      errors.push("Etiket no harf ya da rakamla başlamalı; yalnızca harf, rakam, - _ . / içerebilir (en fazla 32 karakter).");
    } else if (barcode) {
      const first = seenBarcodes.get(barcode);
      if (first) errors.push(`Etiket no ${first}. satırda da var.`);
      else seenBarcodes.set(barcode, r);
    }

    rows.push({
      row: r,
      name,
      dailyPrice: price ?? null,
      stock,
      barcode,
      features: featuresRaw
        .split(/[\n,]/)
        .map((f) => f.trim())
        .filter(Boolean),
      errors,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "Dosyada eklenecek ürün bulunamadı." };
  }

  return { ok: true, rows };
}
