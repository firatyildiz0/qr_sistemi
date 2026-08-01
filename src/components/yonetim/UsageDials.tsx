"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBytes } from "@/lib/format";
import type { Plan, Usage } from "@/lib/usage";
import {
  IconAlertTriangle,
  IconBolt,
  IconDatabase,
  IconImage,
  IconRefresh,
  IconServer,
  IconUsers,
} from "@/components/icons";

/**
 * Supabase kullanım göstergeleri.
 *
 * İlk değer sunucudan geliyor, yani sayfayı her açış zaten taze bir ölçüm. Kendi
 * kendine tazelemesi bilerek seyrek: bir ölçüm Supabase'den ~24 KB indiriyor ve
 * bu, projenin aylık dışa aktarım kotasından düşüyor. On beş saniyede bir
 * yenilenen bir sekme ayda gigabaytlarca yer tutardı; oysa buradaki sayılar
 * (veritabanı boyutu, aylık aktif kullanıcı, disk) saatler içinde kıpırdıyor.
 *
 * O yüzden düzen şu: açık unutulmuş bir sekme günde bir iki kez tazeleniyor,
 * daha yenisi isteniyorsa Yenile düğmesi var. Düğmenin de kısa bir bekleme
 * süresi var — arka arkaya basmak kotayı yakmasın.
 *
 * Halkalar bir kotanın ne kadarının dolduğunu gösteriyor; ölçüsü olan ama kotası
 * olmayan şeyler (bellek, işlemci, bağlantı) altta çubuk. Renk tek başına hiçbir
 * şey taşımıyor: her halkanın yanında durumu yazan bir etiket var.
 */

/** Ölçüm bu kadar eskidiyse kendiliğinden tazeleniyor: açık bir sekmede günde iki kez. */
const REFRESH_MS = 12 * 60 * 60 * 1000;

/** Yaşın ne sıklıkla sınandığı. Ağa çıkmıyor, yalnızca saate bakıyor. */
const CHECK_MS = 60_000;

/** Yenile düğmesinin iki basış arasında beklettiği süre. */
const COOLDOWN_MS = 30_000;

/** Halkanın rengini ve yanındaki yazıyı belirleyen eşikler. */
const LEVELS = [
  { upTo: 0.7, tone: "var(--color-success)", label: "Rahat" },
  { upTo: 0.9, tone: "var(--color-warning)", label: "Dikkat" },
  { upTo: Infinity, tone: "var(--color-danger)", label: "Sınırda" },
] as const;

function levelOf(ratio: number) {
  return LEVELS.find((l) => ratio < l.upTo) ?? LEVELS[LEVELS.length - 1];
}

