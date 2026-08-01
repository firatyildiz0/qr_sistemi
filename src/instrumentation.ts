import * as Sentry from "@sentry/nextjs";

/**
 * Sunucu tarafı hata izleme.
 *
 * DSN tanımlı değilse hiçbir şey başlatılmıyor: Sentry hesabı olmadan da
 * uygulama aynen çalışsın, `npm run dev` bir kuruluma bağlı kalmasın.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",

    // Hata izleme için tam örnekleme, performans izi için düşük: hata sayısı az
    // ve her biri değerli, oysa her isteğin izini göndermek ücretsiz kotayı
    // günler içinde bitirir.
    tracesSampleRate: 0.1,

    // Müşteri verisi Sentry'ye gitmesin. Bu ayar olmadan SDK istek gövdelerini,
    // çerezleri ve IP'yi de topluyor — güvenlik için kurduğumuz araç yeni bir
    // veri sızıntısı noktası olmamalı.
    sendDefaultPii: false,

    beforeSend: scrub,
  });
}

/**
 * Sentry'ye giden olaydan çerezleri ve `Authorization` başlığını siler.
 *
 * `sendDefaultPii: false` çoğunu zaten engelliyor, ama bu ikisi oturumu ele
 * geçirmeye yeteceği için elle de temizleniyor — savunma tek bir ayara
 * bırakılmayacak kadar önemli.
 */
function scrub(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;

    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }

  return event;
}

/**
 * Sunucuda yakalanan her hatayı Sentry'ye iletir. Next bu kancayı Server
 * Component, route handler ve server action hatalarında çağırıyor.
 */
export const onRequestError = Sentry.captureRequestError;
