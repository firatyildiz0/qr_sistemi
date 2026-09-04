import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, homePathFor } from "@/lib/profile";
import Reveal from "@/components/marketing/Reveal";
import Logo from "@/components/Logo";
import Counter from "@/components/marketing/Counter";
import {
  IconArrowRight,
  IconBell,
  IconBolt,
  IconCalendar,
  IconGrid,
  IconPackage,
  IconQrCode,
  IconScan,
} from "@/components/icons";

const steps = [
  {
    icon: IconPackage,
    title: "1. Ürününüzü ekleyin",
    body: "Fiziksel ürününüzü ayrıntılar ve fiyatlandırma ile sisteme kaydedin.",
  },
  {
    icon: IconQrCode,
    title: "2. QR kod alın",
    body: "Benzersiz etiketi yazdırın ve fiziksel ekipmanınıza yapıştırın.",
    accent: true,
  },
  {
    icon: IconCalendar,
    title: "3. Rezervasyon alın",
    body: "Kiracılar kodu okutarak anında müsaitliği görür ve rezervasyon yapar.",
  },
];

const features = [
  {
    icon: IconBolt,
    title: "Anında QR oluşturma",
    body: "Yeni bir ürün eklediğiniz anda baskıya hazır QR kodları otomatik olarak oluşturulur.",
  },
  {
    icon: IconCalendar,
    title: "Canlı müsaitlik takvimi",
    body: "Gerçek zamanlı senkronizasyon çakışan rezervasyonları önler ve kiracılara ekipmanın ne zaman müsait olduğunu gösterir.",
  },
  {
    icon: IconBell,
    title: "Rezervasyon bildirimleri",
    body: "Yeni talepler, değişiklikler ve tamamlanan kiralamalar için anında uyarı alın.",
  },
  {
    icon: IconScan,
    title: "Uygulama gerekmez",
    body: "Kiracılar varsayılan mobil tarayıcıları üzerinden doğrudan okutup rezervasyon yapabilir.",
  },
  {
    icon: IconGrid,
    title: "Güvenli sahip paneli",
    body: "Envanteri yönetin, rezervasyonları takip edin ve kiracı geçmişini tek bir yerden inceleyin.",
  },
  {
    icon: IconPackage,
    title: "Her ürün için çalışır",
    body: "Bisikletten kamera ekipmanına — üzerine kod yapıştırabildiğiniz her şeyi kiralayabilirsiniz.",
  },
];

/**
 * Sitenin anasayfası. Onaylı bir hesapla girilmişse burada oyalanmanın anlamı
 * yok — tanıtım yazısı zaten o hesabın kullandığı ürünü anlatıyor — o yüzden
 * doğrudan rolüne ait panele iniliyor. Tanıtım sayfası ziyaretçiye, bir de
 * hesabı henüz onay bekleyen kullanıcıya kalıyor.
 */
