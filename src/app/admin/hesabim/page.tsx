import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { basHarf } from "@/lib/hesap";
import HesapFormu from "@/components/admin/HesapFormu";
import { IconArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Hesabım · RentQR",
};

export const dynamic = "force-dynamic";

type PlanGorunumu = { ad: string; ayrinti: string; ton: "success" | "warning" | "muted" };

const TARIH = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Satıcının üyelik planı.
 *
 * Abonelik kaydı `subscriptions` tablosunda duruyor. Tablo henüz yoksa ya da
 * satıcının bir kaydı yoksa hesap ücretsiz planda sayılıyor — sorgu hatası
 * ekranı düşürmüyor, yalnızca bu satırı "Ücretsiz" gösteriyor.
 */
async function planOku(ownerId: string): Promise<PlanGorunumu> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) {
    return { ad: "Ücretsiz plan", ayrinti: "Ücretli bir plana geçmediniz.", ton: "muted" };
  }

  const bitis = (tarih: string | null) => (tarih ? TARIH.format(new Date(tarih)) : null);

  switch (data.status) {
    case "lifetime":
      return { ad: "Ömür boyu plan", ayrinti: "Süresiz erişim.", ton: "success" };
    case "trialing":
      return {
        ad: "Deneme süresi",
        ayrinti: bitis(data.trial_ends_at)
          ? `Deneme ${bitis(data.trial_ends_at)} tarihinde bitiyor.`
          : "Deneme sürüyor.",
        ton: "warning",
      };
    case "active":
      return {
        ad: "Aylık plan",
        ayrinti: bitis(data.current_period_end)
          ? `Aktif · ${bitis(data.current_period_end)} tarihinde yenilenir.`
          : "Aktif.",
        ton: "success",
      };
    case "past_due":
      return { ad: "Aylık plan", ayrinti: "Son ödeme alınamadı.", ton: "warning" };
    case "canceled":
      return {
        ad: "Aylık plan (iptal edildi)",
        ayrinti: bitis(data.current_period_end)
          ? `${bitis(data.current_period_end)} tarihine kadar kullanılabilir.`
          : "İptal edildi.",
        ton: "muted",
      };
    default:
      return { ad: "Süresi dolmuş plan", ayrinti: "Plan yenilenmedi.", ton: "muted" };
  }
}

const DURUM_ADI: Record<string, string> = {
  approved: "Onaylı",
  pending: "Onay bekliyor",
  rejected: "Reddedildi",
};

export default async function HesabimPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
  if (!user || !profile) redirect("/login");

  const plan = await planOku(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto items-center border-b border-border bg-paper px-4 py-4 sm:h-20 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Hesabım</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-8">
        <HesapFormu
          baslangic={{
            adSoyad: profile.fullName ?? "",
            sektor: profile.sector ?? "",
            avatarUrl: profile.avatarUrl,
            avatarRenk: profile.avatarColor,
          }}
          ownerId={user.id}
          harf={basHarf(profile.fullName, user.email)}
          kullaniciAdi={profile.username}
          email={user.email ?? ""}
        />

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold text-ink">Üyelik</h2>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{plan.ad}</p>
              <p className="text-sm text-ink-muted">{plan.ayrinti}</p>
            </div>
            <span className={`pill pill-${plan.ton} shrink-0`}>
              {plan.ton === "success" ? "aktif" : plan.ton === "warning" ? "dikkat" : "plan"}
            </span>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-ink">Hesap bilgileri</h2>
          <dl className="divide-y divide-border text-sm">
            <Satir etiket="Hesabı açtığınız e-posta" deger={user.email ?? "—"} />
            <Satir etiket="Kullanıcı adı" deger={`@${profile.username}`} />
            <Satir etiket="Üyelik tarihi" deger={TARIH.format(new Date(profile.createdAt))} />
            <Satir etiket="Hesap durumu" deger={DURUM_ADI[profile.status] ?? profile.status} />
            <Satir etiket="Hesap türü" deger={profile.role === "superuser" ? "Yönetici" : "Satıcı"} />
          </dl>
        </section>

        <Link
          href="/admin/settings"
          className="card card-hover flex items-center justify-between p-5 text-sm font-semibold text-ink"
        >
          Görünüm ve tercih ayarları
          <IconArrowRight className="h-4 w-4 text-ink-muted" />
        </Link>
      </div>
    </div>
  );
}

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-ink-muted">{etiket}</dt>
      <dd className="break-all font-medium text-ink sm:text-right">{deger}</dd>
    </div>
  );
}
