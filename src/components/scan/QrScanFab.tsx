"use client";

import { useEffect, useState } from "react";
import QrScanner from "@/components/scan/QrScanner";
import { IconScan, IconX } from "@/components/icons";

/**
 * The panel-wide scan shortcut: a button pinned to the viewport on every admin
 * screen. It opens the same `QrScanner` the dashboard card uses, so a scan
 * resolves through `resolveScannedCode` and lands on the owner's product page.
 */
export default function QrScanFab() {
  const [open, setOpen] = useState(false);

  // The scanner is unmounted while closed, which is what releases the camera;
  // this only stops the page behind the sheet from scrolling.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="QR okut"
        aria-label="QR okut"
        className="btn btn-primary fixed bottom-5 right-5 z-40 h-14 gap-2 rounded-full px-5 shadow-lg sm:bottom-8 sm:right-8"
      >
        <IconScan className="h-5 w-5" />
        <span className="hidden sm:inline">QR okut</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR okut"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-(--app-backdrop)"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="card relative z-10 w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">QR okut</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface hover:text-ink"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <QrScanner autoStart onResolved={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
