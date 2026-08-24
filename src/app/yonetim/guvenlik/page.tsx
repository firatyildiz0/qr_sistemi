import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import type { SecurityEventKind, Severity } from "@/lib/security";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconShield,
} from "@/components/icons";

type EventRow = {
  id: string;
  kind: SecurityEventKind;
  severity: Severity;
  identifier: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Özetin baktığı alanlar. IP yalnızca burada, yalnızca sayılmak için okunuyor:
 * "kaç ayrı yerden denendi" sorusu dağıtık bir denemeyi ele veriyor, adresin
 * kendisi ise ekranda hiçbir soruyu cevaplamıyor.
 */
type SummaryRow = {
  kind: SecurityEventKind;
  severity: Severity;
  ip: string | null;
};

/** Kaç olay listelenecek. Daha eskisi 90 günde bir budanıyor (bkz. 0017). */
const PAGE_SIZE = 100;

/** "Son 24 saat" özetinin penceresi. */
const SUMMARY_HOURS = 24;

const KIND_LABEL: Record<SecurityEventKind, string> = {
  login_failed: "Başarısız giriş",
  login_ok: "Giriş yapıldı",
  signup: "Yeni kayıt",
  rate_limited: "Hız sınırı devreye girdi",
  unauthorized: "Yetkisiz erişim denemesi",
  cron_unauthorized: "Cron ucuna geçersiz istek",
  alert_sent: "Uyarı gönderildi",
};

const SEVERITY_PILL: Record<Severity, string> = {
  info: "pill-muted",
  warning: "pill-warning",
  critical: "pill-danger",
};

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Kayıtları service role ile okuyor.
 *
 * `security_events` üzerinde superuser'a açık bir select politikası var, ama
 * sayfa zaten service role'e ihtiyaç duyacak kadar özet çıkarıyor ve yetki
 * aşağıda elle doğrulanıyor — kullanıcı listesi sayfasındaki (page.tsx) düzenin
 * aynısı.
 */
async function loadEvents(): Promise<{ rows: EventRow[]; summary: Summary }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - SUMMARY_HOURS * 3_600_000).toISOString();

  const [{ data: rows }, { data: recent }] = await Promise.all([
    admin
      .from("security_events")
      .select("id, kind, severity, identifier, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    admin
      .from("security_events")
      .select("kind, severity, ip")
      .gte("created_at", since),
  ]);

  return {
    rows: (rows ?? []) as EventRow[],
    summary: summarize((recent ?? []) as SummaryRow[]),
  };
}

type Summary = {
  failed: number;
  critical: number;
  blocked: number;
  /** Kaç ayrı IP başarısız giriş denedi — dağıtık bir denemenin işareti. */
  distinctIps: number;
};

function summarize(rows: SummaryRow[]): Summary {
  const ips = new Set<string>();

  for (const row of rows) {
    if (row.kind === "login_failed" && row.ip) ips.add(row.ip);
  }

  return {
    failed: rows.filter((r) => r.kind === "login_failed").length,
    critical: rows.filter((r) => r.severity === "critical").length,
    blocked: rows.filter((r) => r.kind === "rate_limited").length,
    distinctIps: ips.size,
  };
}

export default async function GuvenlikPage() {
  // Yetki önce, service role sonra — kullanıcı sayfasındaki gerekçenin aynısı.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") return null;

  const { rows, summary } = await loadEvents();
  const quiet = summary.critical === 0 && summary.blocked === 0;

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Güvenlik</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Giriş denemeleri ve yetkisiz erişim girişimleri. Kayıtlar 90 gün saklanır.
      </p>

      {/* Sayfaya girildiğinde ilk görülmesi gereken: son 24 saatte olağandışı
          bir şey var mı, yok mu. Liste onun ayrıntısı. */}
      <div
        className={`card mt-6 flex items-start gap-3 ${
          quiet ? "" : "border-danger/40"
        }`}
      >
        {quiet ? (
          <IconCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        ) : (
          <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        )}
        <div>
          <p className="font-semibold text-ink">
            {quiet
              ? `Son ${SUMMARY_HOURS} saatte olağandışı bir hareket yok.`
              : `Son ${SUMMARY_HOURS} saatte dikkat gerektiren hareket var.`}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {summary.failed} başarısız giriş
            {summary.distinctIps > 0 && ` (${summary.distinctIps} ayrı IP)`}
            {" · "}
            {summary.blocked} kez hız sınırı devreye girdi
            {" · "}
            {summary.critical} kritik olay
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Son olaylar</h2>

        {rows.length === 0 ? (
          <p className="card mt-3 flex items-center gap-3 text-sm text-ink-muted">
            <IconShield className="h-4 w-4 shrink-0" />
            Henüz kayıtlı olay yok.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="card flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`pill ${SEVERITY_PILL[row.severity]}`}>
                      {KIND_LABEL[row.kind] ?? row.kind}
                    </span>
                    {row.identifier && (
                      <span className="truncate font-medium text-ink">
                        {row.identifier}
                      </span>
                    )}
                  </div>
                  {row.detail && Object.keys(row.detail).length > 0 && (
                    <p className="mt-1 truncate font-mono text-xs text-ink-muted">
                      {JSON.stringify(row.detail)}
                    </p>
                  )}
                </div>

                {/* Olayın zamanı var, adresi yok: IP kişisel veri ve bu
                    listede kimsenin bakıp bir şey yapacağı bir bilgi değil.
                    Hız sınırı onu yine de tabloda tutup kendi içinde
                    kullanıyor. */}
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-xs text-ink-muted">
                    {timeFormat.format(new Date(row.created_at))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
