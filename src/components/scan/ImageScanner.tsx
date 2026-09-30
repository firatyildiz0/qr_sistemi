"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVisualCandidates,
  saveImageSignatures,
  type VisualCandidate,
} from "@/app/actions";
import {
  decodeEmbedding,
  DETAY_KIRPIMLARI,
  encodeEmbedding,
  eslestiriciKur,
  kesinEslesme,
  MODEL_TAG,
  puanla,
  type Eslestirici,
  type ImageSignature,
  type Puan,
  type UrunGomuleri,
} from "@/lib/vision";
import { loadRecognizer } from "@/lib/recognizer";
import ProductThumb from "@/components/admin/ProductThumb";
import { IconImage, IconScan, IconX } from "@/components/icons";

/** Son kaç ölçümün oyuna bakılıyor, kaçının aynı ürünü göstermesi gerekiyor. */
const WINDOW = 5;
const VOTES = 3;
/** İki ölçüm arası. Model bir kareyi milisaniyelerle işliyor, sınır göz. */
const INTERVAL_MS = 200;
/** Bu kadar süre eşleşme çıkmazsa en yakın adaylar elle seçilsin diye listelenir. */
const HINT_AFTER_MS = 3500;
/**
 * Her ölçümde denenen kırpımlar: çerçevenin tamamı, ortasındaki daha dar alan
 * ve yakın plan. Ürün uzaktaysa birincisi, çerçeveyi taşıracak kadar yakınsa
 * ikincisi tutuyor; üçüncüsü ürünün ayırt edici detayına (desen, logo,
 * etiket) yaklaşıldığında katalogdaki detay parçalarıyla buluşuyor.
 */
const CROPS = [1, 0.7, 0.4];
/** Modelin girdi boyu; kare bu ölçüde bir tuvale çiziliyor. */
const FRAME_SIZE = 224;

type Phase =
  | "loading"
  | "empty"
  | "idle"
  | "starting"
  | "scanning"
  | "opening"
  | "failed";

type Matcher = Eslestirici<VisualCandidate>;

