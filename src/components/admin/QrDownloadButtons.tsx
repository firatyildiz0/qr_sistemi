"use client";

import { useState } from "react";
import { IconDownload } from "@/components/icons";

const CANVAS_WIDTH = 720;
const QR_SIZE = 640;
const PADDING = 40;
const NAME_FONT_SIZE = 38;
const LINE_HEIGHT = 48;
const MAX_LINES = 2;

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
  qrDataUrl,
}: {
  productId: string;
  productName: string;
  qrDataUrl: string;
}) {
  const [busy, setBusy] = useState(false);

  async function downloadPng() {
    setBusy(true);
    try {
      const image = new Image();
      image.src = qrDataUrl;
      await image.decode();

      const measure = document.createElement("canvas").getContext("2d")!;
      measure.font = `bold ${NAME_FONT_SIZE}px system-ui, "Segoe UI", Arial, sans-serif`;
      const lines = wrap(measure, productName, CANVAS_WIDTH - PADDING * 2);

      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_WIDTH;
      canvas.height = PADDING * 2 + QR_SIZE + 24 + lines.length * LINE_HEIGHT;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // QR kenarlarının bulanıklaşmaması için yumuşatmayı kapatıyoruz.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, (CANVAS_WIDTH - QR_SIZE) / 2, PADDING, QR_SIZE, QR_SIZE);

      ctx.fillStyle = "#000000";
      ctx.font = `bold ${NAME_FONT_SIZE}px system-ui, "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      lines.forEach((line, index) => {
        ctx.fillText(line, CANVAS_WIDTH / 2, PADDING + QR_SIZE + 24 + index * LINE_HEIGHT);
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(productName)}-qr.png`;
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
