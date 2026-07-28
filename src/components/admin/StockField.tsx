"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@/components/icons";

const MAX_STOCK = 9999;

export default function StockField({ defaultValue }: { defaultValue: number }) {
  const [stock, setStock] = useState(defaultValue);

  function step(delta: number) {
    setStock((current) => Math.min(MAX_STOCK, Math.max(0, current + delta)));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor="stock" className="field-label mb-0">
          Stok adedi
        </label>
        {stock === 0 && <span className="pill pill-danger">Stokta yok</span>}
      </div>

      <div className="flex items-stretch overflow-hidden rounded-sm border border-border bg-card focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(255,90,31,0.16)]">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={stock <= 0}
          aria-label="Stoğu azalt"
          className="flex w-11 shrink-0 items-center justify-center border-r border-border text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
        >
          <IconMinus className="h-4 w-4" />
        </button>

        <input
          id="stock"
          name="stock"
          type="number"
          inputMode="numeric"
          min="0"
          max={MAX_STOCK}
          step="1"
          required
          value={stock}
          onChange={(e) => {
            const next = Number(e.target.value);
            setStock(Number.isFinite(next) ? Math.min(MAX_STOCK, Math.max(0, Math.trunc(next))) : 0);
          }}
          className="count-up w-full min-w-0 border-0 bg-transparent px-2 py-2.5 text-center text-base font-semibold sm:text-[15px] text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={() => step(1)}
          disabled={stock >= MAX_STOCK}
          aria-label="Stoğu artır"
          className="flex w-11 shrink-0 items-center justify-center border-l border-border text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-xs text-ink-muted">Aynı anda kiralanabilecek adet.</p>
    </div>
  );
}
