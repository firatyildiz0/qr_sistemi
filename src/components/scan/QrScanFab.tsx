"use client";

import { useState } from "react";
import QrScanSheet from "@/components/scan/QrScanSheet";
import { IconScan } from "@/components/icons";

/**
 * The panel-wide scan shortcut on desktop: a button pinned to the corner of
 * every admin screen. It opens the same `QrScanSheet` the mobile tab bar does,
 * so a scan resolves through `resolveScannedCode` and lands on the owner's
 * product page either way.
 *
 * Mobilde gizli: orada tarayıcıyı sekme çubuğunun ortasındaki düğme açıyor ve
 * iki yüzen buton üst üste binerdi.
 */
export default function QrScanFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="QR okut"
        aria-label="QR okut"
        className="btn btn-primary fixed bottom-8 right-8 z-40 hidden h-14 gap-2 rounded-full px-5 shadow-lg md:inline-flex"
      >
        <IconScan className="h-5 w-5" />
        <span>QR okut</span>
      </button>

      {open && <QrScanSheet onClose={() => setOpen(false)} />}
    </>
  );
}
