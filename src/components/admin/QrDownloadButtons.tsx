"use client";

import { useState } from "react";
import { IconDownload } from "@/components/icons";
import { code128, QUIET_ZONE } from "@/lib/barkod";

const CANVAS_WIDTH = 720;
const QR_SIZE = 640;
const PADDING = 40;
const NAME_FONT_SIZE = 38;
const LINE_HEIGHT = 48;
const MAX_LINES = 2;
const NAME_GAP = 24;
// Etiket numarası adın hemen altında ve ondan biraz büyük: rafta okunan şey
// isim değil numara. Eşit genişlikli yazı tipi rakamları hizalı tutuyor.
const BARCODE_FONT_SIZE = 44;
const BARCODE_GAP = 14;
const BARCODE_LINE_HEIGHT = 54;
// Numaranın altındaki çizgi: kamera bunu yazıdan çok daha hızlı ve kesin okuyor.
// Modül 6 pikselden kalın olmuyor; uzun numaralarda etikete sığacak kadar inceliyor.
const BARS_GAP = 12;
const BARS_HEIGHT = 110;
const MAX_MODULE = 6;

const nameFont = (size = NAME_FONT_SIZE) =>
  `bold ${size}px system-ui, "Segoe UI", Arial, sans-serif`;
const barcodeFont = `bold ${BARCODE_FONT_SIZE}px ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace`;

function slugify(name: string) {
  return (
    name
      .toLocaleLowerCase("tr")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "qr"
  );
}

/** Ürün adını en fazla iki satıra böler, sığmayanı "…" ile keser. */
function wrap(ctx: CanvasRenderingContext2D, name: string, maxWidth: number) {
  const lines: string[] = [];
  let current = "";

  for (const word of name.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === MAX_LINES) break;
    }
  }
  if (lines.length < MAX_LINES && current) lines.push(current);

  const last = lines[lines.length - 1];
  if (last && ctx.measureText(last).width > maxWidth) {
    let text = last;
    while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) {
      text = text.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${text}…`;
  }
  return lines;
}

export default function QrDownloadButtons({
  productId,
  productName,
  productBarcode,
  qrDataUrl,
}: {
  productId: string;
  productName: string;
  /** Etiketin üstüne adın altına basılacak numara; girilmemişse boş. */
  productBarcode: string | null;
  qrDataUrl: string;
}) {
  const [busy, setBusy] = useState(false);
  const barcode = productBarcode?.trim() ?? "";

  async function downloadPng() {
    setBusy(true);
    try {
      const image = new Image();
      image.src = qrDataUrl;
      await image.decode();

      const maxTextWidth = CANVAS_WIDTH - PADDING * 2;
      const measure = document.createElement("canvas").getContext("2d")!;
      measure.font = nameFont();
      const lines = wrap(measure, productName, maxTextWidth);

      const nameTop = PADDING + QR_SIZE + NAME_GAP;
      const barcodeTop = nameTop + lines.length * LINE_HEIGHT + BARCODE_GAP;

      const barsTop = barcodeTop + BARCODE_LINE_HEIGHT + BARS_GAP;

      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_WIDTH;
      canvas.height =
        (barcode ? barsTop + BARS_HEIGHT : nameTop + lines.length * LINE_HEIGHT) + PADDING;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // QR kenarlarının bulanıklaşmaması için yumuşatmayı kapatıyoruz.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, (CANVAS_WIDTH - QR_SIZE) / 2, PADDING, QR_SIZE, QR_SIZE);

      ctx.fillStyle = "#000000";
      ctx.font = nameFont();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      lines.forEach((line, index) => {
        ctx.fillText(line, CANVAS_WIDTH / 2, nameTop + index * LINE_HEIGHT);
      });

      if (barcode) {
        // Numara kısaltılmıyor — yarısı basılmış bir etiket numarası hiç
        // basılmamış gibidir. Sığmadığında yazı küçültülüyor.
        ctx.font = barcodeFont;
        const width = ctx.measureText(barcode).width;
        if (width > maxTextWidth) {
          ctx.font = barcodeFont.replace(
            `${BARCODE_FONT_SIZE}px`,
            `${Math.floor((BARCODE_FONT_SIZE * maxTextWidth) / width)}px`
          );
        }
        ctx.fillText(barcode, CANVAS_WIDTH / 2, barcodeTop);

        // Tam piksel modül: kesirli genişlikte çubuk kenarları griye döner ve
        // okuyucu ince çubukla kalını ayırt edemez.
        const { bars, modules } = code128(barcode);
        const moduleWidth = Math.max(
          1,
          Math.min(MAX_MODULE, Math.floor(CANVAS_WIDTH / (modules + QUIET_ZONE * 2)))
        );
        const left = Math.round((CANVAS_WIDTH - modules * moduleWidth) / 2);
        for (const bar of bars) {
          ctx.fillRect(left + bar.x * moduleWidth, barsTop, bar.width * moduleWidth, BARS_HEIGHT);
        }
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Numara dosya adının başında: etiketler klasörde numara sırasına diziliyor.
      link.download = `${barcode ? `${slugify(barcode)}-` : ""}${slugify(productName)}-qr.png`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex gap-3">
      <button
        type="button"
        onClick={downloadPng}
        disabled={busy}
        className="btn btn-secondary flex-1 text-xs"
      >
        <IconDownload className="h-3.5 w-3.5" />
        PNG
      </button>
      <a
        href={`/api/products/${productId}/qr`}
        download
        className="btn btn-secondary flex-1 text-xs"
      >
        <IconDownload className="h-3.5 w-3.5" />
        PDF
      </a>
    </div>
  );
}
