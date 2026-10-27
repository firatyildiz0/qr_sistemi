"use client";

import type { ReactNode } from "react";
import { addDays, formatDateRange, nightsBetween, type DateSpan } from "@/lib/bookings";
import {
  DELIVERY_MODES,
  DELIVERY_MODE_HINT,
  DELIVERY_MODE_LABEL,
  deliveryModeForCity,
  MAX_TURNAROUND_DAYS,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";
import {
  IconAlertTriangle,
  IconMinus,
  IconPlus,
  IconTruck,
  IconUndo,
} from "@/components/icons";

const day = (date: string) => formatDateRange(date, date);

/**
 * Rezervasyonun ürünü kaç gün meşgul edeceğini satıcıya kaydetmeden önce
 * gösterir, çünkü takvimdeki kapalı günlerin sebebi başka türlü görünmüyor:
 * kiralama 5–6 Ağustos'ken ürün 2'sinde çıkıp 9'unda dönüyor.
 *
 * Teslimat şekli ilden türetilir ama burada değiştirilebilir — İstanbul'dan
 * gelip ürünü elden alan müşteri de var. Değiştirmek bloke aralığı anında
 * yeniden hesaplar.
 *
 * Tarihler de elle girilebilir: ayarlardaki süreler ortalamayı anlatır, tek
 * bir rezervasyon onlara uymayabilir (kargo bayrama denk gelir, müşteri ürünü
 * bir gün erken getirir). Elle girilen tarihler o rezervasyona özeldir,
 * ayarları değiştirmez; "Otomatiğe dön" hesaplanan aralığa geri alır.
 */
export default function DeliveryPlan({
  city,
  mode,
  onModeChange,
  rental,
  blocked,
  manual,
  onBlockedChange,
  error,
  turnaround,
  shipsLate,
}: {
  city: string;
  mode: DeliveryMode;
  onModeChange: (mode: DeliveryMode) => void;
  /** Seçili kiralama aralığı; tarih seçilmemişse null. */
  rental: DateSpan | null;
  /** Yürürlükteki meşguliyet aralığı — elle girilmişse o, değilse hesaplanan. */
  blocked: DateSpan | null;
  /** Aralık elle mi belirlendi. */
  manual: boolean;
  /** Yeni aralık, ya da hesaplanana dönmek için null. */
  onBlockedChange: (span: DateSpan | null) => void;
  /** Elle girilen aralığın hatası; geçerliyse null. */
  error: string | null;
  turnaround: Turnaround;
  /** Gidiş kargosunun çıkması gereken gün bugün ya da geçmişte mi. */
  shipsLate: boolean;
}) {
  const automatic = deliveryModeForCity(city);
  const overridden = Boolean(city) && mode !== automatic;

  /**
   * Tarihler gün gün kaydırılıyor, takvim açtırmak yerine: satıcının burada
   * yaptığı düzeltme neredeyse her zaman "bir gün önce çıksın" ya da "iki gün
   * geç dönecek" oluyor. Sınırlar da adımlayıcının kendisinde — kiralama
   * günlerinin içine taşan ya da 60 günü aşan bir tarih hiç seçilemiyor.
   */
  function shift(edge: "start_date" | "end_date", days: number) {
    if (!blocked) return;
    onBlockedChange({ ...blocked, [edge]: addDays(blocked[edge], days) });
  }

  // Meşguliyetin kiralama günlerinden önceye ve sonraya taşan gün sayısı; hem
  // satır açıklamalarını hem adımlayıcıların sınırlarını bunlar belirliyor.
  const head = rental && blocked ? nightsBetween(blocked.start_date, rental.start_date) : 0;
  const tail = rental && blocked ? nightsBetween(rental.end_date, blocked.end_date) : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="field-label mb-2 flex items-center gap-1.5">
        <IconTruck className="h-4 w-4" />
        Teslimat şekli
      </p>

      {/* Telefonda iki seçenek ekranı eşit bölüyor: sarılan iki küçük etiket
          hem zor basılıyor hem de hangisinin seçili olduğu bir bakışta
          anlaşılmıyordu. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {DELIVERY_MODES.map((option) => (
          <label
            key={option}
            className={`relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors sm:min-h-0 sm:justify-start ${
              mode === option
                ? "border-accent bg-accent-soft font-semibold text-accent-strong"
                : "border-border bg-card text-ink-muted hover:border-border-strong"
            }`}
          >
            <input
              type="radio"
              name="delivery_mode"
              value={option}
              checked={mode === option}
              onChange={() => onModeChange(option)}
              className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
            />
            {DELIVERY_MODE_LABEL[option]}
          </label>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {city ? DELIVERY_MODE_HINT[mode] : "Teslimat şekli seçilen ile göre belirlenir."}
        {overridden && (
          <span className="text-ink">
            {" "}
            {city} için varsayılan {DELIVERY_MODE_LABEL[automatic].toLowerCase()}, elle
            değiştirdiniz.
          </span>
        )}
      </p>

      {rental && blocked && (
        <>
          <input type="hidden" name="blocked_start" value={blocked.start_date} />
          <input type="hidden" name="blocked_end" value={blocked.end_date} />

          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-ink-muted">
                {manual
                  ? "Tarihleri elle ayarladınız."
                  : "Tarihler teslimat süresine göre hesaplandı."}
              </span>
              {manual && (
                <button
                  type="button"
                  onClick={() => onBlockedChange(null)}
                  className="-my-1 flex min-h-9 shrink-0 items-center gap-1 rounded px-2 py-1 font-medium text-accent-strong transition-colors hover:bg-accent-soft"
                >
                  <IconUndo className="h-3.5 w-3.5" />
                  Otomatiğe dön
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <DateStepper
                label="Ürün elinizden çıkar"
                value={blocked.start_date}
                hint={offsetLabel(head, "kiralamanın ilk günü", "kiralamadan % gün önce")}
                canDecrease={head < MAX_TURNAROUND_DAYS}
                // Kiralamanın ilk gününde ürün müşteride olmak zorunda, o yüzden
                // çıkış tarihi oradan ileri gidemez.
                canIncrease={head > 0}
                onShift={(days) => shift("start_date", days)}
              />
              <DateStepper
                label="Ürün tekrar hazır olur"
                value={blocked.end_date}
                hint={offsetLabel(tail, "kiralamanın son günü", "bitişten % gün sonra")}
                canDecrease={tail > 0}
                canIncrease={tail < MAX_TURNAROUND_DAYS}
                onShift={(days) => shift("end_date", days)}
              />
            </div>

            <p className="mt-2.5 flex items-baseline justify-between gap-3 text-xs">
              <span className="text-ink-muted">Sıradaki rezervasyon en erken</span>
              <span className="font-semibold text-ink">
                {day(addDays(blocked.end_date, 1 + turnaround[mode].outbound))}
              </span>
            </p>
          </div>
        </>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {!error && shipsLate && (
        <p className="notice-warning mt-3 flex items-start gap-1.5 p-2 text-xs">
          <IconAlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            Bu tarihler için ürünün {blocked ? day(blocked.start_date) : "bugünden önce"}{" "}
            yola çıkmış olması gerekiyordu. Kaydedebilirsiniz, ama kargonun yetişmesi
            için elden teslim ya da hızlı gönderi gerekebilir.
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * Kiralama tarihine göre kaç gün öteye düştüğünü anlatır: satıcı için asıl
 * anlamlı olan "12 Ağustos" değil "bitişten 3 gün sonra". Çıplak "3 gün önce"
 * neye göre olduğunu söylemediği için cümle her satırda tam yazılıyor.
 */
function offsetLabel(days: number, sameDay: string, template: string): string {
  return days === 0 ? sameDay : template.replace("%", String(days));
}

/**
 * Bir tarihi gün gün kaydıran satır. Tarihin kendisi ve kiralamaya olan
 * uzaklığı birlikte görünüyor, çünkü satıcı ayarı ikincisine bakarak yapıp
 * birincisini takvimle karşılaştırıyor.
 */
function DateStepper({
  label,
  value,
  hint,
  canDecrease,
  canIncrease,
  onShift,
}: {
  label: string;
  value: string;
  /** Tarihin kiralama gününe uzaklığını anlatan cümle. */
  hint: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onShift: (days: number) => void;
}) {
  return (
    // Telefonda etiket üstte, adımlayıcı altta tam genişlikte: aynı satıra
    // sığdırılınca hem açıklama hem tarih kırpılıyor, düğmeler de kenara
    // sıkışıyordu.
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-1.5 sm:pl-2.5 sm:pr-1.5">
      <div className="min-w-0 sm:flex-1">
        <p className="truncate text-xs font-medium text-ink">{label}</p>
        <p className="text-[11px] text-ink-muted">{hint}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-0.5">
        <StepButton
          label={`${label}: bir gün geri al`}
          disabled={!canDecrease}
          onClick={() => onShift(-1)}
        >
          <IconMinus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </StepButton>

        <span className="flex-1 text-center text-sm font-semibold tabular-nums text-ink sm:w-26 sm:flex-none sm:text-xs">
          {day(value)}
        </span>

        <StepButton
          label={`${label}: bir gün ileri al`}
          disabled={!canIncrease}
          onClick={() => onShift(1)}
        >
          <IconPlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="tab-press flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border disabled:hover:text-ink-muted sm:h-7 sm:w-7"
    >
      {children}
    </button>
  );
}
