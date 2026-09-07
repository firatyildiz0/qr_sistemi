"use client";

import { useState } from "react";
import ScanSheet from "@/components/scan/ScanSheet";
import { IconScan } from "@/components/icons";

/**
 * The panel-wide scan shortcut on desktop: a button pinned to the corner of
 * every admin screen. It opens the same `ScanSheet` the mobile tab bar does,
 * so QR okutmak da ürünü kameraya göstermek de aynı ürün sayfasına çıkar.
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
        title="Ürün bul"
        aria-label="Ürün bul"
        className="btn btn-primary tab-fab fixed bottom-8 right-8 z-40 hidden h-14 gap-2 rounded-full px-6 md:inline-flex"
      >
        <IconScan className="h-5 w-5" />
        <span>Ürün bul</span>
      </button>

      {open && <ScanSheet onClose={() => setOpen(false)} />}
    </>
  );
}