/**
 * Kamerayı ürünün kendisine tutarak rezervasyon ekranını açan tarayıcı.
 *
 * QR okutmanın yanındaki ikinci yol: etiket düşmüş, yıpranmış ya da ürünün
 * içinde kalmış olabilir, ürünün kendisi ise her zaman ortada. Eşleşme
 * bulunduğunda gidilen yer QR ile birebir aynı — satıcının bildiği ürün
 * sayfası.
 *
 * Tanıma, kamera karesini satıcının kendi ürün fotoğraflarıyla karşılaştıran
 * bir görüntü modeline dayanıyor (bkz. `recognizer.ts`). Yine de yanılabilir,
 * o yüzden bir ürüne gitmek için üç şart birden aranıyor: puanı eşiği geçecek,
 * ikinciyi açık ara geçecek ve son beş ölçümün üçünü kazanacak. Emin
 * olunamadığında sistem tahmin yürütmüyor; tek bir aday belirgin biçimde öne
 * çıkıyorsa onu soruyor, çıkmıyorsa ayırt edici bir detayı göstermesini
 * istiyor.
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
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Emin olunamadığında gösterilen tek aday. */
  const [nearest, setNearest] = useState<VisualCandidate | null>(null);
  const [showHints, setShowHints] = useState(false);

  /**
   * Hazır katalog durum (`useState`) değil ref: ekranda ondan çizilen bir şey
   * yok, okuyan tek yer her ölçümde çalışan döngü. Durum olsaydı hem her
   * güncellemede bütün ekran yeniden çizilirdi, hem de döngü kapanışında
   * dondurduğu listeye takılırdı.
   */
  const matcherRef = useRef<Matcher>(eslestiriciKur<VisualCandidate>([]));
  /** Kamera karesinin modele verilmeden önce çizildiği tuval. */
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const embedRef = useRef<((source: CanvasImageSource) => Float32Array) | null>(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Model ve katalog birlikte hazırlanıyor. Fotoğrafı daha önce hiç
  // işlenmemiş ürünlerin gömüsü burada çıkarılıp veritabanına yazılıyor:
  // bir sonraki açılışta bu adım tamamen atlanıyor.
  useEffect(() => {
    let alive = true;

    void (async () => {
      let embed: (source: CanvasImageSource) => Float32Array;

      try {
        setProgress("Tanıma modeli hazırlanıyor…");
        const [recognizer, products] = await Promise.all([
          loadRecognizer(),
          getVisualCandidates(),
        ]);
        if (!alive) return;

        embed = recognizer.embed;
        embedRef.current = embed;

        if (!products.length) {
          setProgress(null);
          setPhase("empty");
          return;
        }

        const ready: UrunGomuleri<VisualCandidate>[] = [];

        for (const [index, product] of products.entries()) {
          if (!alive) return;
          setProgress(`Ürünler hazırlanıyor… ${index + 1}/${products.length}`);

          const { genel, detaylar, fresh } = await embeddingsOf(product, embed);
          if (!alive) return;

          if (genel.length) ready.push({ urun: product, genel, detaylar });
          if (fresh) void saveImageSignatures(product.id, fresh);
        }

        // Her ürünün diğerlerinden farkı burada, bir kez hesaplanıyor; kamera
        // açıkken yapılan iş yalnızca karşılaştırma.
        matcherRef.current = eslestiriciKur(ready);
        setProgress(null);
        setPhase(matcherRef.current.urunler.length ? "idle" : "empty");
      } catch {
        if (!alive) return;
        setProgress(null);
        setError(
          "Tanıma modeli yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin."
        );
        setPhase("failed");
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
    setNearest(null);
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

      /** Bir ölçüm; kilitlenecek ürün varsa onu döndürür. */
      const measure = (hinting: boolean): VisualCandidate | null => {
        const embed = embedRef.current;
        if (!embed) return null;

        const matcher = matcherRef.current;
        let ranked: Puan<VisualCandidate>[];
        try {
          ranked = puanla(
            matcher,
            CROPS.map((crop) => embed(squareFrame(video, frameCanvasRef, crop)))
          );
        } catch {
          // Tek bir bozuk kare taramayı bitirmeye değmez.
          return null;
        }

        // Emin olunamadığında tek bir aday gösteriliyor, o da yalnızca
        // ikinciden belirgin biçimde öndeyse. Eskiden en yakın üç ürün
        // listeleniyordu ve satıcı her seferinde bir seçim yapmak zorunda
        // kalıyordu; aday gerçekten öne çıkmıyorsa hiç göstermemek daha doğru.
        if (hinting) {
          const [best, second] = ranked;
          const candidate =
            best &&
            best.puan >= matcher.esik * 0.85 &&
            (!second || best.puan - second.puan >= matcher.fark / 2)
              ? best.urun
              : null;
          const key = candidate?.id ?? "";
          if (key !== hintKeyRef.current) {
            hintKeyRef.current = key;
            setNearest(candidate);
          }
          setShowHints(true);
        }

        const winner = kesinEslesme(matcher, ranked);

        const votes = votesRef.current;
        votes.push(winner?.id ?? null);
        if (votes.length > WINDOW) votes.shift();

        if (!winner) return null;

        const agreeing = votes.filter((id) => id === winner.id).length;
        return agreeing >= VOTES ? winner : null;
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

  // Yalnızca hazırlık bittikten sonra ve bir kez: `startCamera` her durum
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
              <>
                <IconImage className="relative h-14 w-14 animate-pulse text-accent" />
                <p className="relative text-sm text-on-deep/70">{progress}</p>
                {/* İlk açılış uzun sürüyor ve sebebi görünmüyor; söylenmezse
                    satıcı ekranın takıldığını sanıp kapatır. */}
                <p className="relative max-w-xs text-xs text-on-deep/50">
                  İlk kullanımda birkaç saniye sürer, sonrasında hazır gelir.
                </p>
              </>
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
      {live && showHints && (
        <div className="flex flex-col gap-2">
          {nearest ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Bu mu?
              </p>
              <button
                type="button"
                onClick={() => openProduct(nearest)}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left transition hover:border-accent"
              >
                <ProductThumb src={nearest.images[0] ?? null} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-ink">{nearest.name}</span>
                  {nearest.barcode && (
                    <span className="text-xs text-ink-muted">No: {nearest.barcode}</span>
                  )}
                </span>
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Ürünü tanıyamadım. Onu diğerlerinden ayıran bir detayı (desen, logo,
              etiket, süsleme) çerçeveye yaklaştırın.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Kadrajın **ortasındaki kare**, modele verilmeye hazır hâlde.
 *
 * Kare kırpma tarafların simetrisi için değil, kameranın katalog fotoğrafına
 * benzemesi için: tarayıcı ekranında ürünün doldurması istenen çerçeve de tam
 * bu bölge. Kadrajın tamamı alınsaydı karşılaştırmaya deponun rafları da
 * girerdi.
 */
function squareFrame(
  video: HTMLVideoElement,
  canvasRef: { current: HTMLCanvasElement | null },
  ratio: number
): HTMLCanvasElement {
  const crop = Math.min(video.videoWidth, video.videoHeight) * ratio;
  const canvas = (canvasRef.current ??= document.createElement("canvas"));

  // Model girdiyi zaten 224'e indiriyor; tuvali de o boyda tutmak hem
  // kopyalanacak pikseli azaltıyor hem de her kırpımda tuvali yeniden
  // boyutlandırmayı gereksiz kılıyor.
  if (canvas.width !== FRAME_SIZE) {
    canvas.width = FRAME_SIZE;
    canvas.height = FRAME_SIZE;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D bağlam açılamadı.");

  ctx.drawImage(
    video,
    (video.videoWidth - crop) / 2,
    (video.videoHeight - crop) / 2,
    crop,
    crop,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );
  return canvas;
}

/**
 * Ürünün gömüleri — her fotoğrafın tamamı ve detay parçaları. Eksik olanlar
 * fotoğraf indirilip çıkarılıyor.
 *
 * `fresh`, yalnızca yeni bir şey hesaplandığında dolu dönüyor — hiçbir şey
 * değişmediyse veritabanına yazmanın anlamı yok.
 */
async function embeddingsOf(
  product: VisualCandidate,
  embed: (source: CanvasImageSource) => Float32Array
): Promise<{
  genel: Float32Array[];
  detaylar: Float32Array[];
  fresh: ImageSignature[] | null;
}> {
  const known = new Map(product.signatures.map((s) => [s.url, s]));
  const complete = product.images.every((url) => known.has(url));

  const genel: Float32Array[] = [];
  const detaylar: Float32Array[] = [];
  const signatures: ImageSignature[] = [];

  for (const url of product.images) {
    const existing = known.get(url);

    if (existing) {
      const decoded = decodeEmbedding(existing.embedding);
      if (decoded) {
        genel.push(decoded);
        for (const detail of existing.details) {
          const parca = decodeEmbedding(detail);
          if (parca) detaylar.push(parca);
        }
        signatures.push(existing);
      }
      continue;
    }

    const image = await loadImage(url);
    if (!image) continue;

    try {
      const embedding = embed(image);
      const parts = DETAY_KIRPIMLARI.map(([x, y, size]) => embed(cropImage(image, x, y, size)));

      genel.push(embedding);
      detaylar.push(...parts);
      signatures.push({
        url,
        model: MODEL_TAG,
        embedding: encodeEmbedding(embedding),
        details: parts.map(encodeEmbedding),
      });
    } catch {
      // Tek bir fotoğrafın işlenememesi ürünü aramadan düşürmemeli.
    }
  }

  return { genel, detaylar, fresh: complete ? null : signatures };
}

/**
 * Fotoğrafın bir parçası, modele verilecek boyda. Konum ve boy kısa kenara
 * oranla; parça fotoğrafın ortasına hizalı kare bölgenin içinden alınıyor.
 */
function cropImage(image: HTMLImageElement, x: number, y: number, size: number): HTMLCanvasElement {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const offsetX = (image.naturalWidth - side) / 2;
  const offsetY = (image.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D bağlam açılamadı.");

  ctx.drawImage(
    image,
    offsetX + x * side,
    offsetY + y * side,
    size * side,
    size * side,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );
  return canvas;
}

/**
 * Görsel `crossOrigin` ile isteniyor: onsuz tuval "kirlenir" ve piksellerini
 * okumak tarayıcı tarafından engellenir. Depo kovası herkese açık okumaya
 * ayarlı olduğu için istek reddedilmiyor.
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
