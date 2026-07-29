import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, type ProfileRole, type ProfileStatus } from "@/lib/profile";
import UserActions from "@/components/yonetim/UserActions";
import { IconUsers } from "@/components/icons";

type Row = {
  id: string;
  username: string;
  role: ProfileRole;
  status: ProfileStatus;
  createdAt: string;
  email: string | null;
};

const STATUS_LABEL: Record<ProfileStatus, { text: string; pill: string }> = {
  pending: { text: "Onay bekliyor", pill: "pill-warning" },
  approved: { text: "Onaylı", pill: "pill-success" },
  rejected: { text: "Reddedildi", pill: "pill-danger" },
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

async function loadUsers(): Promise<Row[]> {
  const supabase = await createClient();

  // RLS: superuser bütün profilleri görür (profiles_select_superuser).
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, role, status, created_at")
    .order("created_at", { ascending: false });

  if (!profiles?.length) return [];

  // E-posta `auth.users` içinde ve oraya anon anahtarla erişilemiyor; listeyi
  // service role ile alıp id üzerinden eşleştiriyoruz.
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emails = new Map(users?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    role: p.role as ProfileRole,
    status: p.status as ProfileStatus,
    createdAt: p.created_at,
    email: emails.get(p.id) ?? null,
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
      </p>

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

function UserSummary({ row }: { row: Row }) {
  const status = STATUS_LABEL[row.status];

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{row.username}</span>
        <span className={`pill ${status.pill}`}>{status.text}</span>
        {row.role === "superuser" && <span className="pill pill-accent">Yönetici</span>}
      </div>
      <p className="mt-1 truncate text-sm text-ink-muted">{row.email ?? "e-posta yok"}</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        {dateFormat.format(new Date(row.createdAt))} tarihinde kaydoldu
      </p>
    </div>
  );
}
