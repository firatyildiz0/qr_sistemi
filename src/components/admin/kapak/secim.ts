"use client";

import { useSyncExternalStore } from "react";

/**
 * GEÇİCİ — seçim panosunun `<html>`'e yazdığı bir özniteliği okuyor
 * (`data-gecmis`, `data-hafta`). Seçim yapılınca kazanan hâl bileşenin tek
 * hâli olacak, bu kanca silinecek.
 *
 * Sunucuda ve ilk boyamada `varsayilan` dönüyor; pano öznitelikleri yazınca
 * bileşen kendini yeniden çiziyor.
 */
export function useSecim<T extends string>(ad: string, gecerli: readonly T[], varsayilan: T): T {
  return useSyncExternalStore(
    (degisti) => {
      const gozlem = new MutationObserver(degisti);
      gozlem.observe(document.documentElement, { attributes: true, attributeFilter: [`data-${ad}`] });
      return () => gozlem.disconnect();
    },
    () => {
      const deger = document.documentElement.getAttribute(`data-${ad}`) as T | null;
      return deger && gecerli.includes(deger) ? deger : varsayilan;
    },
    () => varsayilan,
  );
}

export const GECMIS_HALLERI = ["tarih", "aylar", "sirada"] as const;
export type GecmisHali = (typeof GECMIS_HALLERI)[number];

export const HAFTA_HALLERI = ["sigan", "ajanda", "secili"] as const;
export type HaftaHali = (typeof HAFTA_HALLERI)[number];

export const ORNEK_HALLERI = ["acik", "kapali"] as const;
