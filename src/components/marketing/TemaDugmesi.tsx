"use client";

import { useSyncExternalStore } from "react";
import { toggleTheme } from "@/lib/preferences";
import { IconMoon, IconSun } from "@/components/icons";

function abone(degisti: () => void) {
  const gozlem = new MutationObserver(degisti);
  gozlem.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => gozlem.disconnect();
}

function koyuMu() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/**
 * Açık / koyu tema düğmesi. Simge, basınca gidilecek temayı gösteriyor:
 * açıkken ay, koyuyken güneş. Seçim Ayarlar'daki tema tercihiyle aynı çereze
 * yazılıyor, yani panelde de geçerli.
 *
 * Tema `<html>`'deki öznitelikten okunuyor: ilk boyamadan önce çalışan betik
 * onu zaten doğru yazmış oluyor. Sunucuda varsayılan açık tema varsayılıyor.
 */
export default function TemaDugmesi({ className = "" }: { className?: string }) {
  const koyu = useSyncExternalStore(abone, koyuMu, () => false);

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-label={koyu ? "Açık temaya geç" : "Koyu temaya geç"}
      title={koyu ? "Açık tema" : "Koyu tema"}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] ${className}`}
    >
      {koyu ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
    </button>
  );
}
