import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import {
  MONTHLY_PRICE_TRY,
  VAT_RATE,
  getSubscription,
  netPrice,
  statusLabel,
  type SubscriptionView,
} from "@/lib/subscription";
import { iyzicoConfig, planFor } from "@/lib/iyzico";
import { ABONELIK, SATICI } from "@/lib/yasal";
import { signOut } from "@/app/login/actions";
import { bricolage } from "@/lib/fonts";
import SiteFooter from "@/components/SiteFooter";
import VoyoLogo from "@/components/marketing/VoyoLogo";
import SubscribeForm from "./SubscribeForm";
import CancelButton from "./CancelButton";
import {
  IconArrowRight,
  IconCheck,
  IconAlertTriangle,
  IconLogOut,
} from "@/components/icons";

export const metadata = { title: "Abonelik" };

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
 *
 * Görünüşü panelden değil vitrinden (anasayfa, `/paketler`): ziyaretçi buraya
 * paket sayfasındaki "Satın al"dan geliyor, aynı sitede kalmış hissetmeli.
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
  // Aboneliği çalışan biri buraya kendi isteğiyle gelmiş olabilir — ekranı
  // görsün, ama ödeme formu yerine durumunu görsün.
  const config = iyzicoConfig();
  const configured = config !== null;
  // Test hesabı farklı bir plandan, farklı tutar öder (bkz. `planFor`);
  // ekrandaki tutar karttan çekilecek olanla aynı olsun.
  const plan = config ? planFor(config, profile.username) : null;

  // Superuser'dan ücret beklenmiyor (bkz. `can_write`), ekran ona boş görünür.
  // Test listesindeyse istisna: ödeme akışını canlıda kendi hesabıyla
  // deneyebilsin. Aldığı abonelik erişimini değiştirmiyor, zaten muaf.
  if (profile.role === "superuser" && !plan?.test) redirect("/yonetim");
  const price = plan?.priceTry ?? MONTHLY_PRICE_TRY;
  const nonce = headerList.get("x-nonce") ?? undefined;

  return (
    <div className={`vitrin ${bricolage.variable} flex min-h-screen flex-col bg-surface`}>
      <nav aria-label="Ana menü" className="border-b border-border">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="text-ink">
            <VoyoLogo />
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 text-[15px] font-semibold text-ink transition-colors hover:text-accent"
            >
              <IconLogOut className="h-4 w-4" aria-hidden />
              Çıkış
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10 max-w-2xl">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {SATICI.urun} aboneliği
          </p>
          <h1 className="vitrin-baslik mt-2 mb-0 text-[36px] font-extrabold leading-tight text-ink sm:text-[48px]">
            {subscription?.active ? "Aboneliğiniz" : "Aboneliğinizi başlatın"}
          </h1>
          {!subscription?.active && (
            <p className="mt-4 mb-0 text-lg leading-relaxed text-ink-muted">
              Fatura bilgilerinizi girin, ardından kartınızla iyzico&apos;nun güvenli
              formunda ödeyin. Ödeme onaylandığı anda panel açılır.
            </p>
          )}
        </header>

        <Outcome outcome={durum} />
        {plan?.test && (
          <p className="mb-6 rounded-2xl border border-border bg-partial-soft px-5 py-4 text-sm text-ink">
            <strong>Test hesabı.</strong> Bu hesap deneme planıyla öder: kartınızdan aylık{" "}
            {TRY.format(price)} çekilir. Diğer satıcılar {TRY.format(MONTHLY_PRICE_TRY)} öder.
          </p>
        )}
        <StatusBanner subscription={subscription} />

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <PlanCard subscription={subscription} planPrice={price} />

          <section className="rounded-[32px] border border-border bg-paper p-6 sm:p-9">
            {subscription?.active && subscription.status !== "trialing" ? (
              <ActiveState subscription={subscription} />
            ) : !configured ? (
              <SetupNotice />
            ) : (
              <>
                <h2 className="vitrin-baslik m-0 text-2xl font-extrabold text-ink">
                  Fatura bilgileri
                </h2>
                <p className="mt-2 mb-7 text-sm text-ink-muted">
                  Aylık {TRY.format(price)} tutarında tahsilat yapılır. Dilediğiniz zaman
                  iptal edebilirsiniz.
                </p>
                <SubscribeForm nonce={nonce} />
              </>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
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
      className="mb-6 flex items-start gap-2 rounded-2xl border border-danger-border bg-danger-soft px-5 py-4 text-sm text-danger"
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
      <p className="mb-6 rounded-2xl border border-border bg-accent-soft px-5 py-4 text-sm text-ink">
        Ücretsiz denemenizin <strong>{daysLeft} günü</strong> kaldı
        {accessEndsAt && ` (${DATE.format(accessEndsAt)})`}. Şimdi abone olursanız
        panele kesintisiz devam edersiniz.
      </p>
    );
  }

  if (!active) {
    return (
      <p className="mb-6 rounded-2xl border border-border bg-partial-soft px-5 py-4 text-sm text-ink">
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
function PlanCard({
  subscription,
  planPrice,
}: {
  subscription: SubscriptionView | null;
  planPrice: number;
}) {
  // Mevcut abone farklı bir tutar ödüyor olabilir (fiyat sonradan değişmişse);
  // kendi ödediğini görsün.
  const price = subscription?.priceTry ?? planPrice;

  // Anasayfadaki fiyat bölümüyle aynı koyu zemin: ziyaretçi aynı kartı
  // tanısın.
  return (
    <section className="flex flex-col rounded-[32px] bg-deep p-7 text-on-deep sm:p-9">
      <h2 className="vitrin-baslik m-0 text-2xl font-extrabold">{ABONELIK.ad}</h2>

      <p className="mt-6 mb-0 flex items-baseline gap-1.5">
        <span className="vitrin-baslik text-[48px] font-extrabold leading-none">
          {TRY.format(price)}
        </span>
        <span className="text-on-deep/70">/ ay</span>
      </p>
      <p className="mt-2 mb-0 text-sm text-on-deep/70">
        KDV dahil ({TRY.format(netPrice(price))} + %{VAT_RATE * 100} KDV)
      </p>

      <ul className="mt-7 mb-0 list-none space-y-3 p-0">
        {ABONELIK.kapsam.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-[15px]">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#ff6b61]" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-4 border-t border-border-dark pt-6">
        {/* Zemin her iki temada da koyu: logonun beyaz sürümü. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- statik SVG, optimizasyon gerekmez */}
        <img
          src="/odeme/iyzico-ile-ode-beyaz.svg"
          alt="iyzico ile Öde"
          width={210}
          height={31}
          className="h-7 w-auto self-start"
        />
        <p className="m-0 text-xs leading-relaxed text-on-deep/70">
          Abonelik her ay aynı karttan otomatik yenilenir, taahhüt yoktur. İptal ettiğinizde
          ödediğiniz dönemin sonuna kadar erişiminiz sürer.
        </p>
      </div>
    </section>
  );
}

/** Ödemesi süren abonenin gördüğü panel. */
function ActiveState({ subscription }: { subscription: SubscriptionView }) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="vitrin-baslik m-0 text-2xl font-extrabold text-ink">
        {statusLabel(subscription)}
      </h2>

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

      <Link href="/admin" className="btn btn-primary mt-7 h-13 w-full text-base">
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

/**
 * iyzico anahtarları tanımlı değilken gösterilen not. Ekran herkese açık
 * paket sayfasından gelinebiliyor; ziyaretçiye kurulum ayrıntısı değil,
 * ne yapabileceği söyleniyor.
 */
function SetupNotice() {
  return (
    <div className="text-sm text-ink">
      <h2 className="vitrin-baslik m-0 text-2xl font-extrabold">Online ödeme çok yakında</h2>
      <p className="mt-2 text-ink-muted">
        Kartla ödeme altyapımız son kontrollerden geçiyor. Bu sırada panelinizi
        kullanmaya devam edebilirsiniz; aboneliği hemen başlatmak isterseniz{" "}
        <a href={`mailto:${SATICI.eposta}`} className="link-underline font-medium text-accent">
          {SATICI.eposta}
        </a>{" "}
        adresine ya da {SATICI.telefon} numarasına ulaşın.
      </p>
      <Link href="/admin" className="btn btn-primary mt-5">
        Panele git
        <IconArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
