import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import {
  MONTHLY_PRICE_TRY,
  TRIAL_DAYS,
  VAT_RATE,
  getSubscription,
  netPrice,
  statusLabel,
  type SubscriptionView,
} from "@/lib/subscription";
import { iyzicoConfig } from "@/lib/iyzico";
import { signOut } from "@/app/login/actions";
import SubscribeForm from "./SubscribeForm";
import CancelButton from "./CancelButton";
import {
  IconArrowRight,
  IconCheckCircle,
  IconAlertTriangle,
  IconLogOut,
} from "@/components/icons";

export const metadata = { title: "Abonelik" };

const FEATURES = [
  "Sınırsız ürün ve QR etiketi",
  "Rezervasyon takvimi ve stok takibi",
  "Müşteri kayıtları ve teslimat planı",
  "Teslim ve iade hatırlatmaları",
  "İstatistik ekranı",
];

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

/**
 * Ödeme / abonelik ekranı.
 *
 * `/admin` altında **değil**, bilinçli olarak: panelin layout'undaki
 * `AccessGuard` abonesi olmayanı buraya yolluyor, bu sayfa da orada olsaydı
 * yönlendirme kendi kendine düşen bir döngüye girerdi. Ayrıca burada kenar
 * çubuğu ve sekmeler görünmüyor — ekranın tek bir işi var.
 */
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ durum }, profile, subscription, headerList] = await Promise.all([
    searchParams,
    getProfile(),
    getSubscription(),
    headers(),
  ]);

  // Onaysız hesabın burada işi yok: abonelik onaydan sonra başlıyor.
  if (!profile || profile.status !== "approved") redirect("/login");
  // Superuser'dan ücret beklenmiyor (bkz. `can_write`), ekran ona boş görünür.
  if (profile.role === "superuser") redirect("/yonetim");

  // Aboneliği çalışan biri buraya kendi isteğiyle gelmiş olabilir — ekranı
  // görsün, ama ödeme formu yerine durumunu görsün.
  const configured = iyzicoConfig() !== null;
  const nonce = headerList.get("x-nonce") ?? undefined;

  return (
    <main className="min-h-screen bg-surface px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              RentQR Premium
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {subscription?.active ? "Aboneliğiniz" : "Paneli açmak için abone olun"}
            </h1>
          </div>

          <form action={signOut}>
            <button type="submit" className="btn btn-secondary">
              <IconLogOut className="h-4 w-4" aria-hidden />
              Çıkış
            </button>
          </form>
        </header>

        <Outcome outcome={durum} />
        <StatusBanner subscription={subscription} />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <PlanCard subscription={subscription} />

          <section className="rounded-[--radius-lg] border border-border bg-paper p-5 sm:p-6">
            {subscription?.active && subscription.status !== "trialing" ? (
              <ActiveState subscription={subscription} />
            ) : !configured ? (
              <SetupNotice />
            ) : (
              <>
                <h2 className="text-lg font-semibold text-ink">Fatura bilgileri</h2>
                <p className="mb-5 mt-1 text-sm text-ink-muted">
                  Aylık {TRY.format(MONTHLY_PRICE_TRY)} tutarında tahsilat yapılır.
                  Dilediğiniz zaman iptal edebilirsiniz.
                </p>
                <SubscribeForm nonce={nonce} />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/** Ödeme dönüşündeki sonuç şeridi (`/abonelik/tamamlandi` buraya yönlendiriyor). */
function Outcome({ outcome }: { outcome?: string }) {
  if (outcome !== "hata" && outcome !== "beklemede") return null;

  const message =
    outcome === "beklemede"
      ? "Ödeme tamamlanamadı — kartınızdan tahsilat yapılamadı. Farklı bir kartla tekrar deneyebilirsiniz."
      : "Ödeme yarıda kaldı. Tekrar denemek için aşağıdaki formu doldurun.";

  return (
    <p
      role="alert"
      className="mb-6 flex items-start gap-2 rounded-[--radius-md] border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** Denemesi süren ya da bitmiş kullanıcıya durumunu söyleyen şerit. */
function StatusBanner({ subscription }: { subscription: SubscriptionView | null }) {
  if (!subscription) return null;

  const { status, active, daysLeft, accessEndsAt, lastFailureReason } = subscription;

  if (status === "trialing" && active) {
    return (
      <p className="mb-6 rounded-[--radius-md] border border-border bg-accent-soft px-4 py-3 text-sm text-ink">
        Ücretsiz denemenizin <strong>{daysLeft} günü</strong> kaldı
        {accessEndsAt && ` (${DATE.format(accessEndsAt)})`}. Şimdi abone olursanız
        panele kesintisiz devam edersiniz.
      </p>
    );
  }

  if (!active) {
    return (
      <p className="mb-6 rounded-[--radius-md] border border-border bg-partial-soft px-4 py-3 text-sm text-ink">
        {status === "trialing"
          ? "Ücretsiz deneme süreniz doldu."
          : `${statusLabel(subscription)}.`}{" "}
        Verileriniz yerinde duruyor — abone olduğunuz an kaldığınız yerden devam
        edersiniz.
        {lastFailureReason && (
          <span className="mt-1 block text-xs text-ink-muted">{lastFailureReason}</span>
        )}
      </p>
    );
  }

  return null;
}

/** Fiyat ve kapsam. */
function PlanCard({ subscription }: { subscription: SubscriptionView | null }) {
  // Mevcut abone farklı bir tutar ödüyor olabilir (fiyat sonradan değişmişse);
  // kendi ödediğini görsün.
  const price = subscription?.priceTry ?? MONTHLY_PRICE_TRY;

  return (
    <section className="rounded-[--radius-lg] border border-border bg-paper p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Aylık plan</h2>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-ink">
          {TRY.format(price)}
        </span>
        <span className="text-sm text-ink-muted">/ ay</span>
      </p>

      <p className="mt-1 text-xs text-ink-muted">
        KDV dahil ({TRY.format(netPrice(price))} + %{VAT_RATE * 100} KDV)
      </p>

      <ul className="mt-5 space-y-2.5">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-ink">
            <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-border pt-4 text-xs text-ink-muted">
        Yeni hesaplar kart bilgisi vermeden {TRIAL_DAYS} gün ücretsiz deniyor.
        Abonelik aylık yenilenir, taahhüt yoktur; iptal ettiğinizde ödediğiniz
        dönemin sonuna kadar erişiminiz sürer.
      </p>
    </section>
  );
}

/** Ödemesi süren abonenin gördüğü panel. */
function ActiveState({ subscription }: { subscription: SubscriptionView }) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-ink">{statusLabel(subscription)}</h2>

      <dl className="mt-4 space-y-3 text-sm">
        {subscription.currentPeriodEnd && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">
              {subscription.status === "canceled" ? "Erişim bitişi" : "Sonraki yenileme"}
            </dt>
            <dd className="font-medium text-ink">
              {DATE.format(subscription.currentPeriodEnd)}
            </dd>
          </div>
        )}

        {subscription.priceTry !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Aylık tutar</dt>
            <dd className="font-medium text-ink">{TRY.format(subscription.priceTry)}</dd>
          </div>
        )}
      </dl>

      <Link href="/admin" className="btn btn-primary mt-6 w-full">
        Panele git
        <IconArrowRight className="h-4 w-4" aria-hidden />
      </Link>

      {subscription.status !== "canceled" && subscription.iyzicoSubscriptionRef && (
        <div className="mt-auto pt-6">
          <CancelButton periodEnd={subscription.currentPeriodEnd?.toISOString() ?? null} />
        </div>
      )}
    </div>
  );
}

/** iyzico anahtarları tanımlı değilken gösterilen kurulum notu. */
function SetupNotice() {
  return (
    <div className="text-sm text-ink">
      <h2 className="text-lg font-semibold">Ödeme altyapısı henüz bağlanmadı</h2>
      <p className="mt-2 text-ink-muted">
        Abonelik alınabilmesi için iyzico anahtarlarının tanımlanması gerekiyor.
        Kurulum tamamlanana kadar erişim için bizimle iletişime geçin.
      </p>
      <p className="mt-3 text-xs text-ink-muted">
        Yapılandırılacak değişkenler: <code>IYZICO_API_KEY</code>,{" "}
        <code>IYZICO_SECRET_KEY</code>, <code>IYZICO_MERCHANT_ID</code>,{" "}
        <code>IYZICO_PRICING_PLAN_REF</code>.
      </p>
    </div>
  );
}
