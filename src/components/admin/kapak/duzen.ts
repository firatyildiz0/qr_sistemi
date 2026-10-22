"use client";

import { useSyncExternalStore } from "react";

/**
 * GEÇİCİ — ekranların sadeleştirilmiş hâllerini karşılaştırmak için. Seçim
 * yapıldığında kazanan hâl bileşenin tek hâli olacak, bu kanca silinecek.
 *
 * - `mevcut`: bugünkü ekran
 * - `sade`: her satırda yalnızca okunması gereken; ikincil işler satırın
 *   detayında ya da üzerine gelince
 * - `kompakt`: tek kartta çizgiyle ayrılmış, tek satırlık liste
 */
export type Duzen = "mevcut" | "sade" | "kompakt";

function abone(degisti: () => void) {
  const gozlem = new MutationObserver(degisti);
  gozlem.observe(document.documentElement, { attributes: true, attributeFilter: ["data-duzen"] });
  return () => gozlem.disconnect();
}

function oku(): Duzen {
  const deger = document.documentElement.dataset.duzen;
  return deger === "sade" || deger === "kompakt" ? deger : "mevcut";
}

export function useDuzen(): Duzen {
  return useSyncExternalStore(abone, oku, () => "mevcut");
}
