"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScanSheet from "@/components/scan/ScanSheet";
import type { ScanMode } from "@/components/scan/ScanPanel";
import { findByBarcode } from "@/app/actions";
import { IconBarcode, IconImage, IconPlus, IconQrCode, IconX } from "@/components/icons";

/**
 * Ana sayfanın kısayol sırası.
 *
 * Eskiden sayfanın ortasında kocaman bir QR tarayıcı duruyordu; ürün bulmanın
 * tek yolu oymuş gibi görünüyordu. Artık dört eşit, küçük düğme: ikisi aynı
 * tarayıcıyı ilgili sekmesiyle açıyor, biri barkod numarasını soruyor, biri
 * yeni ürün formuna gidiyor.
 */
export default function HomeShortcuts() {
  const [scan, setScan] = useState<ScanMode | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/admin/products/new" className="btn btn-primary !px-4">
          <IconPlus className="h-4 w-4" />
          Ürün ekle
        </Link>
        <button type="button" onClick={() => setScan("qr")} className="btn btn-secondary !px-4">
          <IconQrCode className="h-4 w-4" />
          QR okut
        </button>
        <button type="button" onClick={() => setScan("image")} className="btn btn-secondary !px-4">
          <IconImage className="h-4 w-4" />
          Görsel okut
        </button>
        <button type="button" onClick={() => setBarcodeOpen(true)} className="btn btn-secondary !px-4">
          <IconBarcode className="h-4 w-4" />
          Barkod arat
        </button>
      </div>

      {scan && <ScanSheet initialMode={scan} onClose={() => setScan(null)} />}
      {barcodeOpen && <BarcodeSheet onClose={() => setBarcodeOpen(false)} />}
    </>
  );
}

/**
 * Barkod numarasını soran küçük pencere. El tipi okuyucular numarayı odaktaki
 * kutuya yazıp Enter'a basıyor; kutunun açılır açılmaz odakta olması bu yüzden.
 */
function BarcodeSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = inputRef.current?.value ?? "";
    setError(null);
    startTransition(async () => {
      const result = await findByBarcode(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.href);
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Barkod arat"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div className="modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="modal-panel safe-b relative z-10 flex w-full flex-col rounded-t-[28px] bg-card p-5 sm:max-w-md sm:rounded-xl">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden"
        />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Barkod arat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            name="barcode"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Barkod numarası"
            aria-label="Barkod numarası"
            className="input"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Aranıyor…" : "Ara"}
          </button>
        </form>
      </div>
    </div>
  );
}
