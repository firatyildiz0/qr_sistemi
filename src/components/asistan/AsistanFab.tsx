"use client";

import { useEffect, useState } from "react";
import AsistanPanel from "@/components/asistan/AsistanPanel";
import { IconSparkles } from "@/components/icons";

/**
 * Asistanın kapısı — "Ürün bul" düğmesinin hemen üstünde.
 *
 * Masaüstünde iki yüzen düğme alt alta duruyor. Mobilde "Ürün bul" sekme
 * çubuğunun ortasında olduğu için buradaki düğme çubuğun üstüne çıkıyor;
 * konumu `globals.css`'teki `.asistan-fab` veriyor, iki çubuğun yüksekliği
 * orada zaten tanımlı.
 *
 * Panel yalnızca açıldığında yükleniyor: paneli hiç açmayan satıcı ne konuşma
 * tanıma kodunu ne de sohbet bileşenini indiriyor.
 */
export default function AsistanFab() {
  const [acik, setAcik] = useState(false);

  // Escape ile kapanmak, ekranın köşesinde açılan her katmandan beklenen şey.
  useEffect(() => {
    if (!acik) return;

    function kapat(olay: KeyboardEvent) {
      if (olay.key === "Escape") setAcik(false);
    }

    window.addEventListener("keydown", kapat);
    return () => window.removeEventListener("keydown", kapat);
  }, [acik]);

  return (
    <>
      {!acik && (
        <button
          type="button"
          onClick={() => setAcik(true)}
          title="Veyro asistan"
          aria-label="Veyro asistanı aç"
          className="asistan-fab fixed z-40 flex h-12 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-ink"
        >
          <IconSparkles className="h-5 w-5 text-accent" />
          <span className="hidden sm:inline">Veyro</span>
        </button>
      )}

      {acik && <AsistanPanel onClose={() => setAcik(false)} />}
    </>
  );
}
