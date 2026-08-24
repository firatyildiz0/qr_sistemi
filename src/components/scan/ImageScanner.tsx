"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVisualCandidates,
  saveImageSignatures,
  type VisualCandidate,
} from "@/app/actions";
import { describeSource, similarity, type ImageSignature } from "@/lib/vision";
import ProductThumb from "@/components/admin/ProductThumb";
import { IconImage, IconScan, IconX } from "@/components/icons";

/**
 * Bir ürünün "bu o" denebilmesi için gereken en düşük benzerlik. Birbiriyle
 * ilgisiz iki fotoğraf 0,55 civarında buluşuyor; gerçek eşleşmeler 0,75'in
 * üstüne çıkıyor.
 */
const MATCH_MIN = 0.72;
/**
 * Birinci ile ikinci arasındaki en küçük açık ara. Başa baş giden iki üründen
 * birine gitmek hiç gitmemekten kötü: satıcı yanlış ürünün rezervasyon
 * ekranını açtığını fark etmeyebilir.
 */
const MATCH_MARGIN = 0.03;
/** Son kaç karenin oyuna bakılıyor, kaçının aynı ürünü göstermesi gerekiyor. */
const WINDOW = 8;
const VOTES = 4;
/** İki ölçüm arası — her karede ölçmek telefonu ısıtmaktan başka işe yaramıyor. */
const INTERVAL_MS = 120;
/** Bu kadar süre eşleşme çıkmazsa en yakın adaylar elle seçilsin diye listelenir. */
const HINT_AFTER_MS = 4000;

type Phase =
  | "loading"
  | "empty"
  | "idle"
  | "starting"
  | "scanning"
  | "opening"
  | "failed";

type Scored = { product: VisualCandidate; score: number };

/**
 * Kamerayı ürünün kendisine tutarak rezervasyon ekranını açan tarayıcı.
 *
 * QR okutmanın yanındaki ikinci yol: etiket düşmüş, yıpranmış ya da ürünün
 * içinde kalmış olabilir, ürünün kendisi ise her zaman ortada. Eşleşme
 * bulunduğunda gidilen yer QR ile birebir aynı — satıcının bildiği ürün
 * sayfası.
 *
 * Tanıma, katalog fotoğraflarıyla kadrajdaki karenin karşılaştırılmasına
 * dayanıyor (bkz. `@/lib/vision`) ve yanılabilir. Bu yüzden iki koruma var:
 * bir ürüne gitmek için son sekiz karenin en az dördünün aynı ürünü, ikinciyi
 * açık ara geçerek göstermesi gerekiyor; emin olunamadığında ise sistem tahmin
 * yürütmüyor, en yakın üç adayı satıcının dokunması için listeliyor.
 */
