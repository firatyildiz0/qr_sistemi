"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveScannedCode, type ScanResult } from "@/app/actions";
import { IconQrCode, IconScan, IconX } from "@/components/icons";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorCtor = new (options: {
  formats: string[];
}) => BarcodeDetectorLike;

type Phase = "idle" | "starting" | "scanning" | "resolving" | "failed";

/** Native detector where it exists (Chrome/Edge/Android), jsQR everywhere else. */
async function createDecoder(): Promise<
  (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => Promise<string | null>
> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;

  if (Ctor) {
    try {
      const detector = new Ctor({ formats: ["qr_code"] });
      return async (canvas) => {
        const found = await detector.detect(canvas);
        return found[0]?.rawValue ?? null;
      };
    } catch {
      // Falls through to jsQR when the format is unsupported.
    }
  }

  const { default: jsQR } = await import("jsqr");
  return async (canvas, ctx) => {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "dontInvert",
    });
    return result?.data ?? null;
  };
}

export default function QrScanner({
  autoStart = false,
  onResolved,
  onProduct,
}: {
  /** Opens the camera as soon as the scanner mounts (used by the panel modal). */
  autoStart?: boolean;
  /** Fires once a scan has sent the owner somewhere, so a host modal can close. */
  onResolved?: () => void;
  /**
   * Verildiğinde okutulan ürüne *gidilmez*, çağırana bildirilir. Toplu
   * rezervasyonun ürün seçicisi bunu kullanıyor: satıcı formu doldurmuşken
   * başka bir sayfaya taşınmak girdiği her şeyi silerdi.
   */
  onProduct?: (product: { id: string; name: string }) => void;
} = {}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleCode = useCallback(
    async (raw: string) => {
      if (busyRef.current) return;
      busyRef.current = true;

      stopCamera();
      setPhase("resolving");

      const scan = await resolveScannedCode(raw);

      if (scan.ok) {
        if (onProduct) {
          onProduct({ id: scan.productId, name: scan.productName });
          onResolved?.();
          return;
        }

        // Straight to the same detail + booking screen the owner sees in the panel.
        router.push(scan.href);
        onResolved?.();
        return;
      }

      setResult(scan);
      setPhase("failed");
      busyRef.current = false;
    },
    [onProduct, onResolved, router, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setResult(null);
    busyRef.current = false;
    setPhase("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setResult({
        ok: false,
        error: "Bu tarayıcı kamera erişimini desteklemiyor.",
      });
      setPhase("failed");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();

      const decode = await createDecoder();
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      setPhase("scanning");

      const tick = async () => {
        frameRef.current = null;

        if (!streamRef.current || busyRef.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const value = await decode(canvas, ctx);
            if (value) {
              void handleCode(value);
              return;
            }
          } catch {
            // A single bad frame is not worth aborting the scan for.
          }
        }

        frameRef.current = requestAnimationFrame(() => void tick());
      };

      frameRef.current = requestAnimationFrame(() => void tick());
    } catch {
      stopCamera();
      setResult({
        ok: false,
        error: "Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin.",
      });
      setPhase("failed");
    }
  }, [handleCode, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  // Only ever fires on mount: `startCamera` is re-created on every state change,
  // so without the ref the effect would restart the camera mid-scan.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void startCamera();
  }, [autoStart, startCamera]);

  const live = phase === "starting" || phase === "scanning";

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-deep">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${live ? "opacity-100" : "opacity-0"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {live && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="scanner-container relative h-56 w-56 rounded-xl border-2 border-accent">
              <div className="scan-line absolute left-0 top-0 h-0.5 w-full bg-accent shadow-[0_0_10px_#FF5A1F]" />
            </div>
          </div>
        )}

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="diagonal-stripes absolute inset-0 opacity-20" />
            {phase === "resolving" ? (
              <>
                <IconQrCode className="relative h-14 w-14 animate-pulse text-accent" />
                <p className="relative text-sm text-on-deep/70">Ürün aranıyor…</p>
              </>
            ) : (
              <>
                <IconQrCode
                  className="relative h-14 w-14 text-on-deep/40"
                  strokeWidth={1.2}
                />
                <p className="relative max-w-xs text-sm text-on-deep/70">
                  Ürünün üzerindeki QR kodu kameraya gösterin.
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="btn btn-primary relative"
                >
                  <IconScan className="h-4 w-4" />
                  QR okut
                </button>
              </>
            )}
          </div>
        )}

        {live && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setPhase("idle");
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-deep/70 text-on-deep backdrop-blur-sm"
            aria-label="Taramayı durdur"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {result && !result.ok && (
        <div className="card border-accent/40 bg-accent/5">
          <p className="text-sm text-ink">{result.error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="btn btn-primary"
            >
              Tekrar dene
            </button>
            {result.publicHref && (
              <Link href={result.publicHref} className="btn btn-secondary">
                Herkese açık sayfayı aç
              </Link>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
