import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getPresence } from "@/lib/presence";
import { getStats, periodOf, PERIODS, type Bucket, type Period } from "@/lib/stats";
import LiveUsers from "@/components/yonetim/LiveUsers";
import StatsTrend from "@/components/yonetim/StatsTrend";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconPackage,
  IconQrCode,
} from "@/components/icons";

/** Kartların başlığı ve karşılaştırma cümlesi döneme göre değişiyor. */
const PERIOD_WORDS: Record<Period, { current: string; previous: string }> = {
  gun: { current: "Bugün", previous: "düne göre" },
  hafta: { current: "Bu hafta", previous: "geçen haftaya göre" },
  ay: { current: "Bu ay", previous: "geçen aya göre" },
};

const MEASURES = [
  { key: "scans", label: "QR kod okutuldu", icon: IconQrCode, color: "var(--color-viz-1)" },
  { key: "products", label: "Ürün eklendi", icon: IconPackage, color: "var(--color-viz-2)" },
  {
    key: "bookings",
    label: "Ürün rezerve edildi",
    icon: IconCalendar,
    color: "var(--color-viz-3)",
  },
] as const;

export default async function IstatistikPage({
  searchParams,
}: {
  searchParams: Promise<{ aralik?: string }>;
}) {
  // Yetki önce: kullanıcı ve güvenlik sayfalarındaki düzenin aynısı. Sayfayı
  // boş bırakmak yeterli, layout'taki AccessGuard kullanıcıyı yönlendiriyor.
  const [me, { aralik }] = await Promise.all([getProfile(), searchParams]);
  if (me?.role !== "superuser" || me.status !== "approved") return null;

  const period = periodOf(aralik);
  const [{ buckets, top, error }, presence] = await Promise.all([
    getStats(period),
    getPresence(),
  ]);

  const current: Bucket | undefined = buckets[buckets.length - 1];
  const previous: Bucket | undefined = buckets[buckets.length - 2];
  const words = PERIOD_WORDS[period];
  const topMax = Math.max(...top.map((t) => t.scans), 1);

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">İstatistik</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Bütün satıcıların toplamı. Bulunduğunuz dönem henüz sürüyor;
        karşılaştırma bir önceki tamamlanmış dönemle yapılıyor.
      </p>

      {/* Anlık sayı dönemden bağımsız, o yüzden dönem sekmelerinin de üstünde:
          sekmeler onu değiştirmiyor. */}
      <section className="mt-6">
        <LiveUsers initial={presence} />
      </section>

      <h2 className="mt-10 text-sm font-semibold text-ink">Dönemsel özet</h2>

      {/* Dönem seçimi. Sunucuda okunan bir arama parametresi — istemci
          bileşenine geçmeye değmiyor, üç bağlantı yeterli. */}
      <nav aria-label="Dönem" className="mt-3 inline-flex gap-1 rounded-md border border-border bg-card p-1">
        {PERIODS.map((p) => {
          const selected = p.key === period;
          return (
            <Link
              key={p.key}
              href={`/yonetim/istatistik?aralik=${p.key}`}
              aria-current={selected ? "page" : undefined}
              className={`rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-accent text-white"
                  : "text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <div className="card mt-6 flex items-start gap-3 border-danger/40">
          <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-ink">İstatistikler okunamadı.</p>
            <p className="mt-1 text-sm text-ink-muted">
              En olası sebep <code className="font-mono">0019_scan_log_and_stats.sql</code>{" "}
              göçünün henüz çalıştırılmamış olması. Supabase SQL düzenleyicisinde
              çalıştırdıktan sonra bu sayfa dolmaya başlar.
            </p>
            <p className="mt-2 font-mono text-xs text-ink-muted">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MEASURES.map((m) => (
              <StatCard
                key={m.key}
                icon={m.icon}
                color={m.color}
                label={m.label}
                title={words.current}
                value={current?.[m.key] ?? 0}
                previousValue={previous?.[m.key]}
                previousLabel={words.previous}
              />
            ))}
          </section>

          <section className="mt-6">
            <StatsTrend points={buckets} period={period} />
          </section>

          <section className="mt-6">
            <div className="card">
              <h2 className="text-lg font-bold text-ink">En çok okutulan ürünler</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Grafikteki dönem boyunca QR&apos;ı en çok okutulan beş ürün.
              </p>

              {top.length === 0 ? (
                <p className="mt-4 flex items-center gap-3 text-sm text-ink-muted">
                  <IconQrCode className="h-4 w-4 shrink-0" />
                  Bu dönemde hiç okutma kaydedilmedi.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {top.map((row, i) => (
                    <li key={row.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium text-ink">
                          <span className="mr-2 text-ink-muted tabular-nums">{i + 1}.</span>
                          {row.name}
                          <span className="ml-2 text-xs text-ink-muted">@{row.owner}</span>
                        </p>
                        <span className="count-up shrink-0 text-sm font-semibold text-ink">
                          {row.scans.toLocaleString("tr-TR")}
                        </span>
                      </div>
                      {/* Sayının yanındaki oran çubuğu: listedeki farkın
                          büyüklüğü rakamları karşılaştırmadan görünsün. */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, (row.scans / topMax) * 100)}%`,
                            background: "var(--color-viz-1)",
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  title,
  value,
  previousValue,
  previousLabel,
}: {
  icon: typeof IconQrCode;
  color: string;
  label: string;
  title: string;
  value: number;
  previousValue: number | undefined;
  previousLabel: string;
}) {
  const delta = previousValue === undefined ? null : value - previousValue;
  const percent =
    delta === null || !previousValue ? null : Math.round((delta / previousValue) * 100);

  return (
    <div className="card card-hover">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--color-surface)", color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {title}
          </p>
          <p className="truncate text-sm text-ink-muted">{label}</p>
        </div>
      </div>

      <p className="count-up mt-4 text-[32px] font-bold leading-none text-ink">
        {value.toLocaleString("tr-TR")}
      </p>

      {/* Yön hem okla hem yazıyla: renk tek başına taşımıyor. */}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
        {delta === null || delta === 0 ? (
          <span>{delta === 0 ? `Değişim yok, ${previousLabel}` : "Karşılaştırma yok"}</span>
        ) : (
          <>
            <IconArrowRight
              aria-hidden="true"
              className={`h-3.5 w-3.5 shrink-0 ${
                delta > 0 ? "-rotate-45 text-success" : "rotate-45 text-danger"
              }`}
            />
            <span className={delta > 0 ? "text-success" : "text-danger"}>
              {delta > 0 ? "+" : "−"}
              {Math.abs(delta).toLocaleString("tr-TR")}
              {percent !== null && ` (%${Math.abs(percent)})`}
            </span>
            <span>{previousLabel}</span>
          </>
        )}
      </p>
    </div>
  );
}
