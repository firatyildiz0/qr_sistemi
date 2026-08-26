"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVisualCandidates,
  saveImageSignatures,
  type VisualCandidate,
} from "@/app/actions";
import {
  cosine,
  decodeEmbedding,
  encodeEmbedding,
  MODEL_TAG,
  type ImageSignature,
} from "@/lib/vision";
import { loadRecognizer } from "@/lib/recognizer";
import ProductThumb from "@/components/admin/ProductThumb";
import { IconImage, IconScan, IconX } from "@/components/icons";

/**
 * Bir ürünün açılabilmesi için gereken en düşük benzerlik. Kaba bir elek:
 * kameranın tavana ya da zemine baktığı kareleri eliyor, ürünler arasında
 * seçim yapmıyor (bkz. `cosine`, ölçeğin neden dar olduğu orada).
 */
const MATCH_MIN = 0.7;
/**
 * Kataloğunda tek ürün olan satıcıda karşılaştıracak ikinci bir şey yok;
 * orada tek dayanak puanın kendisi, o yüzden çıta yüksek.
 */
const MATCH_SOLO_MIN = 0.82;
/** Birinci ile ikinci arasındaki en küçük açık ara. */
const MATCH_MARGIN = 0.03;
/**
 * Birincinin, kalabalığın geri kalanından kaç standart sapma ayrışması
 * gerektiği. Asıl karar bu: puanların mutlak değeri katalogdan kataloğa,
 * ışıktan ışığa kayıyor ama "diğerlerinden açık ara ayrıştı mı" sorusu her
 * yerde aynı şeyi soruyor.
 */
const MATCH_Z = 2.5;
/** Son kaç ölçümün oyuna bakılıyor, kaçının aynı ürünü göstermesi gerekiyor. */
const WINDOW = 5;
const VOTES = 3;
/** İki ölçüm arası. Model bir kareyi milisaniyelerle işliyor, sınır göz. */
const INTERVAL_MS = 200;
/** Bu kadar süre eşleşme çıkmazsa en yakın adaylar elle seçilsin diye listelenir. */
const HINT_AFTER_MS = 3500;
/**
 * Her ölçümde denenen kırpımlar: çerçevenin tamamı ve ortasındaki daha dar
 * alan. Ürün uzaktaysa birincisi, çerçeveyi taşıracak kadar yakınsa ikincisi
 * tutuyor.
 */
const CROPS = [1, 0.7];
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

