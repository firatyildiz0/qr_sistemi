"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import {
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/admin/notifications/actions";
import {
  IconCheck,
  IconCheckCircle,
  IconChevronRight,
  IconClock,
  IconInbox,
  IconTrash,
} from "@/components/icons";

export type Bildirim = {
  id: string;
  /** Bildirimin götürdüğü ekran; türüne göre değişiyor. */
  href: string;
  tur: "iade" | "talep";
  mesaj: string;
  okundu: boolean;
  tarih: string;
  urun: string | null;
  /** Talep bildirimlerinde talebin *şu anki* durumu. */
  talepDurumu: string | null;
};

type Filtre = "tumu" | "okunmamis" | "talep" | "iade";

type Islem =
  | { tip: "oku"; id: string }
  | { tip: "sil"; id: string }
  | { tip: "hepsiniOku" }
  | { tip: "okunanlariSil" };

function uygula(liste: Bildirim[], islem: Islem): Bildirim[] {
  switch (islem.tip) {
    case "oku":
      return liste.map((n) => (n.id === islem.id ? { ...n, okundu: true } : n));
    case "sil":
      return liste.filter((n) => n.id !== islem.id);
    case "hepsiniOku":
      return liste.map((n) => ({ ...n, okundu: true }));
    case "okunanlariSil":
      return liste.filter((n) => !n.okundu);
  }
}

/* ---- zaman ------------------------------------------------------------- */

// Gün sınırı sunucuda da tarayıcıda da Türkiye saatine göre çiziliyor; yoksa
// sunucunun UTC'si gece yarısına yakın bildirimleri yanlış güne koyardı.
const ZAMAN_DILIMI = "Europe/Istanbul";
const gunAnahtari = new Intl.DateTimeFormat("en-CA", { timeZone: ZAMAN_DILIMI });
const saatBicimi = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ZAMAN_DILIMI,
  hour: "2-digit",
  minute: "2-digit",
});
const gunAdi = new Intl.DateTimeFormat("tr-TR", { timeZone: ZAMAN_DILIMI, weekday: "long" });
const kisaTarih = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ZAMAN_DILIMI,
  day: "numeric",
  month: "short",
});

function gunFarki(iso: string): number {
  const bugun = Date.parse(gunAnahtari.format(new Date()));
  const o = Date.parse(gunAnahtari.format(new Date(iso)));
  return Math.round((bugun - o) / 86_400_000);
}

function grupAdi(fark: number): string {
  if (fark <= 0) return "Bugün";
  if (fark === 1) return "Dün";
  if (fark < 7) return "Bu hafta";
  return "Daha önce";
}

function zamanEtiketi(iso: string): string {
  const fark = gunFarki(iso);
  const tarih = new Date(iso);
  if (fark <= 0) {
    const dakika = Math.round((Date.now() - tarih.getTime()) / 60000);
    if (dakika < 1) return "az önce";
    if (dakika < 60) return `${dakika} dk önce`;
    return saatBicimi.format(tarih);
  }
  if (fark === 1) return `Dün ${saatBicimi.format(tarih)}`;
  if (fark < 7) return `${gunAdi.format(tarih)} ${saatBicimi.format(tarih)}`;
  return kisaTarih.format(tarih);
}

/* ---- görünüm ------------------------------------------------------------ */

const TUR = {
  talep: {
    etiket: "Rezervasyon talebi",
    ikon: IconInbox,
    kutu: "bg-accent-soft text-accent",
  },
  iade: {
    etiket: "İade hatırlatması",
    ikon: IconClock,
    kutu: "bg-warning/15 text-warning",
  },
} as const;

const TALEP_DURUMU: Record<string, { metin: string; sinif: string }> = {
  pending: { metin: "Onay bekliyor", sinif: "pill-warning" },
  approved: { metin: "Onaylandı", sinif: "pill-success" },
  rejected: { metin: "Reddedildi", sinif: "pill-danger" },
  expired: { metin: "Süresi geçti", sinif: "pill-muted" },
};

const FILTRELER: { deger: Filtre; etiket: string }[] = [
  { deger: "tumu", etiket: "Tümü" },
  { deger: "okunmamis", etiket: "Okunmamış" },
  { deger: "talep", etiket: "Talepler" },
  { deger: "iade", etiket: "İade" },
];