export default async function Home() {
  const profile = await getProfile();
  if (profile && profile.status === "approved") redirect(homePathFor(profile));

  const user = await getCurrentUser();
  const ctaHref = user ? "/admin" : "/login";
  const ctaLabel = user ? "Panele git" : "Hemen başla";

  return (
    <>
      {/* Gezinme çubuğu ekranın kenarına yapışmıyor, üstünde yüzüyor: Sedef'te
          her yüzey zeminden gölgeyle ayrılan bir katman, bu da öyle. Zemini
          buzlu cam olduğu için altından geçen içerik silinmiyor, bulanıklaşıyor. */}
      <nav className="fixed inset-x-3 top-3 z-50 mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-border bg-[color-mix(in_oklab,var(--color-card)_80%,transparent)] px-4 shadow-[var(--app-lift)] backdrop-blur-xl backdrop-saturate-150 sm:px-6">
        <Link href="/" className="tab-press flex items-center gap-2.5">
          <Logo className="h-9 w-9" sizes="36px" />
          <span className="text-[15px] font-extrabold tracking-tight text-ink">RentQR</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <a
            href="#how-it-works"
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            Nasıl çalışır
          </a>
          <a
            href="#features"
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            Özellikler
          </a>
        </div>

        <div className="flex items-center gap-2">
          {!user && (
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover md:block"
            >
              Giriş yap
            </Link>
          )}
          {/* Telefonda alt eylem çubuğu zaten aynı düğmeyi taşıyor; iki kez
              göstermek yerine üstteki dar ekranda gizleniyor. */}
          <Link href={ctaHref} className="btn btn-primary hidden h-11 min-h-0 sm:inline-flex">
            {ctaLabel}
          </Link>
        </div>
      </nav>

      {/* Alt boşluk telefondaki sabit eylem çubuğu için: sayfanın son satırı
          onun arkasında kalmasın. */}
      <main className="pt-24 pb-24 sm:pb-0">
        {/* HERO */}
        <section className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 py-12 lg:flex-row lg:gap-20 lg:py-20">
          <Reveal className="flex flex-1 flex-col gap-7">
            <span className="eyebrow w-fit rounded-full bg-accent-soft px-3 py-1.5 text-accent-strong">
              Fiziksel kiralamalar, dijitalleşti
            </span>
            <h1 className="text-[40px] font-extrabold leading-[1.04] tracking-[-0.025em] text-balance text-ink sm:text-[56px] lg:text-[64px]">
              Her ürünü tek bir okutmayla rezervasyona açık kiralamaya dönüştürün
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-ink-muted">
              Basılı QR kodlarıyla fiziksel ekipmanlar için basit ve pratik kiralama takibi.
            </p>
            <div className="mt-1 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Link href={ctaHref} className="btn btn-primary h-14 px-8 text-base">
                {ctaLabel}
              </Link>
              <a
                href="#how-it-works"
                className="btn btn-secondary h-14 px-6 text-base"
              >
                Nasıl çalıştığını gör
                <IconArrowRight className="h-4 w-4 rotate-90" />
              </a>
            </div>
          </Reveal>

          {/* Kahraman görsel: ürünün kendisi. Müşterinin eline aldığı telefonda
              etiketi okuttuğu an — panelin gerçek yüzeyleriyle, aynı yuvarlak
              hatlar ve aynı buzlu cam sekme çubuğuyla çiziliyor. */}
          <Reveal delay={200} className="flex w-full flex-1 items-center justify-center">
            <div className="relative w-full max-w-[420px]">
              <div className="absolute -inset-6 rounded-[48px] bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-accent-soft),transparent_70%)]" />

              <div className="relative mx-auto w-[264px] rounded-[46px] bg-card p-3 shadow-[0_40px_80px_-40px_var(--app-shadow),0_0_0_1px_var(--color-border)] sm:w-[288px]">
                <div className="flex h-[520px] flex-col overflow-hidden rounded-[36px] bg-paper sm:h-[560px]">
                  <div className="flex items-center justify-between px-6 pb-2 pt-4 text-[11px] font-bold text-ink">
                    <span>09:41</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-ink/60" />
                      <span className="h-1 w-1 rounded-full bg-ink/60" />
                      <span className="h-1 w-1 rounded-full bg-ink/60" />
                    </span>
                  </div>

                  <div className="px-5 pb-3 pt-1">
                    <p className="text-[22px] font-extrabold tracking-tight text-ink">Tara</p>
                  </div>

                  <div className="mx-5 flex flex-1 flex-col gap-3">
                    <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[26px] bg-deep">
                      <div className="absolute inset-0 diagonal-stripes opacity-20" />
                      <div className="relative flex h-36 w-36 items-center justify-center rounded-[22px] border-2 border-accent bg-accent/10">
                        <div className="scan-line absolute left-0 top-0 h-0.5 w-full bg-accent shadow-[0_0_12px_var(--color-accent)]" />
                        <IconQrCode className="h-14 w-14 text-accent opacity-80" strokeWidth={1.2} />
                      </div>
                      <p className="eyebrow absolute bottom-4 text-on-deep/70">QR kod algılandı</p>
                    </div>

                    <div className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-[var(--app-lift)]">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
                        <IconPackage className="h-5 w-5 text-accent" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-bold text-ink">Sony A7 III gövde</span>
                        <span className="truncate text-xs text-ink-muted">12–16 Eylül · müsait</span>
                      </span>
                    </div>
                  </div>

                  {/* Sekme çubuğu: paneldekinin aynısı — buzlu cam, ortada
                      yükseltilmiş okutma düğmesi. */}
                  <div className="mt-3 flex items-end justify-around border-t border-border/70 bg-[color-mix(in_oklab,var(--color-card)_82%,transparent)] px-4 pb-5 pt-2 backdrop-blur-xl">
                    <span className="h-1.5 w-6 rounded-full bg-ink-muted/30" />
                    <span className="h-1.5 w-6 rounded-full bg-ink-muted/30" />
                    <span className="tab-fab -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white">
                      <IconScan className="h-6 w-6" />
                    </span>
                    <span className="h-1.5 w-6 rounded-full bg-ink-muted/30" />
                    <span className="h-1.5 w-6 rounded-full bg-accent" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="px-3 py-10 lg:py-16">
          <div className="mx-auto max-w-7xl rounded-[40px] bg-surface px-6 py-16 lg:px-12 lg:py-20">
            <Reveal className="mb-14 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-ink lg:text-[38px]">
                Nasıl çalışır
              </h2>
              <p className="mt-4 text-ink-muted">
                Fiziksel ekipmandan dijital rezervasyona üç adımda.
              </p>
            </Reveal>

            <div className="relative flex flex-col items-start gap-12 md:flex-row md:justify-between md:gap-8">
              <div className="absolute left-[16%] right-[16%] top-12 hidden h-0.5 rounded-full bg-border md:block" />
              {steps.map((step, i) => (
                <Reveal
                  key={step.title}
                  delay={i * 150}
                  className="relative z-10 flex flex-1 flex-col items-center text-center"
                >
                  <div
                    className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full shadow-[var(--app-lift)] ${
                      step.accent ? "bg-accent text-white" : "bg-card text-ink-muted"
                    }`}
                  >
                    <step.icon className="h-9 w-9" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="max-w-[240px] text-sm leading-relaxed text-ink-muted">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
          <Reveal className="mb-12">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-balance text-ink lg:text-[38px]">
              Fiziksel varlıklar için tasarlandı
            </h2>
            <p className="mt-4 text-ink-muted">
              Kiralama envanterinizi yönetmek için ihtiyacınız olan her şey.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="card card-hover group flex h-full flex-col gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-ink">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="px-3 py-10 lg:py-16">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-deep py-16">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(var(--color-on-deep) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
              <Reveal className="flex flex-col items-center">
                <span className="text-4xl font-extrabold tracking-tight text-on-deep sm:text-5xl">
                  <Counter target={1240} />
                </span>
                <span className="eyebrow mt-2 text-on-deep/60">Listelenen ürün</span>
              </Reveal>
              <Reveal delay={100} className="flex flex-col items-center">
                <span className="text-4xl font-extrabold tracking-tight text-on-deep sm:text-5xl">
                  <Counter target={38600} />
                </span>
                <span className="eyebrow mt-2 text-on-deep/60">QR taraması</span>
              </Reveal>
              <Reveal delay={200} className="flex flex-col items-center">
                <span className="text-4xl font-extrabold tracking-tight text-on-deep sm:text-5xl">
                  4.9<span className="text-xl text-on-deep/50">/5</span>
                </span>
                <span className="eyebrow mt-2 text-on-deep/60">Ortalama puan</span>
              </Reveal>
              <Reveal delay={300} className="flex flex-col items-center">
                <span className="text-4xl font-extrabold tracking-tight text-on-deep sm:text-5xl">
                  <Counter target={92} suffix="%" />
                </span>
                <span className="eyebrow mt-2 text-on-deep/60">Onaylanma oranı</span>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-6 py-12 lg:py-20">
          <Reveal className="mx-auto flex max-w-3xl flex-col items-center rounded-[40px] bg-card px-6 py-14 text-center shadow-[var(--app-lift)]">
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft">
              <IconPackage className="h-7 w-7 text-accent" />
            </div>
            <h2 className="mb-7 text-[32px] font-extrabold leading-tight tracking-tight text-balance text-ink sm:text-[44px]">
              İlk ürününüzü listelemeye hazır mısınız?
            </h2>
            <Link href={ctaHref} className="btn btn-primary h-14 px-10 text-base">
              {user ? "Panele git" : "Sahip olarak giriş yap"}
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-6 border-t border-border px-6 py-12 md:flex-row md:justify-between">
        <span className="text-lg font-extrabold tracking-tight text-ink">RentQR</span>
        <div className="flex flex-wrap justify-center gap-1">
          <Link
            href={ctaHref}
            className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            {user ? "Panel" : "Giriş yap"}
          </Link>
          <a
            href="#features"
            className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            Ürün
          </a>
          <a
            href="#"
            className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            İletişim
          </a>
        </div>
        <span className="text-sm text-ink-muted">© {new Date().getFullYear()} RentQR</span>
      </footer>

      {/* Telefonda sayfanın altına sabitlenen eylem çubuğu: bir uygulamanın
          birincil düğmesi gibi her zaman parmağın altında duruyor, kullanıcının
          en başa dönmesi gerekmiyor. Masaüstünde gizli — orada aynı düğme üst
          çubukta zaten duruyor. */}
      <div className="tab-bar safe-b fixed inset-x-0 bottom-0 z-50 px-4 pt-3 sm:hidden">
        <Link href={ctaHref} className="btn btn-primary h-13 w-full text-base">
          {ctaLabel}
        </Link>
      </div>
    </>
  );
}
