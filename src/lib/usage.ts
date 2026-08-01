import { createClient } from "@/lib/supabase/server";

/**
 * Supabase kullanım bilgileri.
 *
 * İki kaynaktan derleniyor:
 *
 * 1. Supabase'in kendi ölçüm ucu — `<proje>.supabase.co/customer/v1/privileged/
 *    metrics`. Prometheus biçiminde ~300 seri döndürüyor ve *o anki* durumu
 *    veriyor: veritabanı boyutu, disk, bellek, işlemci yükü, bağlantı sınırı.
 *    Kimlik doğrulaması service role anahtarıyla, yani yeni bir ortam
 *    değişkenine gerek yok.
 *
 *    Not: Supabase'in genel Management API'sinde (api.supabase.com) kullanım ya
 *    da kota veren bir uç *yok* — faturalama sayaçları yalnızca panelde. Anlık
 *    ve gerçek sayı isteniyorsa okunacak yer burası.
 *
 * 2. Veritabanının kendisi — `admin_usage()` (bkz. 0021). Ölçüm ucunun
 *    bilmediği üç şey: yüklenen dosyaların toplam boyutu, aylık aktif kullanıcı
 *    ve tablo başına kaplanan yer.
 *
 * İki kaynaktan biri düşerse diğeri gösterilmeye devam ediyor: sayfanın tamamı
 * tek bir okuma hatası yüzünden boşalmasın.
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

export type PlanKey = "free" | "pro";

export type Plan = {
  key: PlanKey;
  label: string;
  /** Veritabanının kendisi için ayrılan yer. */
  db: number;
  /** Yüklenen dosyalar. */
  storage: number;
  /** Aylık aktif kullanıcı. */
  mau: number;
  /** Aylık dışa veri aktarımı. Sayfada oran değil, kıyas için yazı olarak. */
  egress: number;
};

export const PLANS: Plan[] = [
  { key: "free", label: "Free", db: 500 * MB, storage: 1 * GB, mau: 50_000, egress: 5 * GB },
  { key: "pro", label: "Pro", db: 8 * GB, storage: 100 * GB, mau: 100_000, egress: 250 * GB },
];

export const DEFAULT_PLAN: PlanKey = "free";

/** Seçilen planın tutulduğu çerez (bkz. yonetim/kullanim/actions.ts). */
export const PLAN_COOKIE = "rentqr_plan";

export function planOf(value: string | undefined | null): Plan {
  return PLANS.find((p) => p.key === value) ?? PLANS.find((p) => p.key === DEFAULT_PLAN)!;
}

export type TableUsage = { name: string; bytes: number; rows: number };

export type Usage = {
  /** Ölçümün alındığı an, ISO. İstemci "kaç saniye önce" diye yazıyor. */
  measuredAt: string;

  /** Ölçüm ucundan gelenler. Uç okunamadıysa hepsi null. */
  dbBytes: number | null;
  diskUsed: number | null;
  diskTotal: number | null;
  memoryUsed: number | null;
  memoryTotal: number | null;
  /** Beş dakikalık yük ortalaması ve çekirdek sayısı. Oranı istemci kuruyor. */
  load: number | null;
  cores: number | null;
  maxConnections: number | null;
  /** Sunucu açıldığından beri gönderilen toplam veri. Aylık kota değil. */
  egressBytes: number | null;

  /** Veritabanından gelenler. Sorgu düşerse hepsi null. */
  storageBytes: number | null;
  storageObjects: number | null;
  mau: number | null;
  usersTotal: number | null;
  connections: number | null;
  tables: TableUsage[];

  /** Okunamayan kaynaklar — sayfa bunları tek tek söylüyor. */
  errors: string[];
};

// ---------------------------------------------------------------------------
// Ölçüm ucu
// ---------------------------------------------------------------------------

