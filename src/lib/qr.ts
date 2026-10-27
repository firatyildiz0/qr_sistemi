import QRCode from "qrcode";

export function productUrl(productId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/product/${productId}`;
}

export async function productQrDataUrl(productId: string) {
  return QRCode.toDataURL(productUrl(productId), {
    margin: 1,
    width: 320,
  });
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const QR_BOX = 360;
const QR_MARGIN_MODULES = 2;
const NAME_FONT_SIZE = 20;
const NAME_GAP = 44;
// Etiket numarası adın altında ve ondan büyük: rafta okunan şey isim değil
// numara. PNG etiketiyle aynı sıralama (bkz. QrDownloadButtons).
const BARCODE_FONT_SIZE = 26;
const BARCODE_GAP = 34;

// Helvetica'nın WinAnsi kodlamasında Türkçe'ye özgü harfler yok; kullanılmayan
// kodları /Differences ile bu glifllere bağlıyoruz.
const TURKISH_GLYPHS: Record<string, { code: number; glyph: string }> = {
  "ğ": { code: 0x80, glyph: "gbreve" },
  "Ğ": { code: 0x81, glyph: "Gbreve" },
  "ı": { code: 0x82, glyph: "dotlessi" },
  "İ": { code: 0x83, glyph: "Idotaccent" },
  "ş": { code: 0x84, glyph: "scedilla" },
  "Ş": { code: 0x85, glyph: "Scedilla" },
};

const FONT_DIFFERENCES = Object.values(TURKISH_GLYPHS)
  .map(({ code, glyph }) => `${code} /${glyph}`)
  .join(" ");

/** Metni PDF string'ine çevirir: Türkçe harfler eşlenir, geri kalanı latin1. */
function pdfString(text: string) {
  let out = "";
  for (const char of text) {
    const mapped = TURKISH_GLYPHS[char];
    const encoded = mapped
      ? String.fromCharCode(mapped.code)
      : char.charCodeAt(0) < 256
        ? char
        : "?";
    out += "()\\".includes(encoded) ? `\\${encoded}` : encoded;
  }
  return out;
}

/**
 * Helvetica-Bold genişliklerinin kabaca tahmini (1/1000 birim). Tam AFM tablosu
 * yerine ortalama değerler; metni ortalamak için yeterli hassasiyette.
 */
function estimateWidth(text: string, fontSize: number) {
  let units = 0;
  for (const char of text) {
    if (" iljtfIr.,:;'|!".includes(char)) units += 320;
    else if ("mwMW@".includes(char)) units += 900;
    else if (char >= "A" && char <= "Z") units += 700;
    else units += 570;
  }
  return (units / 1000) * fontSize;
}

/** İsim tek satıra sığmıyorsa kısaltır. */
function fitName(name: string, maxWidth: number, fontSize = NAME_FONT_SIZE) {
  let text = name.trim();
  if (estimateWidth(text, fontSize) <= maxWidth) return text;
  while (text.length > 1 && estimateWidth(`${text}...`, fontSize) > maxWidth) {
    text = text.slice(0, -1).trimEnd();
  }
  return `${text}...`;
}

/**
 * Ürünün QR kodunu, sol alt köşesi (`left`, `bottom`) olan `box` boyutunda
 * bir kareye çizen PDF komutları. Kenar boşluğu karenin içinde kalıyor.
 */
function qrRects(productId: string, left: number, bottom: number, box: number) {
  const { modules } = QRCode.create(productUrl(productId), {
    errorCorrectionLevel: "M",
  });
  const size = modules.size;
  const scale = box / (size + QR_MARGIN_MODULES * 2);
  const originX = left + QR_MARGIN_MODULES * scale;
  const originY = bottom + QR_MARGIN_MODULES * scale;

  const rects: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!modules.data[row * size + col]) continue;
      const x = originX + col * scale;
      // PDF'te y ekseni yukarı doğru artar, matris ise yukarıdan aşağı okunur.
      const y = originY + (size - 1 - row) * scale;
      rects.push(`${x.toFixed(2)} ${y.toFixed(2)} ${scale.toFixed(2)} ${scale.toFixed(2)} re`);
    }
  }
  return `0 0 0 rg\n${rects.join("\n")}\nf\n`;
}

/** `centerX` etrafında ortalanmış tek satır metin; metin boşsa hiçbir şey. */
function centeredText(text: string, centerX: number, y: number, fontSize: number) {
  if (!text) return "";
  const x = centerX - estimateWidth(text, fontSize) / 2;
  return `BT\n/F1 ${fontSize} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n(${pdfString(text)}) Tj\nET\n`;
}

/** Her biri bir sayfanın içerik akışı olan A4 sayfalarından PDF dosyası kurar. */
function buildPdf(pages: string[]) {
  // 1: katalog, 2: sayfa ağacı, 3: yazı tipi; ardından her sayfa için önce
  // sayfa, sonra içerik nesnesi.
  const pageRef = (index: number) => 4 + index * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageRef(i)} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [${FONT_DIFFERENCES}] >> >>`,
  ];
  pages.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents ${pageRef(i) + 1} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/**
 * QR kodu ve altında ürün adını — varsa onun da altında etiket numarasını —
 * içeren, vektörel tek sayfalık A4 PDF üretir.
 */