export default function ImageScanner({
  autoStart = false,
  onResolved,
  onProduct,
}: {
  autoStart?: boolean;
  onResolved?: () => void;
  /** QR tarayıcıdaki ile aynı sözleşme: verildiğinde gidilmez, haber verilir. */
  onProduct?: (product: { id: string; name: string }) => void;
} = {}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const votesRef = useRef<(string | null)[]>([]);
  const lastRef = useRef(0);
  const hintKeyRef = useRef("");

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nearest, setNearest] = useState<Scored[]>([]);
  const [showHints, setShowHints] = useState(false);

  /**
   * Katalog durum (`useState`) değil ref: ekranda katalogtan çizilen bir şey
   * yok, onu okuyan tek yer her karede çalışan ölçüm döngüsü. Durum olsaydı
   * parmak izleri arka planda tamamlandıkça bütün ekran yeniden çizilirdi —
   * ve döngü, kapanışında dondurduğu listeye takılıp yeni imzaları hiç
   * görmezdi.
   */
  const catalogRef = useRef<VisualCandidate[]>([]);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Katalog bir kez indiriliyor; eksik parmak izleri arka planda tamamlanıyor,
  // bu yüzden kamera onları beklemiyor — çıkarıldıkça eşleşmeye katılıyorlar.
  useEffect(() => {
    let alive = true;

    void (async () => {
      const products = await getVisualCandidates();
      if (!alive) return;

      catalogRef.current = products;
      setPhase(products.length ? "idle" : "empty");

      for (const product of products) {
        const filled = await fillSignatures(product);
        if (!alive) return;
        if (!filled) continue;

        catalogRef.current = catalogRef.current.map((item) =>
          item.id === product.id ? { ...item, signatures: filled } : item
        );
        void saveImageSignatures(product.id, filled);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const openProduct = useCallback(
    (product: VisualCandidate) => {
      if (busyRef.current) return;
      busyRef.current = true;

      stopCamera();
      setPhase("opening");

      if (onProduct) {
        onProduct({ id: product.id, name: product.name });
      } else {
        // QR okutmanın gittiği ekranın aynısı.
        router.push(`/admin/products/${product.id}`);
      }
      onResolved?.();
    },
    [onProduct, onResolved, router, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    setNearest([]);
    setShowHints(false);
    hintKeyRef.current = "";
    votesRef.current = [];
    busyRef.current = false;
    setPhase("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Bu tarayıcı kamera erişimini desteklemiyor.");
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
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();

      setPhase("scanning");
      const startedAt = performance.now();
      lastRef.current = 0;

      /** Bir karenin ölçümü; kilitlenecek ürün varsa onu döndürür. */
      const measure = (hinting: boolean): VisualCandidate | null => {
        let frame: Omit<ImageSignature, "url"> | null = null;
        try {
          frame = describeSource(video, video.videoWidth, video.videoHeight);
        } catch {
          // Tek bir bozuk kare taramayı bitirmeye değmez.
        }
        if (!frame) return null;

        const ranked = rank(catalogRef.current, frame);

        // Saniyede sekiz ölçüm yapılıyor ama liste ancak sıralaması
        // değiştiğinde yeniden çiziliyor: her ölçümde durum güncellenseydi
        // satıcı dokunmaya çalıştığı satırın altından kayan bir liste görürdü.
        if (hinting) {
          const top = ranked.slice(0, 3);
          const key = top.map((item) => item.product.id).join(",");
          if (key !== hintKeyRef.current) {
            hintKeyRef.current = key;
            setNearest(top);
          }
          setShowHints(true);
        }

        const [best, runnerUp] = ranked;
        const clear =
          best !== undefined &&
          best.score >= MATCH_MIN &&
          best.score - (runnerUp?.score ?? 0) >= MATCH_MARGIN;

        const votes = votesRef.current;
        votes.push(clear ? best.product.id : null);
        if (votes.length > WINDOW) votes.shift();

        if (!clear) return null;

        const agreeing = votes.filter((id) => id === best.product.id).length;
        return agreeing >= VOTES ? best.product : null;
      };

      const tick = (now: number) => {
        frameRef.current = null;
        if (!streamRef.current || busyRef.current) return;

        if (
          now - lastRef.current >= INTERVAL_MS &&
          video.readyState === video.HAVE_ENOUGH_DATA
        ) {
          lastRef.current = now;
          const winner = measure(now - startedAt >= HINT_AFTER_MS);
          if (winner) {
            openProduct(winner);
            return;
          }
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    } catch {
      stopCamera();
      setError("Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin.");
      setPhase("failed");
    }
  }, [openProduct, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  // Yalnızca katalog geldikten sonra ve bir kez: `startCamera` her durum
  // değişiminde yeniden üretiliyor, ref olmasa tarama ortasında kamera baştan
  // başlardı.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current || phase !== "idle") return;
    autoStarted.current = true;
    void startCamera();
  }, [autoStart, phase, startCamera]);

  const live = phase === "starting" || phase === "scanning";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-deep">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${live ? "opacity-100" : "opacity-0"}`}
        />

        {live && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Çerçeve süs değil: karşılaştırmaya kadrajın tam olarak bu karesi
                giriyor, satıcı ürünü buraya sığdırdığında eşleşme oluyor. */}
            <div className="relative h-4/5 w-4/5 rounded-xl border-2 border-accent/80">
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-on-deep">
                Ürünü çerçeveye sığdırın
              </span>
            </div>
          </div>
        )}

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="diagonal-stripes absolute inset-0 opacity-20" />

            {phase === "loading" && (
              <p className="relative text-sm text-on-deep/70">
                Ürünleriniz hazırlanıyor…
              </p>
            )}

            {phase === "opening" && (
              <>
                <IconImage className="relative h-14 w-14 animate-pulse text-accent" />
                <p className="relative text-sm text-on-deep/70">Ürün açılıyor…</p>
              </>
            )}

            {phase === "empty" && (
              <>
                <IconImage
                  className="relative h-14 w-14 text-on-deep/40"
                  strokeWidth={1.2}
                />
                <p className="relative max-w-xs text-sm text-on-deep/70">
                  Görselden arama, ürünlerin fotoğraflarını karşılaştırıyor.
                  Fotoğrafı olan ürününüz yok — ürün sayfasından fotoğraf
                  ekledikçe buradan aranabilir olurlar.
                </p>
              </>
            )}

            {(phase === "idle" || phase === "failed") && (
              <>
                <IconImage
                  className="relative h-14 w-14 text-on-deep/40"
                  strokeWidth={1.2}
                />
                <p className="relative max-w-xs text-sm text-on-deep/70">
                  Ürünün kendisini kameraya gösterin.
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="btn btn-primary relative"
                >
                  <IconScan className="h-4 w-4" />
                  {phase === "failed" ? "Tekrar dene" : "Kamerayı aç"}
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
            aria-label="Aramayı durdur"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="card border-accent/40 bg-accent/5">
          <p className="text-sm text-ink">{error}</p>
        </div>
      )}

      {/* Sistem emin olamadığında sessizce beklemek yerine ne gördüğünü
          söylüyor: satıcı doğru ürünü listeden tek dokunuşla açıyor, kameranın
          bir gün tanımasını beklemiyor. */}
      {live && showHints && nearest.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Bunlardan biri mi?
          </p>
          {nearest.map(({ product }) => (
            <button
              key={product.id}
              type="button"
              onClick={() => openProduct(product)}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left transition hover:border-accent"
            >
              <ProductThumb src={product.images[0] ?? null} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-ink">
                  {product.name}
                </span>
                {product.barcode && (
                  <span className="text-xs text-ink-muted">No: {product.barcode}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Adayları kadrajdaki kareye benzerliklerine göre sıralar. */
function rank(
  catalog: VisualCandidate[],
  frame: Omit<ImageSignature, "url">
): Scored[] {
  const scored: Scored[] = [];

  for (const product of catalog) {
    let best = 0;
    // Ürünün iki fotoğrafı olabilir; hangi yüzü gösterilirse gösterilsin
    // tanınsın diye en iyi eşleşen alınıyor.
    for (const signature of product.signatures) {
      const score = similarity(frame, signature);
      if (score > best) best = score;
    }
    if (best > 0) scored.push({ product, score: best });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Ürünün eksik parmak izlerini fotoğrafını indirerek çıkarır; hepsi zaten
 * varsa null döner (yazacak bir şey yok demektir).
 */
async function fillSignatures(
  product: VisualCandidate
): Promise<ImageSignature[] | null> {
  const known = new Map(product.signatures.map((signature) => [signature.url, signature]));
  if (product.images.every((url) => known.has(url))) return null;

  const signatures: ImageSignature[] = [];

  for (const url of product.images) {
    const existing = known.get(url);
    if (existing) {
      signatures.push(existing);
      continue;
    }

    const described = await describeUrl(url);
    if (described) signatures.push({ url, ...described });
  }

  return signatures.length ? signatures : null;
}

/**
 * Görsel `crossOrigin` ile isteniyor: onsuz tuval "kirlenir" ve piksellerini
 * okumak tarayıcı tarafından engellenir. Depo kovası herkese açık okumaya
 * ayarlı olduğu için istek reddedilmiyor.
 */
function describeUrl(url: string): Promise<Omit<ImageSignature, "url"> | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        resolve(describeSource(image, image.naturalWidth, image.naturalHeight));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
