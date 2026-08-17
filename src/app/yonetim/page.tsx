import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, type ProfileRole, type ProfileStatus } from "@/lib/profile";
import type { SubscriptionStatus } from "@/lib/subscription";
import UserActions from "@/components/yonetim/UserActions";
import { IconUsers } from "@/components/icons";

/** Listedeki bir hesabın abonelik özeti. Satır yoksa `null`. */
type SubscriptionCell = {
  status: SubscriptionStatus;
  /** Erişimin bittiği an — deneme ya da ödenmiş dönem, hangisi geçerliyse. */
  endsAt: string | null;
  priceTry: number | null;
  active: boolean;
};

type Row = {
  id: string;
  username: string;
  role: ProfileRole;
  status: ProfileStatus;
  createdAt: string;
  email: string | null;
  subscription: SubscriptionCell | null;
};

const STATUS_LABEL: Record<ProfileStatus, { text: string; pill: string }> = {
  pending: { text: "Onay bekliyor", pill: "pill-warning" },
  approved: { text: "Onaylı", pill: "pill-success" },
  rejected: { text: "Reddedildi", pill: "pill-danger" },
};

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, { text: string; pill: string }> = {
  trialing: { text: "Deneme", pill: "pill-accent" },
  active: { text: "Abone", pill: "pill-success" },
  past_due: { text: "Ödeme alınamadı", pill: "pill-danger" },
  canceled: { text: "İptal edildi", pill: "pill-warning" },
  expired: { text: "Süresi doldu", pill: "pill-muted" },
  lifetime: { text: "Ücretsiz", pill: "pill-muted" },
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

async function loadUsers(): Promise<Row[]> {
  const supabase = await createClient();

  // RLS: superuser bütün profilleri ve abonelikleri görür
  // (profiles_select_superuser, subscriptions_select_superuser).
  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, role, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("owner_id, status, trial_ends_at, current_period_end, price_try"),
  ]);

  if (!profiles?.length) return [];

  // E-posta `auth.users` içinde ve oraya anon anahtarla erişilemiyor; listeyi
  // service role ile alıp id üzerinden eşleştiriyoruz.
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emails = new Map(users?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  const now = Date.now();
  const byOwner = new Map(
    (subscriptions ?? []).map((s) => {
      const status = s.status as SubscriptionStatus;
      // Erişim ölçütü `has_subscription()` ile aynı: deneme tarihine,
      // ödenmiş dönem `current_period_end`'e bakıyor, `lifetime` süresiz.
      const endsAt =
        status === "trialing" ? s.trial_ends_at : s.current_period_end;

      return [
        s.owner_id as string,
        {
          status,
          endsAt,
          priceTry: s.price_try === null ? null : Number(s.price_try),
          active:
            status === "lifetime" ||
            (endsAt !== null && new Date(endsAt).getTime() > now),
        } satisfies SubscriptionCell,
      ];
    })
  );

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    role: p.role as ProfileRole,
    status: p.status as ProfileStatus,
    createdAt: p.created_at,
    email: emails.get(p.id) ?? null,
    subscription: byOwner.get(p.id) ?? null,
  }));
}

export default async function YonetimPage() {
  // Yetki önce, service role sonra. `loadUsers()` içindeki admin client RLS'i
  // tamamen atlıyor; onu yetkisiz bir istekle hiç kurmuyoruz. Sayfayı boş
  // bırakmak yeterli — layout'taki AccessGuard kullanıcıyı zaten yönlendirir,
  // `getProfile()` de cache'li olduğu için bu kontrol ekstra sorgu değil.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") return null;

  const rows = await loadUsers();
  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Kullanıcılar</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Yeni kayıtlar siz onaylayana kadar giriş yapamaz ve veri ekleyemez.
        Onaylanan hesap 14 günlük denemeyle başlar, sonrasında abonelik gerekir.
      </p>

      <RevenueSummary rows={rows} />

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">
          Onay bekleyenler
          {pending.length > 0 && (
            <span className="pill pill-warning ml-2">{pending.length}</span>
          )}
        </h2>

        {pending.length === 0 ? (
          <p className="card mt-3 flex items-center gap-3 text-sm text-ink-muted">
            <IconUsers className="h-4 w-4 shrink-0" />
            Onay bekleyen kayıt yok.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((row) => (
              <li
                key={row.id}
                className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <UserSummary row={row} />
                <UserActions userId={row.id} status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">Tüm hesaplar</h2>
        <ul className="mt-3 space-y-3">
          {rest.map((row) => (
            <li
              key={row.id}
              className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <UserSummary row={row} />
              {/* Superuser kendi hesabını kilitleyemesin. */}
              {row.id !== me.id && <UserActions userId={row.id} status={row.status} />}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/**
 * Aylık yinelenen gelir ve abone dağılımı.
 *
 * Ödeme yapan aboneler `active` ve `past_due` olanlar: ikisi de bir dönem
 * ödemiş. `trialing` ve `lifetime` geliri saymıyor — henüz (ya da hiç) para
 * ödemiyorlar, onları gelire katmak MRR'ı yanlış gösterirdi.
 */
function RevenueSummary({ rows }: { rows: Row[] }) {
  const paying = rows.filter(
    (r) => r.subscription?.status === "active" || r.subscription?.status === "past_due"
  );
  const trialing = rows.filter((r) => r.subscription?.status === "trialing");
  const lapsed = rows.filter(
    (r) => r.subscription !== null && !r.subscription.active && r.role === "seller"
  );

  // Her abone kendi ödediği tutardan sayılıyor: fiyat sonradan değişirse eski
  // aboneler eski plandan devam ediyor.
  const mrr = paying.reduce((sum, r) => sum + (r.subscription?.priceTry ?? 0), 0);

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: "Aylık gelir", value: TRY.format(mrr), hint: "KDV dahil, komisyon öncesi" },
    { label: "Ödeyen abone", value: String(paying.length) },
    { label: "Denemede", value: String(trialing.length) },
    { label: "Erişimi kapalı", value: String(lapsed.length) },
  ];

  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card">
          <dt className="text-xs font-medium text-ink-muted">{stat.label}</dt>
          <dd className="mt-1 text-xl font-bold tracking-tight text-ink">{stat.value}</dd>
          {stat.hint && <p className="mt-0.5 text-[11px] text-ink-muted">{stat.hint}</p>}
        </div>
      ))}
    </dl>
  );
}

function UserSummary({ row }: { row: Row }) {
  const status = STATUS_LABEL[row.status];
  const subscription = row.subscription;
  const label = subscription ? SUBSCRIPTION_LABEL[subscription.status] : null;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{row.username}</span>
        <span className={`pill ${status.pill}`}>{status.text}</span>
        {row.role === "superuser" && <span className="pill pill-accent">Yönetici</span>}
        {/* Abonelik rozeti yalnızca satıcılarda: superuser'dan ücret
            beklenmiyor (bkz. `can_write`). */}
        {row.role === "seller" && label && (
          <span className={`pill ${label.pill}`}>{label.text}</span>
        )}
      </div>
      <p className="mt-1 truncate text-sm text-ink-muted">{row.email ?? "e-posta yok"}</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        {dateFormat.format(new Date(row.createdAt))} tarihinde kaydoldu
        {subscription?.endsAt &&
          ` · ${subscription.active ? "erişim" : "bitiş"} ${dateFormat.format(
            new Date(subscription.endsAt)
          )}`}
      </p>
    </div>
  );
}