/** Yalnızca bu seriler ayrıştırılıyor: yanıt 600 KB, tamamını gezmeye gerek yok. */
const WANTED = new Set([
  "pg_database_size_bytes",
  "node_filesystem_size_bytes",
  "node_filesystem_avail_bytes",
  "node_memory_MemTotal_bytes",
  "node_memory_MemAvailable_bytes",
  "node_load5",
  "node_cpu_seconds_total",
  "node_network_transmit_bytes_total",
  "max_connections_connection_count",
]);

/** Ölçüm ucu yavaşsa sayfa onu beklemesin. */
const METRICS_TIMEOUT_MS = 6_000;

type Sample = { labels: Record<string, string>; value: number };

/**
 * Prometheus metin biçimini ayrıştırır: `ad{etiket="değer",...} sayı`.
 *
 * Değerler bilimsel gösterimle geliyor (`4.28220416e+08`), `Number` ikisini de
 * okuyor. Yorum satırları (`# HELP`, `# TYPE`) ve istenmeyen seriler daha ad
 * ayrılırken eleniyor.
 */
function parsePrometheus(text: string): Map<string, Sample[]> {
  const out = new Map<string, Sample[]>();

  for (const line of text.split("\n")) {
    if (!line || line.charCodeAt(0) === 35 /* # */) continue;

    const brace = line.indexOf("{");
    const space = line.indexOf(" ");
    const nameEnd = brace === -1 ? space : Math.min(brace, space === -1 ? brace : space);
    if (nameEnd <= 0) continue;

    const name = line.slice(0, nameEnd);
    if (!WANTED.has(name)) continue;

    const close = brace === -1 ? nameEnd : line.lastIndexOf("}") + 1;

    // Değerden sonra isteğe bağlı bir zaman damgası gelebiliyor; ilk parça
    // alınıyor ki o damga sayının yerine geçmesin.
    const value = Number(line.slice(close).trim().split(/\s+/)[0]);
    if (!Number.isFinite(value)) continue;

    const labels: Record<string, string> = {};
    if (brace !== -1) {
      for (const [, key, val] of line
        .slice(brace + 1, close - 1)
        .matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g)) {
        labels[key] = val;
      }
    }

    const list = out.get(name);
    if (list) list.push({ labels, value });
    else out.set(name, [{ labels, value }]);
  }

  return out;
}

function first(
  metrics: Map<string, Sample[]>,
  name: string,
  match?: (labels: Record<string, string>) => boolean
): number | null {
  const samples = metrics.get(name);
  if (!samples) return null;

  const found = match ? samples.find((s) => match(s.labels)) : samples[0];
  return found ? found.value : null;
}

/**
 * Postgres'in verisinin durduğu bölüm. Ölçüm ucu birden fazla dosya sistemi
 * bildiriyor; asıl kota `/data`'da. Bulunamazsa köke düşülüyor ki sayı hiç
 * olmamaktansa yaklaşık olsun.
 */
function diskSamples(metrics: Map<string, Sample[]>, name: string): number | null {
  return (
    first(metrics, name, (l) => l.mountpoint === "/data") ??
    first(metrics, name, (l) => l.mountpoint === "/")
  );
}

type MetricsResult = Pick<
  Usage,
  | "dbBytes"
  | "diskUsed"
  | "diskTotal"
  | "memoryUsed"
  | "memoryTotal"
  | "load"
  | "cores"
  | "maxConnections"
  | "egressBytes"
>;

const EMPTY_METRICS: MetricsResult = {
  dbBytes: null,
  diskUsed: null,
  diskTotal: null,
  memoryUsed: null,
  memoryTotal: null,
  load: null,
  cores: null,
  maxConnections: null,
  egressBytes: null,
};