/** "%12" / "%2,4" — küçük oranlarda tek basamak, büyüklerde tam sayı. */
function formatPercent(ratio: number): string {
  const percent = ratio * 100;
  const digits = percent > 0 && percent < 10 ? 1 : 0;
  return `%${percent.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatCount(value: number): string {
  return value.toLocaleString("tr-TR");
}

export default function UsageDials({ initial, plan }: { initial: Usage; plan: Plan }) {
  const [usage, setUsage] = useState(initial);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Yenile düğmesinin tekrar basılabileceği an. Sıfır: bekleme yok. */
  const [readyAt, setReadyAt] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  /**
   * Son *deneme* anı — son başarılı ölçümünki değil. Kendiliğinden tazeleme
   * buna bakıyor: ölçüm ucu düştüğünde `measuredAt` olduğu yerde kalır ve yaşa
   * bakan sınama her dakika yeniden denemeye başlardı.
   */
  const lastTryRef = useRef(new Date(initial.measuredAt).getTime());
  const now = useNow();

  const load = useCallback(async () => {
    lastTryRef.current = Date.now();

    // Süren bir istek varsa bırakılıyor: düğmeye basıldığında bekleyen eski
    // sorgunun sonucu yenisinin üstüne yazmasın.
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);

    try {
      const response = await fetch("/api/kullanim", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(String(response.status));
      setUsage((await response.json()) as Usage);
      setStale(false);
    } catch {
      // İptal edilen istek hata değil: yerine yenisi geçti ya da bileşen
      // kaldırıldı. İkisinde de `busy` yeni isteğin sorumluluğunda.
      if (controller.signal.aborted) return;
      setStale(true);
    }

    setBusy(false);
  }, []);

  // Bileşen kaldırılırken açık kalan istek kapatılıyor.
  useEffect(() => () => requestRef.current?.abort(), []);

  /**
   * Kendiliğinden tazeleme. Zamanlayıcı `REFRESH_MS`'te bir kurulmuyor, dakikada
   * bir *yaşa bakıyor*: arka plandaki sekmede zamanlayıcılar kısılıyor ve uzun
   * bir aralık böyle kaçırılabiliyor. Aynı sınama sekme öne geldiğinde de
   * çalışıyor, o yüzden sekmeler arası her gidiş geliş değil yalnızca ölçüm
   * gerçekten eskimişse ağa çıkılıyor.
   */
  useEffect(() => {
    const maybeLoad = () => {
      if (document.hidden) return;
      if (Date.now() - lastTryRef.current < REFRESH_MS) return;
      void load();
    };

    const timer = setInterval(maybeLoad, CHECK_MS);
    document.addEventListener("visibilitychange", maybeLoad);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", maybeLoad);
    };
  }, [load]);

  // Bekleme başarısız denemede de başlıyor: ölçüm ucu düştüyse düğmeye arka
  // arkaya basmak onu geri getirmez.
  const refresh = () => {
    setReadyAt(Date.now() + COOLDOWN_MS);
    void load();
  };

  const waitLeft = now === null ? 0 : Math.max(0, Math.ceil((readyAt - now) / 1000));

  const quotas = [
    {
      id: "db",
      icon: IconDatabase,
      label: "Veritabanı",
      used: usage.dbBytes,
      limit: plan.db,
      format: formatBytes,
      note: "Tablolar, indeksler, kayıtlar",
    },
    {
      id: "storage",
      icon: IconImage,
      label: "Dosyalar",
      used: usage.storageBytes,
      limit: plan.storage,
      format: formatBytes,
      note:
        usage.storageObjects === null
          ? "Yüklenen ürün görselleri"
          : `${formatCount(usage.storageObjects)} yüklenmiş dosya`,
    },
    {
      id: "mau",
      icon: IconUsers,
      label: "Aylık aktif kullanıcı",
      used: usage.mau,
      limit: plan.mau,
      format: formatCount,
      note: "Son 30 günde giriş yapan",
    },
    {
      id: "disk",
      icon: IconServer,
      label: "Disk alanı",
      used: usage.diskUsed,
      limit: usage.diskTotal,
      format: formatBytes,
      note: "Sunucunun veri diski",
    },
  ];

  const health = [
    {
      id: "memory",
      label: "Bellek",
      used: usage.memoryUsed,
      limit: usage.memoryTotal,
      detail:
        usage.memoryUsed !== null && usage.memoryTotal !== null
          ? `${formatBytes(usage.memoryUsed)} / ${formatBytes(usage.memoryTotal)}`
          : null,
    },
    {
      id: "cpu",
      label: "İşlemci yükü",
      used: usage.load,
      limit: usage.cores,
      detail:
        usage.load !== null && usage.cores !== null
          ? `${usage.load.toLocaleString("tr-TR", {
              maximumFractionDigits: 2,
            })} / ${usage.cores} çekirdek`
          : null,
    },
    {
      id: "connections",
      label: "Açık bağlantı",
      used: usage.connections,
      limit: usage.maxConnections,
      detail:
        usage.connections !== null && usage.maxConnections !== null
          ? `${formatCount(usage.connections)} / ${formatCount(usage.maxConnections)}`
          : null,
    },
  ];

  const tableMax = Math.max(...usage.tables.map((t) => t.bytes), 1);

  return (
    <>
      {usage.errors.length > 0 && (
        <div className="card mt-6 flex items-start gap-3 border-danger/40">
          <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-ink">Bazı ölçüler okunamadı.</p>
            <ul className="mt-1 space-y-1 text-sm text-ink-muted">
              {usage.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Ölçümün yaşı ve Yenile düğmesi halkaların üstünde: aşağıdaki bütün
          sayılar aynı ölçüme ait, ne zaman alındığını bir kez söylemek yeterli.
          Nokta yalnızca yenilenirken atıyor — sürekli atan bir nokta sayıların
          saniye saniye tazelendiğini söylerdi, oysa öyle değil. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Yenileme durumu başarısızlığın önünde: hata sonrası tekrar
              denenirken nokta "hâlâ bozuk" değil "deniyorum" demeli. */}
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              busy ? "live-dot bg-accent" : stale ? "bg-danger" : "bg-success"
            }`}
          />
          <span className="eyebrow text-ink-muted">
            {busy ? "Yenileniyor" : stale ? "Ölçüm alınamadı" : "Son ölçüm"}
          </span>
          <span className="text-xs text-ink-muted">
            · <MeasuredAt at={usage.measuredAt} now={now} />
          </span>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={busy || waitLeft > 0}
          className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconRefresh
            aria-hidden="true"
            className={`h-4 w-4 ${busy ? "nav-spinner" : ""}`}
          />
          {busy ? "Yenileniyor…" : waitLeft > 0 ? `Yenile (${waitLeft} sn)` : "Yenile"}
        </button>
      </div>

      {/* Düğmenin neden bazen beklettiğini söylüyor: sayfa bozuk değil. */}
      <p className="mt-2 text-xs text-ink-muted">
        Sayfa kendini günde bir iki kez tazeliyor. Her ölçüm Supabase&apos;den
        veri indirdiği için daha sık değil — daha yenisi gerekiyorsa Yenile.
      </p>

      <section
        aria-label="Plan sınırları"
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {quotas.map((q) => (
          <QuotaDial key={q.id} {...q} />
        ))}
      </section>

      <section className="mt-6">
        <div className="card">
          <div className="flex items-center gap-2">
            <IconBolt className="h-4 w-4 text-ink-muted" />
            <h2 className="text-lg font-bold text-ink">Sunucu durumu</h2>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Bunların bir kotası yok; yükseldiklerinde site yavaşlar.
          </p>

          <div className="mt-5 space-y-4">
            {health.map((h) => (
              <HealthBar key={h.id} {...h} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold text-ink">En çok yer kaplayanlar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Veritabanındaki tablolar, indeksleriyle birlikte.
          </p>

          {usage.tables.length === 0 ? (
            <p className="mt-4 flex items-center gap-3 text-sm text-ink-muted">
              <IconDatabase className="h-4 w-4 shrink-0" />
              Tablo bilgisi okunamadı.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {usage.tables.map((table) => (
                <li key={table.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">
                      {table.name}
                      <span className="ml-2 text-xs text-ink-muted">
                        ~{formatCount(table.rows)} satır
                      </span>
                    </p>
                    <span className="count-up shrink-0 text-sm font-semibold text-ink">
                      {formatBytes(table.bytes)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="usage-bar h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (table.bytes / tableMax) * 100)}%`,
                        background: "var(--color-viz-1)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-ink">Diğer sayılar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Kotası olmayan ya da ay içinde biriken ölçüler.
          </p>

          <dl className="mt-4 space-y-3">
            <Fact
              term="Kayıtlı kullanıcı"
              value={usage.usersTotal === null ? null : formatCount(usage.usersTotal)}
              hint="Onay bekleyenler dahil, bütün hesaplar"
            />
            <Fact
              term="Gönderilen veri"
              value={usage.egressBytes === null ? null : formatBytes(usage.egressBytes)}
              hint={`Sunucu son açıldığından beri. ${plan.label} planının aylık sınırı ${formatBytes(
                plan.egress,
              )} — aylık toplamı yalnızca Supabase paneli gösteriyor.`}
            />
            <Fact
              term="Plan sınırları"
              value={`${formatBytes(plan.db)} veritabanı · ${formatBytes(plan.storage)} dosya`}
              hint={`${formatCount(plan.mau)} aylık aktif kullanıcı`}
            />
          </dl>
        </div>
      </section>
    </>
  );
}

/**
 * Bir kotanın halkası.
 *
 * Ölçü okunamadıysa halka boş ve ortada tire duruyor: sıfır göstermek "hiç
 * kullanılmamış" demek olurdu, oysa bilinmiyor.
 */
function QuotaDial({
  icon: Icon,
  label,
  used,
  limit,
  format,
  note,
}: {
  icon: typeof IconDatabase;
  label: string;
  used: number | null;
  limit: number | null;
  format: (value: number) => string;
  note: string;
}) {
  const known = used !== null && limit !== null && limit > 0;
  const ratio = known ? used / limit : 0;
  const level = levelOf(ratio);

  return (
    <div className="card card-hover flex flex-col items-center text-center">
      <div className="flex items-center gap-2 self-start">
        <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
        <p className="text-sm font-semibold text-ink">{label}</p>
      </div>

      <Ring ratio={known ? ratio : 0} tone={known ? level.tone : "var(--color-border-strong)"}>
        <span className="count-up text-xl font-bold leading-none text-ink">
          {known ? formatPercent(ratio) : "—"}
        </span>
        {known && (
          <span className="mt-1 text-[11px] font-medium text-ink-muted">{level.label}</span>
        )}
      </Ring>

      <p className="count-up mt-3 text-sm font-semibold text-ink">
        {used === null ? "—" : format(used)}
        <span className="font-normal text-ink-muted">
          {" / "}
          {limit === null ? "—" : format(limit)}
        </span>
      </p>
      <p className="mt-1 text-xs text-ink-muted">{note}</p>
    </div>
  );
}

/** Halkanın kendisi. Yüzde metni ortada, `children` olarak geliyor. */
function Ring({
  ratio,
  tone,
  children,
}: {
  ratio: number;
  tone: string;
  children: React.ReactNode;
}) {
  const RADIUS = 46;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  // Kota aşıldığında halka tam dolu kalıyor: ikinci turu çizmek yüzdeyi
  // olduğundan küçük gösterirdi.
  const filled = Math.min(Math.max(ratio, 0), 1);

  return (
    <div className="relative mt-4 flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="11"
          stroke="var(--color-border)"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          stroke={tone}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
          className="usage-arc"
        />
      </svg>
      <div className="absolute flex flex-col items-center">{children}</div>
    </div>
  );
}

function HealthBar({
  label,
  used,
  limit,
  detail,
}: {
  label: string;
  used: number | null;
  limit: number | null;
  detail: string | null;
}) {
  const known = used !== null && limit !== null && limit > 0;
  const ratio = known ? Math.min(used / limit, 1) : 0;
  const level = levelOf(known ? used / limit : 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          {label}
          {known && <span className="ml-2 text-xs text-ink-muted">{level.label}</span>}
        </p>
        <span className="count-up shrink-0 text-sm text-ink-muted">{detail ?? "—"}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="usage-bar h-full rounded-full"
          style={{
            width: `${known ? Math.max(2, ratio * 100) : 0}%`,
            background: known ? level.tone : "transparent",
          }}
        />
      </div>
    </div>
  );
}

function Fact({
  term,
  value,
  hint,
}: {
  term: string;
  value: string | null;
  hint: string;
}) {
  return (
    <div className="rounded-md bg-surface px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{term}</dt>
      <dd className="count-up mt-1 text-lg font-bold leading-none text-ink">{value ?? "—"}</dd>
      <dd className="mt-1.5 text-xs text-ink-muted">{hint}</dd>
    </div>
  );
}

/**
 * Saniyede bir ilerleyen "şu an".
 *
 * Sunucuda üretilemez: sunucunun saatiyle yazılmış bir "3 dakika önce" ilk
 * çizimde istemcininkiyle uyuşmaz. O yüzden mount'tan önce `null` — hem ölçümün
 * yaşı hem düğmenin geri sayımı bunu bekliyor.
 *
 * İlk okuma da zamanlayıcıdan geçiyor, doğrudan efektin gövdesinden değil:
 * efektin içinden senkron `setState` çağırmak aynı karede ikinci bir çizim
 * tetikler.
 */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1_000);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return now;
}

/** "14 saniye önce" / "3 saat önce". */
function MeasuredAt({ at, now }: { at: string; now: number | null }) {
  if (now === null) return <span>ölçülüyor</span>;

  const seconds = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (seconds < 5) return <span>az önce</span>;
  if (seconds < 60) return <span>{seconds} saniye önce</span>;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return <span>{minutes} dakika önce</span>;
  return <span>{Math.round(minutes / 60)} saat önce</span>;
}
