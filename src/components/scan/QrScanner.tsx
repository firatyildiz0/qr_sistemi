"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveBarcode, resolveScannedCode, type ScanResult } from "@/app/actions";
import { IconImage, IconQrCode, IconScan, IconX } from "@/components/icons";
import { createCode128Decoder, createTextReader, type TextReader } from "@/lib/numara-okuyucu";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorCtor = (new (options: { formats: string[] }) => BarcodeDetectorLike) & {
  getSupportedFormats?: () => Promise<string[]>;
};

type Phase = "idle" | "starting" | "scanning" | "resolving" | "failed";

/**
 * Kamera açıldıktan ne kadar sonra numara yazısı da aranmaya başlansın. QR ya
 * da çizgi çoğu zaman ilk saniyede okunuyor; yazı okuyucunun dosyaları ancak
 * onlar bulunamazsa insin.
 */
const TEXT_DELAY_MS = 1200;
/** İki yazı okuması arasındaki ara; okumanın kendisi de bir o kadar sürüyor. */
const TEXT_INTERVAL_MS = 300;

/**
 * Looks for the label's QR code and the Code 128 bars under its number.
 * Native detector where it exists (Chrome/Edge/Android), jsQR + zxing
 * everywhere else — and zxing for the bars when the native one only knows QR.
 *
 * `invert`: also look for light-on-dark codes. Too slow to do on every camera
 * frame, but a single photo from the gallery can afford it.
 */
async function createDecoder(invert = false): Promise<
  (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => Promise<string | null>
> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;

  if (Ctor) {
    try {
      const supported = (await Ctor.getSupportedFormats?.()) ?? ["qr_code"];
      const formats = ["qr_code", "code_128"].filter((f) => supported.includes(f));
      const detector = new Ctor({ formats });
      const bars = formats.includes("code_128") ? null : await createCode128Decoder();
      return async (canvas, ctx) => {
        const found = await detector.detect(canvas);
        return found[0]?.rawValue ?? bars?.(canvas, ctx) ?? null;
      };
    } catch {
      // Falls through to jsQR when the format is unsupported.
    }
  }

  const [{ default: jsQR }, bars] = await Promise.all([
    import("jsqr"),
    createCode128Decoder(),
  ]);
  return async (canvas, ctx) => {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height, {
      inversionAttempts: invert ? "attemptBoth" : "dontInvert",
    });
    return result?.data ?? bars(canvas, ctx);
  };
}

/**
 * Kameranın görünen karesinin ortası, yazı okumak için. Önizleme kare ve
 * `object-cover`; çerçeve onun ortasında. Kırpılan alan çerçeveden biraz
 * geniş ve yatay: numara tek satır, çerçeveye tam oturtulmak zorunda değil.
 */
function cropForText(video: HTMLVideoElement) {
  const side = Math.min(video.videoWidth, video.videoHeight);
  const width = Math.round(side * 0.8);
  const height = Math.round(side * 0.5);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext("2d")!
    .drawImage(
      video,
      (video.videoWidth - width) / 2,
      (video.videoHeight - height) / 2,
      width,
      height,
      0,
      0,
      width,
      height
    );
  return canvas;
}

/** Seçilen dosyayı tarayıcının çözebildiği bir görsel olarak yükler. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    image.src = url;
  });
}

/** Görseli uzun kenarı en fazla `maxSide` olacak şekilde tuvale çizer. */
function drawScaled(
  image: HTMLImageElement,
  maxSide: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  // Beyaz zemin: saydam bir PNG'de kod siyah zemin üstünde kaybolmasın.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return scale;
}

/**
 * Galeriden seçilen fotoğraftaki QR kodu ya da numara çizgisini okur.
 *
 * Telefon fotoğrafları kamera karesinden çok daha büyük; jsQR tam boyda hem
 * yavaş hem, kod küçük kaldığında, daha başarısız. Önce makul bir boya
 * küçültülüyor, bulunamazsa daha küçük boylarla yeniden deneniyor: ekran
 * görüntüsündeki koca bir kod küçük boyda, uzaktan çekilmiş küçük bir kod
 * büyük boyda okunuyor.
 */
