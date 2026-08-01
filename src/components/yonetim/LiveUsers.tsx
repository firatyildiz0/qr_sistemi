"use client";

import { useEffect, useState } from "react";
import type { Presence } from "@/lib/presence";
import { IconPackage, IconUsers } from "@/components/icons";

/**
 * "Şu anda sitede kaç kişi var" kartı.
 *
 * Sayfanın geri kalanı dönemsel; bu kart canlı, o yüzden tek istemci bileşeni o.
 * İlk değer sunucudan geliyor (kart boş açılmıyor), sonrasında 20 saniyede bir
 * tazeleniyor. Sekme arka plandayken sorgu durup öne gelince hemen yenileniyor:
 * açık unutulmuş bir panel boşuna istek atmasın.
 */

const REFRESH_MS = 20_000;

export default function LiveUsers({ initial }: { initial: Presence }) {
  const [presence, setPresence] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (document.hidden) return;

      try {
        const response = await fetch("/api/presence", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(String(response.status));
        setPresence((await response.json()) as Presence);
        setStale(false);
      } catch {
        // İptal edilen istek hata değil, bileşen kaldırıldı demek.
        if (controller.signal.aborted) return;
        setStale(true);
      }
    };

    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);

    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const rows = [
    { icon: IconUsers, label: "satıcı panelinde", value: presence.panel },
    { icon: IconPackage, label: "ürün sayfasında", value: presence.urun },
  ];

  return (
    <div className="card flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {/* Yanıp sönen nokta rakamın canlı olduğunu söylüyor; yanındaki yazı
              aynı şeyi renk ve hareketten bağımsız olarak tekrar ediyor. */}
          <span
            aria-hidden="true"
            className={`live-dot h-2 w-2 rounded-full ${
              stale ? "bg-ink-muted" : "bg-success"
            }`}
          />
          <span className="eyebrow text-ink-muted">
            {stale ? "Bağlantı koptu" : "Şu anda sitede"}
          </span>
        </div>

        <p
          aria-live="polite"
          className="count-up mt-2 text-[44px] font-bold leading-none text-ink"
        >
          {presence.total.toLocaleString("tr-TR")}
          <span className="ml-2 align-middle text-base font-medium text-ink-muted">
            kişi
          </span>
        </p>

        <p className="mt-2 text-xs text-ink-muted">
          Son iki dakikada etkin olan sekmeler. Yönetim paneli sayılmıyor.
        </p>
      </div>

      <div className="flex gap-3 sm:gap-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-28 flex-col gap-1 rounded-md bg-surface px-4 py-3"
          >
            <row.icon className="h-4 w-4 text-ink-muted" />
            <span className="count-up text-xl font-bold leading-none text-ink">
              {row.value.toLocaleString("tr-TR")}
            </span>
            <span className="text-xs text-ink-muted">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