async function readMetrics(): Promise<{ metrics: MetricsResult; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { metrics: EMPTY_METRICS, error: "Supabase anahtarları tanımlı değil." };
  }

  let text: string;
  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/customer/v1/privileged/metrics`, {
      headers: {
        // Ucun beklediği kimlik: kullanıcı adı sabit `service_role`, parola
        // servis anahtarı.
        Authorization: `Basic ${Buffer.from(`service_role:${key}`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(METRICS_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        metrics: EMPTY_METRICS,
        error: `Supabase ölçüm ucu ${response.status} döndü.`,
      };
    }
    text = await response.text();
  } catch {
    return { metrics: EMPTY_METRICS, error: "Supabase ölçüm ucuna ulaşılamadı." };
  }

  const m = parsePrometheus(text);

  const diskTotal = diskSamples(m, "node_filesystem_size_bytes");
  const diskAvail = diskSamples(m, "node_filesystem_avail_bytes");
  const memoryTotal = first(m, "node_memory_MemTotal_bytes");
  const memoryAvailable = first(m, "node_memory_MemAvailable_bytes");

  // Çekirdek sayısı ayrı bir seri değil: `node_cpu_seconds_total` her çekirdek
  // için ayrı etiketle geliyor, benzersiz `cpu` etiketlerini saymak yeterli.
  const cpuLabels = new Set((m.get("node_cpu_seconds_total") ?? []).map((s) => s.labels.cpu));

  // Birden fazla ağ arayüzü olabilir; toplamı gönderilen veri.
  const transmit = m.get("node_network_transmit_bytes_total");

  return {
    error: null,
    metrics: {
      dbBytes: first(m, "pg_database_size_bytes", (l) => l.datname === "postgres"),
      diskTotal,
      diskUsed: diskTotal !== null && diskAvail !== null ? diskTotal - diskAvail : null,
      memoryTotal,
      memoryUsed:
        memoryTotal !== null && memoryAvailable !== null ? memoryTotal - memoryAvailable : null,
      load: first(m, "node_load5"),
      cores: cpuLabels.size > 0 ? cpuLabels.size : null,
      maxConnections: first(m, "max_connections_connection_count"),
      egressBytes: transmit ? transmit.reduce((sum, s) => sum + s.value, 0) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Veritabanı
// ---------------------------------------------------------------------------

type DbUsage = Pick<
  Usage,
  "storageBytes" | "storageObjects" | "mau" | "usersTotal" | "connections" | "tables"
>;

const EMPTY_DB: DbUsage = {
  storageBytes: null,
  storageObjects: null,
  mau: null,
  usersTotal: null,
  connections: null,
  tables: [],
};

/**
 * Sorgu oturumun kendi anahtarıyla atılıyor, service role ile değil: fonksiyon
 * `security definer` ve içinde `is_superuser()` var, yani yetkiyi veritabanı
 * veriyor — istatistik sayfasındaki düzenin aynısı.
 */
async function readDbUsage(): Promise<{ usage: DbUsage; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_usage");

  if (error || !data) {
    return {
      usage: EMPTY_DB,
      error: "Depolama ve kullanıcı sayıları okunamadı (0021 göçü çalıştırıldı mı?).",
    };
  }

  const row = data as {
    storage_bytes: number | string;
    storage_objects: number | string;
    mau: number | string;
    users_total: number | string;
    connections: number | string;
    tables: TableUsage[] | null;
  };

  return {
    error: null,
    usage: {
      storageBytes: Number(row.storage_bytes),
      storageObjects: Number(row.storage_objects),
      mau: Number(row.mau),
      usersTotal: Number(row.users_total),
      connections: Number(row.connections),
      tables: (row.tables ?? []).map((t) => ({
        name: t.name,
        bytes: Number(t.bytes),
        rows: Number(t.rows),
      })),
    },
  };
}

/** Sayfanın ve `/api/kullanim` ucunun ortak girişi. */
export async function getUsage(): Promise<Usage> {
  const [metrics, db] = await Promise.all([readMetrics(), readDbUsage()]);

  return {
    measuredAt: new Date().toISOString(),
    ...metrics.metrics,
    ...db.usage,
    errors: [metrics.error, db.error].filter((e): e is string => e !== null),
  };
}
