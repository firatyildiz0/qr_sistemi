import * as Sentry from "@sentry/nextjs";

/**
 * Tarayıcı tarafı hata izleme. Sunucu tarafıyla aynı kural: DSN yoksa hiçbir şey
 * başlatılmıyor.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1,

    // Oturum tekrarı (session replay) kapalı: ekranı kaydetmek müşteri adını,
    // telefonunu ve adresini olduğu gibi Sentry'ye taşırdı.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    sendDefaultPii: false,
  });
}

/** Sayfa geçişlerinin izi. Sentry'nin navigasyonu ölçebilmesi için gerekli. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
