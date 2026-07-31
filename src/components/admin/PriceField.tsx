"use client";

import { useState } from "react";
import { formatPriceInput, parsePriceInput } from "@/lib/format";

/**
 * Bir lira alanı: ekranda binlik ayıraçlı yazılır, sunucuya düz sayı olarak
 * gider. Boş bırakılabilir — o zaman gizli alan da boş gider ve değer null olur.
 */
export default function PriceField({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number | null | undefined;
  hint?: string;
}) {
  const [price, setPrice] = useState(() =>
    defaultValue != null ? formatPriceInput(String(defaultValue).replace(".", ",")) : ""
  );

  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
          ₺
        </span>
        <input
          id={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={price}
          onChange={(e) => setPrice(formatPriceInput(e.target.value))}
          className="input pr-8"
        />
        <input type="hidden" name={name} value={parsePriceInput(price)} />
      </div>
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
