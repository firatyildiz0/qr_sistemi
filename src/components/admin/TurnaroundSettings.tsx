"use client";

import { useActionState, useState } from "react";
import {
  saveTurnaround,
  type TurnaroundFormState,
} from "@/app/admin/settings/actions";
import { addDays, formatDateRange } from "@/lib/bookings";
import {
  DELIVERY_MODES,
  DELIVERY_MODE_HINT,
  DELIVERY_MODE_LABEL,
  DEFAULT_TURNAROUND,
  MAX_TURNAROUND_DAYS,
  TURNAROUND_FIELDS,
  isDefaultTurnaround,
  tailDays,
  type DeliveryMode,
  type ModeTurnaround,
  type Turnaround,
} from "@/lib/turnaround";
import { IconAlertTriangle, IconCheck, IconUndo } from "@/components/icons";

const initialState: TurnaroundFormState = { error: null };

/** Önizleme için sabit bir örnek: kına ayın 5'i, düğün 6'sı. */
const SAMPLE_START = "2026-08-05";
const SAMPLE_END = "2026-08-06";

const day = (date: string) => formatDateRange(date, date);

/**
 * Ürün dönüş süreleri.
 *
 * Rakamlar kodda sabit değil, çünkü kargo firması yavaşladığında ya da
 * temizlik bir gün uzadığında satıcının bunu kendi ayarlaması gerekiyor.
 * Her alanın altındaki örnek takvim, girilen sayının pratikte ne anlama
 * geldiğini kaydetmeden önce gösteriyor.
 */
export default function TurnaroundSettings({ initial }: { initial: Turnaround }) {
  const [state, formAction, pending] = useActionState(saveTurnaround, initialState);
  const [draft, setDraft] = useState(initial);

  function update(mode: DeliveryMode, key: keyof ModeTurnaround, raw: string) {
    const days = Number(raw);
    setDraft((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [key]: Number.isFinite(days) ? Math.max(0, Math.trunc(days)) : 0,
      },
    }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {DELIVERY_MODES.map((mode) => (
        <section key={mode} className="card">
          <h2 className="text-base font-bold text-ink">{DELIVERY_MODE_LABEL[mode]}</h2>
          <p className="mt-1 text-sm text-ink-muted">{DELIVERY_MODE_HINT[mode]}</p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TURNAROUND_FIELDS.map(({ key, label, hint }) => (
              <div key={key}>
                <label htmlFor={`${mode}-${key}`} className="field-label">
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`${mode}-${key}`}
                    name={`${mode}.${key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_TURNAROUND_DAYS}
                    step={1}
                    required
                    value={draft[mode][key]}
                    onChange={(event) => update(mode, key, event.target.value)}
                    className="input w-24"
                  />
                  <span className="text-sm text-ink-muted">gün</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{hint}</p>
              </div>
            ))}
          </div>

          <Preview mode={draft[mode]} />
        </section>
      ))}

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      {state.recalculated !== undefined && !state.error && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm text-success">
            <IconCheck className="h-4 w-4" />
            Kaydedildi. {state.recalculated} gelecek rezervasyonun bloke aralığı yeniden
            hesaplandı.
          </p>
          {state.skipped && state.skipped.length > 0 && (
            <p className="notice-warning flex items-start gap-1.5 p-3 text-sm">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Şu rezervasyonlar yeni sürelerle birbiriyle çakıştığı için
                güncellenemedi: <strong>{state.skipped.join(", ")}</strong>. Tarihlerini
                elle düzeltmeniz ya da süreleri kısaltmanız gerekiyor.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor…" : "Süreleri kaydet"}
        </button>
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_TURNAROUND)}
          disabled={isDefaultTurnaround(draft)}
          className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconUndo className="h-4 w-4" />
          {isDefaultTurnaround(draft) ? "Zaten varsayılan" : "Varsayılana dön"}
        </button>
      </div>

      <p className="text-xs text-ink-muted">
        Kaydettiğinizde bugünden sonraki rezervasyonların bloke aralığı yeni sürelerle
        yeniden hesaplanır. Geçmiş rezervasyonlar olduğu gibi kalır.
      </p>
    </form>
  );
}

/**
 * Girilen sayıların takvimde ne anlama geldiği. Sabit bir örnek rezervasyon
 * üzerinden gösteriliyor, çünkü "gidiş 3 gün" ifadesi tek başına satıcıya bir
 * sonraki randevuyu ne zaman verebileceğini söylemiyor.
 */
function Preview({ mode }: { mode: ModeTurnaround }) {
  const blockedStart = addDays(SAMPLE_START, -mode.outbound);
  const blockedEnd = addDays(SAMPLE_END, tailDays(mode));
  const nextBooking = addDays(blockedEnd, 1 + mode.outbound);

  return (
    <div className="mt-5 rounded-lg border border-border bg-surface p-3 text-xs">
      <p className="text-ink-muted">
        Örnek: kiralama {formatDateRange(SAMPLE_START, SAMPLE_END)} olsaydı…
      </p>
      <dl className="mt-2 space-y-1">
        <Row label="Ürün elden çıkar" value={day(blockedStart)} />
        <Row label="Ürün tekrar hazır olur" value={day(blockedEnd)} />
        <Row
          label="Sıradaki rezervasyon en erken"
          value={day(nextBooking)}
          strong
        />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "font-semibold text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
