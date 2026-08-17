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
function fitName(name: string, maxWidth: number) {
  let text = name.trim();
  if (estimateWidth(text, NAME_FONT_SIZE) <= maxWidth) return text;
  while (text.length > 1 && estimateWidth(`${text}...`, NAME_FONT_SIZE) > maxWidth) {
    text = text.slice(0, -1).trimEnd();
  }
  return `${text}...`;
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
  const { modules } = QRCode.create(productUrl(productId), {
    errorCorrectionLevel: "M",
  });
  const size = modules.size;
  const scale = QR_BOX / (size + QR_MARGIN_MODULES * 2);
  const boxBottom = (A4_HEIGHT - QR_BOX) / 2;
  const originX = (A4_WIDTH - QR_BOX) / 2 + QR_MARGIN_MODULES * scale;
  const originY = boxBottom + QR_MARGIN_MODULES * scale;

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

  const name = fitName(productName, QR_BOX + 60);
  const nameX = (A4_WIDTH - estimateWidth(name, NAME_FONT_SIZE)) / 2;
  const nameY = boxBottom - NAME_GAP;
  const nameBlock = name
    ? `BT\n/F1 ${NAME_FONT_SIZE} Tf\n${nameX.toFixed(2)} ${nameY.toFixed(2)} Td\n(${pdfString(name)}) Tj\nET\n`
    : "";

  // Numara kısaltılmıyor: yarısı basılmış bir etiket numarası hiç basılmamış
  // gibidir. Zaten en fazla 32 karakter (bkz. 0022) ve sayfaya rahat sığıyor.
  const barcode = productBarcode?.trim() ?? "";
  const barcodeX = (A4_WIDTH - estimateWidth(barcode, BARCODE_FONT_SIZE)) / 2;
  const barcodeY = nameY - BARCODE_GAP;
  const barcodeBlock = barcode
    ? `BT\n/F1 ${BARCODE_FONT_SIZE} Tf\n${barcodeX.toFixed(2)} ${barcodeY.toFixed(2)} Td\n(${pdfString(barcode)}) Tj\nET\n`
    : "";

  const content = `0 0 0 rg\n${rects.join("\n")}\nf\n${nameBlock}${barcodeBlock}`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [${FONT_DIFFERENCES}] >> >>`,
  ];

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
