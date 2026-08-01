import { cookies } from "next/headers";
import { getProfile } from "@/lib/profile";
import { getUsage, planOf, PLANS, PLAN_COOKIE } from "@/lib/usage";
import UsageDials from "@/components/yonetim/UsageDials";
import { setPlan } from "./actions";

export default async function KullanimPage() {
  // Yetki önce: panelin geri kalanındaki düzenin aynısı. Sayfayı boş bırakmak
  // yeterli, layout'taki AccessGuard kullanıcıyı yönlendiriyor.
  const [me, cookieStore] = await Promise.all([getProfile(), cookies()]);
  if (me?.role !== "superuser" || me.status !== "approved") return null;

  const plan = planOf(cookieStore.get(PLAN_COOKIE)?.value);
  const usage = await getUsage();

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Supabase kullanımı</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Projenin kapasitesinin ne kadarı dolu. Sayılar Supabase&apos;in kendi
        ölçümünden geliyor; sayfayı her açışınız taze bir ölçüm.
      </p>

      {/* Yüzdelerin bölenini plan belirliyor; ölçülen değerler değişmiyor. Bir
          çereze yazılıp sunucuda okunuyor, o yüzden üç bağlantı yerine üç
          küçük form. */}
      <nav aria-label="Plan" className="mt-6 inline-flex gap-1 rounded-md border border-border bg-card p-1">
        {PLANS.map((p) => {
          const selected = p.key === plan.key;
          return (
            <form key={p.key} action={setPlan.bind(null, p.key)}>
              <button
                type="submit"
                aria-current={selected ? "true" : undefined}
                className={`rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            </form>
          );
        })}
      </nav>

      <UsageDials initial={usage} plan={plan} />
    </>
  );
}
