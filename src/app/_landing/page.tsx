import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import Reveal from "@/components/marketing/Reveal";
import Wordmark from "@/components/Wordmark";
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

export default async function Home() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/admin" : "/login";
  const ctaLabel = user ? "Panele git" : "Hemen başla";

  return (
    <>
      <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-surface/95 px-6 backdrop-blur-sm">
        <Wordmark className="font-display text-xl font-extrabold text-ink" />
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="link-underline text-sm font-medium text-ink-muted hover:text-accent">
            Nasıl çalışır
          </a>
          <a href="#features" className="link-underline text-sm font-medium text-ink-muted hover:text-accent">
            Özellikler
          </a>
        </div>
        <div className="flex items-center gap-4">
          {!user && (
            <Link href="/login" className="hidden text-sm font-medium text-ink-muted hover:text-accent md:block">
              Giriş yap
            </Link>
          )}
          <Link href={ctaHref} className="btn btn-primary">
            {ctaLabel}
          </Link>
        </div>
      </nav>

      <main className="pt-16">
        {/* HERO */}
        <section className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center gap-16 px-6 py-16 lg:flex-row lg:gap-24 lg:py-24">
          <Reveal className="flex flex-1 flex-col gap-8">
            <span className="eyebrow text-accent">Fiziksel kiralamalar, dijitalleşti</span>
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[56px] lg:text-[64px] lg:leading-[1.05] lg:tracking-[-0.02em]">
              Her ürünü tek bir okutmayla rezervasyona açık kiralamaya dönüştürün
            </h1>
            <p className="max-w-lg text-lg text-ink-muted">
              Basılı QR kodlarıyla fiziksel ekipmanlar için basit ve pratik kiralama takibi.
            </p>
            <div className="mt-2 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Link href={ctaHref} className="btn btn-primary px-8 text-base">
                {ctaLabel}
              </Link>
              <a href="#how-it-works" className="link-underline flex items-center gap-2 text-sm font-semibold text-ink">
                Nasıl çalıştığını gör <IconArrowRight className="h-4 w-4 rotate-90" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={200} className="relative flex h-[420px] w-full flex-1 items-center justify-center sm:h-[520px]">
            <div className="absolute inset-0 rotate-3 scale-[1.03] rounded-xl border border-border bg-surface" />
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="absolute inset-0 diagonal-stripes opacity-30" />
              <div className="relative z-10 flex h-[380px] w-[220px] flex-col items-center justify-center overflow-hidden rounded-[32px] border-[6px] border-deep bg-deep shadow-2xl sm:h-[460px] sm:w-[260px]">
                <div className="scanner-container relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border-2 border-accent bg-accent/10 backdrop-blur-sm">
                  <div className="scan-line absolute left-0 top-0 h-0.5 w-full bg-accent shadow-[0_0_10px_#FF5A1F]" />
                  <IconQrCode className="h-16 w-16 text-accent opacity-70" strokeWidth={1.2} />
                </div>
                <p className="eyebrow mt-6 text-paper/70">QR kod algılandı</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="border-y border-border bg-surface py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal className="mb-16 text-center">
              <h2 className="text-3xl font-semibold text-ink lg:text-[36px]">Nasıl çalışır</h2>
              <p className="mt-4 text-ink-muted">Fiziksel ekipmandan dijital rezervasyona üç adımda.</p>
            </Reveal>

            <div className="relative flex flex-col items-start gap-12 md:flex-row md:justify-between md:gap-8">
              <div className="absolute left-[12%] right-[12%] top-12 hidden h-px border-t-2 border-dashed border-border md:block" />
              {steps.map((step, i) => (
                <Reveal
                  key={step.title}
                  delay={i * 150}
                  className="relative z-10 flex flex-1 flex-col items-center text-center"
                >
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                    <step.icon
                      className={`h-9 w-9 ${step.accent ? "text-accent" : "text-ink-muted"}`}
                    />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="max-w-[240px] text-sm text-ink-muted">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <Reveal className="mb-16">
            <h2 className="text-3xl font-semibold text-ink lg:text-[36px]">Fiziksel varlıklar için tasarlandı</h2>
            <p className="mt-4 text-ink-muted">Kiralama envanterinizi yönetmek için ihtiyacınız olan her şey.</p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="card card-hover flex h-full flex-col gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface">
                    <f.icon className="h-5 w-5 text-ink" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="text-sm text-ink-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="relative overflow-hidden bg-deep py-20">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#F2F1ED 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
            <Reveal className="flex flex-col items-center">
              <span className="text-4xl font-bold text-on-deep sm:text-5xl">
                <Counter target={1240} />
              </span>
              <span className="eyebrow mt-2 text-on-deep/60">Listelenen ürün</span>
            </Reveal>
            <Reveal delay={100} className="flex flex-col items-center">
              <span className="text-4xl font-bold text-on-deep sm:text-5xl">
                <Counter target={38600} />
              </span>
              <span className="eyebrow mt-2 text-on-deep/60">QR taraması</span>
            </Reveal>
            <Reveal delay={200} className="flex flex-col items-center">
              <span className="text-4xl font-bold text-on-deep sm:text-5xl">
                4.9<span className="text-xl text-on-deep/50">/5</span>
              </span>
              <span className="eyebrow mt-2 text-on-deep/60">Ortalama puan</span>
            </Reveal>
            <Reveal delay={300} className="flex flex-col items-center">
              <span className="text-4xl font-bold text-on-deep sm:text-5xl">
                <Counter target={92} suffix="%" />
              </span>
              <span className="eyebrow mt-2 text-on-deep/60">Onaylanma oranı</span>
            </Reveal>
          </div>
        </section>

        {/* FINAL CTA */}
        <Reveal className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center lg:py-24">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card shadow-sm">
            <IconPackage className="h-7 w-7 text-accent" />
          </div>
          <h2 className="mb-8 text-[32px] font-bold leading-tight text-ink sm:text-[48px]">
            İlk ürününüzü listelemeye hazır mısınız?
          </h2>
          <Link href={ctaHref} className="btn btn-primary px-10 text-base">
            {user ? "Panele git" : "Sahip olarak giriş yap"}
          </Link>
        </Reveal>
      </main>

      <footer className="flex flex-col items-center gap-6 border-t border-border bg-surface px-6 py-12 md:flex-row md:justify-between">
        <span className="font-display text-lg font-extrabold text-ink">RentQR</span>
        <div className="flex flex-wrap justify-center gap-6">
          <Link href={ctaHref} className="link-underline text-sm text-ink-muted hover:text-accent">
            {user ? "Panel" : "Giriş yap"}
          </Link>
          <a href="#features" className="link-underline text-sm text-ink-muted hover:text-accent">
            Ürün
          </a>
          <a href="#" className="link-underline text-sm text-ink-muted hover:text-accent">
            İletişim
          </a>
        </div>
        <span className="text-sm text-ink-muted">© {new Date().getFullYear()} RentQR</span>
      </footer>
    </>
  );
}
