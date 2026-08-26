"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_IMAGE_BYTES } from "@/lib/storage";
import { IconX } from "@/components/icons";

/** Çerçevenin kilitlenebileceği oranlar. `null` = serbest. */
const RATIOS: { label: string; value: number | null }[] = [
  { label: "Serbest", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

/**
 * Longest edge of the written-out image. A phone photo is 4000px+ on its long
 * side; nothing on the product page renders anywhere near that, and the 5 MB
 * ceiling is easier to stay under with a sane cap than with a quality knob.
 */
const MAX_OUTPUT_EDGE = 2400;

/**
 * Smallest frame, as a fraction of the image — small enough to be useful, big
 * enough that a thumb can still grab the handles.
 */
const MIN_SIZE = 0.06;

/**
 * Crop frame in fractions of the image (0-1) rather than pixels: the same
 * numbers drive the on-screen overlay and the canvas cut, so the frame can't
 * drift when the preview is scaled down to fit the dialog.
 */
type Crop = { x: number; y: number; w: number; h: number };

type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * The frame's aspect is fixed in *image pixels*, but it is stored in fractions
 * of a picture that is rarely square — so a 1:1 frame is only 1:1 in fractions
 * when the image itself is. `k` is the converted ratio: w = h * k.
 */
function fractionRatio(ratio: number | null, natural: { w: number; h: number }) {
  return ratio === null ? null : (ratio * natural.h) / natural.w;
}

/** The biggest frame of the given aspect that fits, centred. */
function centredCrop(k: number | null): Crop {
  if (k === null) return { x: 0, y: 0, w: 1, h: 1 };

  let w = 1;
  let h = w / k;
  if (h > 1) {
    h = 1;
    w = h * k;
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

function resizeCrop(start: Crop, dx: number, dy: number, handle: Handle, k: number | null): Crop {
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  let { x, y, w, h } = start;

  if (west) {
    x = clamp(start.x + dx, 0, start.x + start.w - MIN_SIZE);
    w = start.x + start.w - x;
  } else if (east) {
    w = clamp(start.w + dx, MIN_SIZE, 1 - start.x);
  }

  if (north) {
    y = clamp(start.y + dy, 0, start.y + start.h - MIN_SIZE);
    h = start.y + start.h - y;
  } else if (south) {
    h = clamp(start.h + dy, MIN_SIZE, 1 - start.y);
  }

  if (k !== null) {
    // Locked aspect: the horizontal drag leads, the height follows it, and the
    // corner opposite the one being dragged stays put.
    const roomW = west ? start.x + start.w : 1 - start.x;
    const roomH = north ? start.y + start.h : 1 - start.y;

    w = clamp(w, MIN_SIZE, roomW);
    h = w / k;
    if (h > roomH) {
      h = roomH;
      w = h * k;
    }
    if (west) x = start.x + start.w - w;
    if (north) y = start.y + start.h - h;
  }

  return { x, y, w, h };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, type: string) {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const base = name.replace(/\.[^.]+$/, "") || "gorsel";
  return `${base}.${ext}`;
}

function handleClass(handle: Handle) {
  switch (handle) {
    case "nw":
      return "-left-3.5 -top-3.5 cursor-nwse-resize";
    case "ne":
      return "-right-3.5 -top-3.5 cursor-nesw-resize";
    case "sw":
      return "-bottom-3.5 -left-3.5 cursor-nesw-resize";
    case "se":
      return "-bottom-3.5 -right-3.5 cursor-nwse-resize";
    case "n":
      return "-top-3.5 left-1/2 -translate-x-1/2 cursor-ns-resize";
    case "s":
      return "-bottom-3.5 left-1/2 -translate-x-1/2 cursor-ns-resize";
    case "w":
      return "-left-3.5 top-1/2 -translate-y-1/2 cursor-ew-resize";
    case "e":
      return "-right-3.5 top-1/2 -translate-y-1/2 cursor-ew-resize";
  }
}

/**
 * Crops one image before it goes to the bucket. It rewrites the file itself
 * rather than storing a crop rectangle alongside it, so the product page, the
 * QR card and the seller's own list all show the framing that was chosen here.
 */
export default function ImageCropper({
  file,
  title = "Görseli kırp",
  applyLabel = "Kırp ve ekle",
  onApply,
  onCancel,
}: {
  file: File;
  title?: string;
  applyLabel?: string;
  onApply: (cropped: File) => void;
  onCancel: () => void;
}) {
  // Created once for this instance: the dialog is keyed per picture, so the
  // file never changes under it.
  const [src] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const k = natural ? fractionRatio(ratio, natural) : null;

  function chooseRatio(value: number | null) {
    setRatio(value);
    setCrop(centredCrop(natural ? fractionRatio(value, natural) : null));
  }

  const drag = useCallback(
    (e: React.PointerEvent, handle: Handle | "move") => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const box: DOMRect = rect;

      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const start = crop;
      const pointerId = e.pointerId;
      const target = e.currentTarget as HTMLElement;

      // Pointer capture keeps the drag alive when the finger leaves the frame,
      // which on a small screen it does almost immediately.
      target.setPointerCapture(pointerId);

      function onMove(ev: PointerEvent) {
        const dx = (ev.clientX - startX) / box.width;
        const dy = (ev.clientY - startY) / box.height;

        setCrop(
          handle === "move"
            ? {
                ...start,
                x: clamp(start.x + dx, 0, 1 - start.w),
                y: clamp(start.y + dy, 0, 1 - start.h),
              }
            : resizeCrop(start, dx, dy, handle, k)
        );
      }

      function onUp() {
        if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
      }

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    [crop, k]
  );

  async function apply() {
    const img = imgRef.current;
    if (!img || !natural) return;

    setWorking(true);
    setError(null);

    try {
      const sx = Math.round(crop.x * natural.w);
      const sy = Math.round(crop.y * natural.h);
      const sw = Math.max(1, Math.round(crop.w * natural.w));
      const sh = Math.max(1, Math.round(crop.h * natural.h));

      const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(sw, sh));
      const tw = Math.max(1, Math.round(sw * scale));
      const th = Math.max(1, Math.round(sh * scale));

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);

      const keepsType = file.type === "image/png" || file.type === "image/webp";
      let type = keepsType ? file.type : "image/jpeg";
      let blob = await toBlob(canvas, type, 0.92);

      // A PNG cut out of a photo can land above the 5 MB ceiling the uploader
      // enforces; JPEG is the way back under it.
      if (blob && blob.size > MAX_IMAGE_BYTES && type !== "image/jpeg") {
        type = "image/jpeg";
        blob = await toBlob(canvas, type, 0.9);
      }
      if (blob && blob.size > MAX_IMAGE_BYTES) {
        type = "image/jpeg";
        blob = await toBlob(canvas, type, 0.75);
      }
      if (!blob) throw new Error("encode failed");

      onApply(new File([blob], renamed(file.name, type), { type, lastModified: Date.now() }));
    } catch {
      setError("Görsel kırpılamadı. Lütfen tekrar deneyin.");
      setWorking(false);
    }
  }

  if (typeof document === "undefined") return null;

  const outW = natural ? Math.max(1, Math.round(crop.w * natural.w)) : 0;
  const outH = natural ? Math.max(1, Math.round(crop.h * natural.h)) : 0;

  // With a locked aspect the edge handles would fight the ratio, so only the
  // corners are offered there.
  const handles: Handle[] =
    ratio === null ? ["nw", "ne", "sw", "se", "n", "s", "e", "w"] : ["nw", "ne", "sw", "se"];

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-70 flex items-end justify-center sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-panel card flex max-h-dvh w-full max-w-3xl flex-col gap-4 p-4 sm:max-h-[92vh] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Çerçeveyi sürükleyin, köşelerinden boyutlandırın.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            aria-label="Kapat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-surface p-2">
          <div ref={frameRef} className="relative inline-block touch-none select-none">
            {/* A blob: URL for a file the seller just picked — nothing for
                next/image to optimize. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNatural({ w: el.naturalWidth, h: el.naturalHeight });
                setCrop(centredCrop(null));
                setRatio(null);
              }}
              className="block max-h-[46vh] max-w-full object-contain sm:max-h-[54vh]"
            />

            {natural && (
              <div
                onPointerDown={(e) => drag(e, "move")}
                className="absolute cursor-move border border-white/90"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                }}
              >
                {/* Üçte bir çizgileri */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
                  <div className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
                  <div className="absolute left-0 top-1/3 h-px w-full bg-white/40" />
                  <div className="absolute left-0 top-2/3 h-px w-full bg-white/40" />
                </div>

                {handles.map((handle) => (
                  <span
                    key={handle}
                    onPointerDown={(e) => drag(e, handle)}
                    aria-hidden
                    className={`absolute flex h-7 w-7 items-center justify-center ${handleClass(handle)}`}
                  >
                    <span className="h-3 w-3 rounded-xs border border-black/30 bg-white shadow-sm" />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {RATIOS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => chooseRatio(r.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                ratio === r.value
                  ? "border-accent bg-accent-soft text-accent-hover"
                  : "border-border bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
          {natural && (
            <span className="ml-auto text-xs text-ink-muted">
              {outW} × {outH} piksel
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="btn btn-secondary sm:min-w-28"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={working || !natural}
            className="btn btn-primary sm:min-w-28"
          >
            {working ? "Kırpılıyor…" : applyLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