export default function BildirimListesi({ bildirimler }: { bildirimler: Bildirim[] }) {
  const [liste, degistir] = useOptimistic(bildirimler, uygula);
  const [, startTransition] = useTransition();
  const [filtre, setFiltre] = useState<Filtre>("tumu");

  function calistir(islem: Islem, sunucu: () => Promise<void>) {
    startTransition(async () => {
      degistir(islem);
      await sunucu();
    });
  }

  const okunmamis = liste.filter((n) => !n.okundu).length;
  const okunmus = liste.length - okunmamis;

  const gorunen = liste.filter((n) =>
    filtre === "tumu"
      ? true
      : filtre === "okunmamis"
        ? !n.okundu
        : n.tur === filtre
  );

  const gruplar: { ad: string; ogeler: Bildirim[] }[] = [];
  for (const n of gorunen) {
    const ad = grupAdi(gunFarki(n.tarih));
    const son = gruplar[gruplar.length - 1];
    if (son?.ad === ad) son.ogeler.push(n);
    else gruplar.push({ ad, ogeler: [n] });
  }

  if (liste.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 border-dashed py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-success">
          <IconCheckCircle className="h-6 w-6" />
        </span>
        <p className="font-semibold text-ink">Her şey güncel</p>
        <p className="max-w-xs text-sm text-ink-muted">
          İade hatırlatmaları ve Instagram’dan gelen rezervasyon talepleri burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Bildirimleri süz"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
        >
          {FILTRELER.map((f) => {
            const secili = filtre === f.deger;
            const sayi = f.deger === "okunmamis" ? okunmamis : null;
            return (
              <button
                key={f.deger}
                type="button"
                role="tab"
                aria-selected={secili}
                onClick={() => setFiltre(f.deger)}
                className={`tab-press flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition ${
                  secili
                    ? "border-ink bg-ink text-paper"
                    : "border-border bg-card text-ink-muted hover:border-border-strong hover:text-ink"
                }`}
              >
                {f.etiket}
                {sayi ? (
                  <span
                    className={`min-w-5 rounded-full px-1.5 text-center text-xs leading-5 ${
                      secili ? "bg-paper/20 text-paper" : "bg-accent text-white"
                    }`}
                  >
                    {sayi}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto">
          {okunmamis > 0 && (
            <button
              type="button"
              onClick={() => calistir({ tip: "hepsiniOku" }, markAllNotificationsRead)}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
            >
              <IconCheck className="h-4 w-4" />
              Tümünü okundu say
            </button>
          )}
          {okunmus > 0 && (
            <button
              type="button"
              onClick={() => calistir({ tip: "okunanlariSil" }, deleteReadNotifications)}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-danger"
            >
              <IconTrash className="h-4 w-4" />
              Okunanları temizle
            </button>
          )}
        </div>
      </div>

      {gorunen.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-ink-muted">
          {filtre === "okunmamis" ? "Okunmamış bildirim yok." : "Bu türde bildirim yok."}
        </div>
      ) : (
        gruplar.map((grup) => (
          <div key={grup.ad} className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {grup.ad}
            </h2>
            <ul className="overflow-hidden rounded-lg border border-border bg-card">
              {grup.ogeler.map((n, i) => (
                <Satir
                  key={n.id}
                  bildirim={n}
                  delay={Math.min(i, 8) * 30}
                  onOku={() => calistir({ tip: "oku", id: n.id }, () => markNotificationRead(n.id))}
                  onSil={() => calistir({ tip: "sil", id: n.id }, () => deleteNotification(n.id))}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function Satir({
  bildirim: n,
  delay,
  onOku,
  onSil,
}: {
  bildirim: Bildirim;
  delay: number;
  onOku: () => void;
  onSil: () => void;
}) {
  const tur = TUR[n.tur];
  const Ikon = tur.ikon;
  const durum = n.talepDurumu ? TALEP_DURUMU[n.talepDurumu] : null;
  const bekliyor = n.tur === "talep" && n.talepDurumu === "pending";

  return (
    <li
      className="bildirim-satiri fade-slide-up relative border-b border-border last:border-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link
        href={n.href}
        onClick={() => {
          if (!n.okundu) onOku();
        }}
        className={`flex items-start gap-3 py-4 pl-4 pr-12 transition-colors hover:bg-surface sm:gap-4 sm:pl-5 ${
          n.okundu ? "" : "bg-accent-soft/25"
        }`}
      >
        <span className="relative shrink-0">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tur.kutu}`}>
            <Ikon className="h-[18px] w-[18px]" />
          </span>
          {!n.okundu && (
            <span
              aria-label="Okunmadı"
              className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-accent ring-2 ring-card"
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {tur.etiket}
            </p>
            <time
              dateTime={n.tarih}
              suppressHydrationWarning
              className="shrink-0 whitespace-nowrap text-xs text-ink-muted"
            >
              {zamanEtiketi(n.tarih)}
            </time>
          </div>

          <p
            className={`mt-1 text-[15px] leading-snug ${
              n.okundu ? "text-ink-muted" : "font-semibold text-ink"
            }`}
          >
            {n.mesaj}
          </p>

          {(durum || n.urun || bekliyor) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {durum && <span className={`pill ${durum.sinif}`}>{durum.metin}</span>}
              {n.urun && n.tur === "iade" && (
                <span className="truncate text-xs text-ink-muted">{n.urun}</span>
              )}
              {bekliyor && (
                <span className="ml-auto inline-flex items-center gap-0.5 text-sm font-semibold text-accent">
                  İncele
                  <IconChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={onSil}
        aria-label="Bildirimi sil"
        title="Sil"
        className="bildirim-satiri-sil icon-btn absolute right-2 top-3 h-8 w-8 hover:text-danger"
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </li>
  );
}
