"use client";

import { addDays, formatDateRange, type DateSpan } from "@/lib/bookings";
import {
  DELIVERY_MODES,
  DELIVERY_MODE_HINT,
  DELIVERY_MODE_LABEL,
  deliveryModeForCity,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";
import { IconAlertTriangle, IconTruck } from "@/components/icons";

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

  const editable = Boolean(rental && blocked);

  function setEdge(edge: "start_date" | "end_date", value: string) {
    if (!blocked || !value) return;
    onBlockedChange({ ...blocked, [edge]: value });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="field-label mb-2 flex items-center gap-1.5">
        <IconTruck className="h-4 w-4" />
        Teslimat şekli
      </p>

      <div className="flex flex-wrap gap-2">
        {DELIVERY_MODES.map((option) => (
          <label
            key={option}
            className={`relative flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
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

      {blocked && (
        <>
          <input type="hidden" name="blocked_start" value={blocked.start_date} />
          <input type="hidden" name="blocked_end" value={blocked.end_date} />

          <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">
                {manual
                  ? "Tarihleri elle belirlediniz."
                  : "Tarihler teslimat süresine göre hesaplandı."}
              </span>
              {manual && (
                <button
                  type="button"
                  onClick={() => onBlockedChange(null)}
                  className="shrink-0 font-medium text-accent-strong underline underline-offset-2"
                >
                  Otomatiğe dön
                </button>
              )}
            </div>

            <EditableRow
              label="Ürün elinizden çıkar"
              value={blocked.start_date}
              max={rental?.start_date}
              disabled={!editable}
              onChange={(value) => setEdge("start_date", value)}
            />
            <EditableRow
              label="Ürün tekrar hazır olur"
              value={blocked.end_date}
              min={rental?.end_date}
              disabled={!editable}
              onChange={(value) => setEdge("end_date", value)}
            />

            <div className="flex items-baseline justify-between gap-3 pt-1">
              <span className="text-ink-muted">Sıradaki rezervasyon en erken</span>
              <span className="font-semibold text-ink">
                {day(addDays(blocked.end_date, 1 + turnaround[mode].outbound))}
              </span>
            </div>
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
 * Tarihi hem okunur biçimde gösterip hem düzenletmek gerekiyor: satıcı "12 Ağu
 * 2026"yı okuyor ama düzenlerken takvim bekliyor. Native `date` alanı ikisini
 * de veriyor, o yüzden okunur metin alanın yanında ayrıca yazılıyor.
 */
function EditableRow({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="text-ink-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-ink">{day(value)}</span>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="input h-8 w-38 px-2 py-0 text-xs"
        />
      </span>
    </label>
  );
}
