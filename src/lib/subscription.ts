import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Abonelik durumu — panelin kapısı buna bakıyor.
 *
 * Erişim ölçütü veritabanındaki `has_subscription()` ile birebir aynı
 * (bkz. 0025). Aynı kural iki yerde duruyor çünkü iki farklı işi yapıyorlar:
 * buradaki kullanıcıyı doğru ekrana yönlendiriyor ve ona kaç günü kaldığını
 * söylüyor, oradaki ise veriyi koruyor. Arayüz atlatılsa bile yazma yine
 * RLS'te duruyor; bu dosyayı kimse zorlayamaz, yalnızca yanlış ekran görür.
 */

/** Aylık ücret, TL, KDV dahil. Kullanıcının kartından çekilen tutar. */
export const MONTHLY_PRICE_TRY = 999;

/** Kartsız deneme süresi. 0025'teki tetikleyicideki `interval` ile aynı olmalı. */
export const TRIAL_DAYS = 14;

/** Faturada gösterilen KDV oranı. Fiyat KDV *dahil* olduğu için içinden ayrılıyor. */
export const VAT_RATE = 0.2;

/** KDV hariç matrah — abonelik ekranındaki fiyat dökümü için. */
export function netPrice(gross: number = MONTHLY_PRICE_TRY): number {
  return gross / (1 + VAT_RATE);
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "lifetime";

export type Subscription = {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  priceTry: number | null;
  iyzicoSubscriptionRef: string | null;
  lastFailureReason: string | null;
};

export type SubscriptionView = Subscription & {
  /** Panele girebilir mi. `has_subscription()` ile aynı hesap. */
  active: boolean;
  /** Erişimin bittiği an — deneme ya da ödenmiş dönem, hangisi geçerliyse. */
  accessEndsAt: Date | null;
  /** Bugünden itibaren kalan tam gün. Bitmişse 0. */
  daysLeft: number;
  /** Hiç ödeme yapılmamış, deneme sürüyor. Ekran farklı bir dil kullanıyor. */
  onTrial: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Erişimin dayandığı tarih. `lifetime` için tarih yok — süresiz.
 *
 * `canceled` ve `past_due` de `current_period_end`'e bakıyor: ikisinde de o
 * dönemin parası alınmış, günleri kullanıcının hakkı.
 */
function accessEnd(sub: Subscription): Date | null {
  if (sub.status === "lifetime") return null;
  if (sub.status === "trialing") return sub.trialEndsAt;
  if (sub.status === "expired") return null;
  return sub.currentPeriodEnd;
}

function describe(sub: Subscription): SubscriptionView {
  const endsAt = accessEnd(sub);
  const now = Date.now();

  const active =
    sub.status === "lifetime" || (endsAt !== null && endsAt.getTime() > now);

  return {
    ...sub,
    active,
    accessEndsAt: endsAt,
    // `ceil`: bugün bitiyorsa "0 gün" değil "1 gün" kalmış sayılıyor —
    // kullanıcı için gün hâlâ kullanılabilir durumda.
    daysLeft: endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now) / DAY_MS)) : 0,
    onTrial: sub.status === "trialing",
  };
}

/**
 * Oturumu açık kullanıcının aboneliği.
 *
 * `cache()` ile sarılı — `getProfile` ile aynı gerekçe: kapı kontrolü, ödeme
 * ekranı ve kenar çubuğundaki uyarı şeridi aynı isteği paylaşıyor.
 *
 * Satır yoksa `null`: henüz onaylanmamış hesap (tetikleyici onayla birlikte
 * yazıyor) ya da 0025 çalıştırılmamış bir veritabanı. İkisinde de erişim yok.
 */
export const getSubscription = cache(async (): Promise<SubscriptionView | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "status, trial_ends_at, current_period_end, price_try, iyzico_subscription_ref, last_failure_reason"
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return describe({
    status: data.status as SubscriptionStatus,
    trialEndsAt: parseDate(data.trial_ends_at),
    currentPeriodEnd: parseDate(data.current_period_end),
    priceTry: data.price_try === null ? null : Number(data.price_try),
    iyzicoSubscriptionRef: data.iyzico_subscription_ref,
    lastFailureReason: data.last_failure_reason,
  });
});

/**
 * Panelde gösterilecek kısa durum cümlesi. Kenar çubuğundaki şerit ve
 * `/yonetim` listesi aynı dili kullansın diye tek yerde.
 */
export function statusLabel(sub: SubscriptionView): string {
  switch (sub.status) {
    case "lifetime":
      return "Ücretsiz erişim";
    case "trialing":
      return sub.active ? `Deneme — ${sub.daysLeft} gün kaldı` : "Deneme bitti";
    case "active":
      // Durum 'active' olduğu halde dönem geçmiş olabilir: yenileme webhook'u
      // henüz gelmemiş demek. Erişim zaten kapanmışken "sürüyor" demek
      // yanıltıcı olurdu.
      return sub.active ? "Aboneliğiniz sürüyor" : "Ödeme dönemi doldu";
    case "past_due":
      return sub.active ? "Ödeme alınamadı" : "Ödeme alınamadı — erişim durdu";
    case "canceled":
      return sub.active ? `İptal edildi — ${sub.daysLeft} gün kaldı` : "Abonelik sona erdi";
    case "expired":
      return "Abonelik sona erdi";
  }
}