export async function productQrPdf(
  productId: string,
  productName: string,
  productBarcode: string | null = null
) {
  const boxBottom = (A4_HEIGHT - QR_BOX) / 2;
  const centerX = A4_WIDTH / 2;
  const nameY = boxBottom - NAME_GAP;

  // Numara kısaltılmıyor: yarısı basılmış bir etiket numarası hiç basılmamış
  // gibidir. Zaten en fazla 32 karakter (bkz. 0022) ve sayfaya rahat sığıyor.
  const content =
    qrRects(productId, (A4_WIDTH - QR_BOX) / 2, boxBottom, QR_BOX) +
    centeredText(fitName(productName, QR_BOX + 60), centerX, nameY, NAME_FONT_SIZE) +
    centeredText(productBarcode?.trim() ?? "", centerX, nameY - BARCODE_GAP, BARCODE_FONT_SIZE);

  return buildPdf([content]);
}

export type QrLabel = { id: string; name: string; barcode: string | null };

// Toplu etiket sayfası: A4'e 3 × 4 = 12 etiket. Hücreler kesim çizgileriyle
// ayrılıyor; makasla ya da giyotinle kesilip ürünün üstüne yapıştırılıyor.
const SHEET_COLS = 3;
const SHEET_ROWS = 4;
const SHEET_MARGIN = 24;
const SHEET_QR_BOX = 132;
const SHEET_NAME_FONT_SIZE = 10;
const SHEET_NAME_GAP = 14;
const SHEET_BARCODE_FONT_SIZE = 13;
const SHEET_BARCODE_GAP = 16;
export const LABELS_PER_SHEET = SHEET_COLS * SHEET_ROWS;

/** Kesim çizgileri: açık gri, kesikli; etiketin kendisinden ayırt edilsin diye. */
function cutLines(cellWidth: number, cellHeight: number) {
  const lines: string[] = [];
  for (let c = 0; c <= SHEET_COLS; c++) {
    const x = (SHEET_MARGIN + c * cellWidth).toFixed(2);
    lines.push(`${x} ${SHEET_MARGIN} m ${x} ${(A4_HEIGHT - SHEET_MARGIN).toFixed(2)} l S`);
  }
  for (let r = 0; r <= SHEET_ROWS; r++) {
    const y = (SHEET_MARGIN + r * cellHeight).toFixed(2);
    lines.push(`${SHEET_MARGIN} ${y} m ${(A4_WIDTH - SHEET_MARGIN).toFixed(2)} ${y} l S`);
  }
  return `q\n0.78 G\n0.5 w\n[3 3] 0 d\n${lines.join("\n")}\nQ\n`;
}

/**
 * Seçilen ürünlerin etiketlerini A4 sayfalarına ızgara halinde dizer: her
 * hücrede QR, altında ad, varsa onun altında etiket numarası. Sıra verilen
 * sırayla aynı, soldan sağa ve yukarıdan aşağı.
 */
export async function productQrSheetPdf(labels: QrLabel[]) {
  const cellWidth = (A4_WIDTH - SHEET_MARGIN * 2) / SHEET_COLS;
  const cellHeight = (A4_HEIGHT - SHEET_MARGIN * 2) / SHEET_ROWS;
  // QR, ad ve numaradan oluşan blok hücrenin dikeyde ortasında; numarası
  // olmayan etiket de aynı yerde dursun diye blok yüksekliği sabit.
  const blockHeight =
    SHEET_QR_BOX + SHEET_NAME_GAP + SHEET_BARCODE_GAP + SHEET_BARCODE_FONT_SIZE / 2;
  const pages: string[] = [];

  for (let start = 0; start < labels.length; start += LABELS_PER_SHEET) {
    let content = cutLines(cellWidth, cellHeight);

    labels.slice(start, start + LABELS_PER_SHEET).forEach((label, i) => {
      const col = i % SHEET_COLS;
      const row = Math.floor(i / SHEET_COLS);
      const left = SHEET_MARGIN + col * cellWidth;
      const top = A4_HEIGHT - SHEET_MARGIN - row * cellHeight;
      const centerX = left + cellWidth / 2;
      const qrBottom = top - (cellHeight - blockHeight) / 2 - SHEET_QR_BOX;
      const nameY = qrBottom - SHEET_NAME_GAP;

      // Numara burada da kısaltılmıyor (bkz. productQrPdf); hücreye sığmayan
      // uzun numaranın yazısı küçülüyor.
      const barcode = label.barcode?.trim() ?? "";
      const barcodeSize = Math.min(
        SHEET_BARCODE_FONT_SIZE,
        (cellWidth - 12) / Math.max(estimateWidth(barcode, 1), 1)
      );

      content +=
        qrRects(label.id, centerX - SHEET_QR_BOX / 2, qrBottom, SHEET_QR_BOX) +
        centeredText(
          fitName(label.name, cellWidth - 20, SHEET_NAME_FONT_SIZE),
          centerX,
          nameY,
          SHEET_NAME_FONT_SIZE
        ) +
        centeredText(barcode, centerX, nameY - SHEET_BARCODE_GAP, barcodeSize);
    });

    pages.push(content);
  }

  return buildPdf(pages);
}