type Entry = { product: VisualCandidate; vectors: Float32Array[] };
type Matcher = { entries: Entry[] };
type Scored = { product: VisualCandidate; score: number };

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
 * olunamadığında sistem tahmin yürütmüyor; en yakın üç adayı satıcının
 * dokunması için listeliyor.
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
  const [nearest, setNearest] = useState<Scored[]>([]);
  const [showHints, setShowHints] = useState(false);

  /**
   * Hazır katalog durum (`useState`) değil ref: ekranda ondan çizilen bir şey
   * yok, okuyan tek yer her ölçümde çalışan döngü. Durum olsaydı hem her
   * güncellemede bütün ekran yeniden çizilirdi, hem de döngü kapanışında
   * dondurduğu listeye takılırdı.
   */
  const matcherRef = useRef<Matcher>({ entries: [] });
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

        const ready: { product: VisualCandidate; embeddings: Float32Array[] }[] = [];

        for (const [index, product] of products.entries()) {
          if (!alive) return;
          setProgress(`Ürünler hazırlanıyor… ${index + 1}/${products.length}`);

          const { embeddings, fresh } = await embeddingsOf(product, embed);
          if (!alive) return;

          if (embeddings.length) ready.push({ product, embeddings });
          if (fresh) void saveImageSignatures(product.id, fresh);
        }

        matcherRef.current = {
          entries: ready.map((item) => ({
            product: item.product,
            vectors: item.embeddings,
          })),
        };
        setProgress(null);
        setPhase(matcherRef.current.entries.length ? "idle" : "empty");
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

      /** Bir ölçüm; kilitlenecek ürün varsa onu döndürür. */
      const measure = (hinting: boolean): VisualCandidate | null => {
        const embed = embedRef.current;
        if (!embed) return null;

        let ranked: Scored[];
        try {
          ranked = rank(
            matcherRef.current,
            CROPS.map((crop) => embed(squareFrame(video, frameCanvasRef, crop)))
          );
        } catch {
          // Tek bir bozuk kare taramayı bitirmeye değmez.
          return null;
        }

        // Saniyede beş ölçüm yapılıyor ama liste ancak sıralaması
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

        const winner = decide(ranked);

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
 * Ürünün gömüleri; eksik olanlar fotoğraf indirilip çıkarılıyor.
 *
 * `fresh`, yalnızca yeni bir şey hesaplandığında dolu dönüyor — hiçbir şey
 * değişmediyse veritabanına yazmanın anlamı yok.
 */
async function embeddingsOf(
  product: VisualCandidate,
  embed: (source: CanvasImageSource) => Float32Array
): Promise<{ embeddings: Float32Array[]; fresh: ImageSignature[] | null }> {
  const known = new Map(product.signatures.map((s) => [s.url, s]));
  const complete = product.images.every((url) => known.has(url));

  const embeddings: Float32Array[] = [];
  const signatures: ImageSignature[] = [];

  for (const url of product.images) {
    const existing = known.get(url);

    if (existing) {
      const decoded = decodeEmbedding(existing.embedding);
      if (decoded) {
        embeddings.push(decoded);
        signatures.push(existing);
      }
      continue;
    }

    const image = await loadImage(url);
    if (!image) continue;

    try {
      const embedding = embed(image);
      embeddings.push(embedding);
      signatures.push({ url, model: MODEL_TAG, embedding: encodeEmbedding(embedding) });
    } catch {
      // Tek bir fotoğrafın işlenememesi ürünü aramadan düşürmemeli.
    }
  }

  return { embeddings, fresh: complete ? null : signatures };
}

/**
 * Adayları kamera karesine benzerliklerine göre sıralar.
 *
 * Kare tek bir gömüyle değil, birkaçıyla temsil ediliyor: satıcı ürünü
 * çerçeveye katalog fotoğrafındakiyle aynı uzaklıkta tutmuyor. Aynı karenin
 * farklı yakınlıktaki kırpımlarından en iyi eşleşeni alınınca, "biraz geride
 * durmak" tanımayı kaçırmanın sebebi olmaktan çıkıyor.
 */
function rank(matcher: Matcher, queries: Float32Array[]): Scored[] {
  return matcher.entries
    .map((entry) => {
      let score = -1;
      for (const query of queries) {
        // Ürünün iki fotoğrafı olabilir; hangi yüzü gösterilirse gösterilsin
        // tanınsın diye en iyi eşleşen alınıyor.
        for (const vector of entry.vectors) {
          const value = cosine(query, vector);
          if (value > score) score = value;
        }
      }
      return { product: entry.product, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Sıralamanın tepesindeki ürün gerçekten "bulundu" sayılır mı?
 *
 * Üç soru birden soruluyor: puan yeterince yüksek mi, ikinciyi açık ara geçti
 * mi, ve kalabalığın geri kalanından ayrıştı mı. Sonuncusu az sayıda ürünü
 * olan satıcıda anlamsız (üç ürünün "dağılımı" olmaz), orada ilk iki soru
 * yetiyor.
 */
function decide(ranked: Scored[]): VisualCandidate | null {
  const [best, runnerUp] = ranked;
  if (!best || best.score < MATCH_MIN) return null;
  if (!runnerUp) return best.score >= MATCH_SOLO_MIN ? best.product : null;
  if (best.score - runnerUp.score < MATCH_MARGIN) return null;

  const rest = ranked.slice(1).map((item) => item.score);
  if (rest.length < 3) return best.product;

  const mean = rest.reduce((total, score) => total + score, 0) / rest.length;
  const variance =
    rest.reduce((total, score) => total + (score - mean) ** 2, 0) / rest.length;
  const deviation = Math.sqrt(variance);

  // Bütün adaylar aynı puandaysa sapma sıfıra iner; o durumda açık arayı
  // geçmiş olması yeterli.
  if (deviation < 1e-6) return best.product;

  return (best.score - mean) / deviation >= MATCH_Z ? best.product : null;
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