async function decodeImageFile(image: HTMLImageElement): Promise<string | null> {
  const decode = await createDecoder(true);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  for (const maxSide of [1600, 1000, 600]) {
    const scale = drawScaled(image, maxSide, canvas, ctx);

    try {
      const value = await decode(canvas, ctx);
      if (value) return value;
    } catch {
      // Bir boyda çözücü hata verse de öbür boylar denensin.
    }
    if (scale === 1) break;
  }
  return null;
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textTimerRef = useRef<number | null>(null);
  // Yazı okuyucu bir kez kurulup kamera kapanıp açılsa da tutuluyor; dosyaları
  // ve WebAssembly motoru her seferinde yeniden yüklenmesin.
  const textReaderRef = useRef<Promise<TextReader> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (textTimerRef.current !== null) {
      clearTimeout(textTimerRef.current);
      textTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const textReader = useCallback(() => {
    textReaderRef.current ??= createTextReader().catch((error: unknown) => {
      // İndirme yarıda kaldıysa bir sonraki denemede baştan kurulsun.
      textReaderRef.current = null;
      throw error;
    });
    return textReaderRef.current;
  }, []);

  /** Bulunan ürüne gider, bulunamadıysa nedenini gösterir. */
  const finish = useCallback(
    (scan: ScanResult) => {
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
    [onProduct, onResolved, router]
  );

  const handleCode = useCallback(
    async (raw: string) => {
      if (busyRef.current) return;
      busyRef.current = true;

      stopCamera();
      setPhase("resolving");

      finish(await resolveScannedCode(raw));
    },
    [finish, stopCamera]
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
        // Numaranın yazısı ve ince çubukları QR'dan daha çok piksel istiyor;
        // tarayıcıların varsayılanı çoğu zaman 640×480.
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
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

      // Çizgisi olmayan eski etiketler için numaranın yazısı. Kare döngüsünden
      // ayrı ve seyrek: bir okuma yüzlerce milisaniye sürüyor, worker'da
      // döndüğü için kare döngüsünü bekletmiyor. Okunan sözcükler yalnızca
      // satıcının kendi numaralarından birine denk gelirse sonuç sayılıyor.
      const readText = async () => {
        textTimerRef.current = null;
        if (!streamRef.current || busyRef.current) return;

        try {
          const reader = await textReader();
          if (!streamRef.current || busyRef.current) return;
          const words = await reader.read(cropForText(video));
          if (!streamRef.current || busyRef.current) return;

          const scan = words.length > 0 ? await resolveBarcode(words) : null;
          if (scan && streamRef.current && !busyRef.current) {
            busyRef.current = true;
            stopCamera();
            finish(scan);
            return;
          }
        } catch {
          // Okuyucu inemediyse QR ve çizgi taraması sürüyor; yazı bu sefer yok.
          return;
        }

        if (streamRef.current && !busyRef.current) {
          textTimerRef.current = window.setTimeout(() => void readText(), TEXT_INTERVAL_MS);
        }
      };

      textTimerRef.current = window.setTimeout(() => void readText(), TEXT_DELAY_MS);
    } catch {
      stopCamera();
      setResult({
        ok: false,
        error: "Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin.",
      });
      setPhase("failed");
    }
  }, [finish, handleCode, stopCamera, textReader]);

  const handleFile = useCallback(
    async (file: File) => {
      stopCamera();
      setResult(null);
      setPhase("resolving");

      let image: HTMLImageElement;
      let value: string | null = null;
      try {
        image = await loadImage(file);
        value = await decodeImageFile(image);
      } catch {
        setResult({ ok: false, error: "Bu dosya açılamadı. Bir fotoğraf ya da ekran görüntüsü seçin." });
        setPhase("failed");
        return;
      }

      if (value) {
        busyRef.current = false;
        await handleCode(value);
        return;
      }

      // Ne QR ne çizgi: fotoğraftaki numaranın yazısına bakılıyor.
      let scan: ScanResult | null = null;
      try {
        const canvas = document.createElement("canvas");
        drawScaled(image, 1600, canvas, canvas.getContext("2d")!);
        const words = await (await textReader()).read(canvas);
        if (words.length > 0) scan = await resolveBarcode(words);
      } catch {
        // Okuyucu inemedi; aşağıdaki "bulunamadı" mesajı yeterli.
      }

      if (scan) {
        busyRef.current = true;
        finish(scan);
        return;
      }

      setResult({
        ok: false,
        error:
          "Bu görselde QR kod ya da ürün numarası bulunamadı. Etiketin net ve tamamen göründüğü bir fotoğraf seçin.",
      });
      setPhase("failed");
    },
    [finish, handleCode, stopCamera, textReader]
  );

  useEffect(() => stopCamera, [stopCamera]);

  // Okuyucunun worker'ı tarayıcı kapanınca serbest kalsın.
  useEffect(
    () => () => {
      const reader = textReaderRef.current;
      textReaderRef.current = null;
      void reader?.then((r) => r.terminate()).catch(() => {});
    },
    []
  );

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
              <div className="scan-line absolute left-0 top-0 h-0.5 w-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-on-deep/80">
              QR kodu ya da numarayı çerçeveye getirin
            </p>
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
                  Etiketteki QR kodu ya da altındaki numarayı kameraya gösterin.
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="btn btn-primary relative"
                >
                  <IconScan className="h-4 w-4" />
                  Okut
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Aynı dosya art arda seçilebilsin diye alan boşaltılıyor.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {phase !== "resolving" && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn btn-secondary -mt-2 self-center"
        >
          <IconImage className="h-4 w-4" />
          Galeriden seç
        </button>
      )}

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
