"use client";

import { useEffect } from "react";
import ScanPanel from "@/components/scan/ScanPanel";
import { IconX } from "@/components/icons";

/**
 * The scanner overlay itself, without the button that opens it — the desktop
 * FAB and the mobile tab bar both render this, so a scan behaves identically
 * whichever entry point was used.
 *
 * Mobilde tam ekran bir sayfa gibi açılıyor (uygulama hissiyatı), masaüstünde
 * ortalanmış bir kart olarak kalıyor.
 */
export default function ScanSheet({ onClose }: { onClose: () => void }) {
  // The scanner is unmounted while closed, which is what releases the camera;
  // this only stops the page behind the sheet from scrolling.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ürün bul"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div
        className="modal-backdrop absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel safe-b relative z-10 flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-h-none sm:max-w-md sm:rounded-lg">
        {/* Sheet'in üstündeki tutamaç: mobilde pencerenin aşağı kaydırılarak
            kapatılabileceğini değil, bunun bir katman olduğunu anlatıyor. */}
        <span
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden"
        />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Ürün bul</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <ScanPanel autoStart onResolved={onClose} />
      </div>
    </div>
  );
}
