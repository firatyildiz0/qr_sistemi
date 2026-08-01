"use client";

import { useEffect } from "react";
import type { PresenceKind } from "@/lib/presence";

/**
 * Açık sekmenin kalp atışı: 45 saniyede bir sunucuya "buradayım" diyor, yönetim
 * panelindeki anlık kullanıcı sayacı da bunu sayıyor.
 *
 * Hiçbir şey çizmiyor. Sekme arka plandayken susuyor — başka bir sekmeye geçmiş
 * ya da telefonunu cebine koymuş biri "sitede" sayılmasın; öne geldiğinde
 * beklemeden yeniden haber veriyor.
 */

const INTERVAL_MS = 45_000;

export default function PresenceBeacon({ kind }: { kind: PresenceKind }) {
  useEffect(() => {
    const controller = new AbortController();

    const ping = () => {
      if (document.hidden) return;

      // Sayaç bir yan iş: başarısız olursa sessizce geçiyor, kullanıcıya
      // gösterilecek bir şey yok.
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {});
    };

    ping();
    const timer = setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [kind]);

  return null;
}
