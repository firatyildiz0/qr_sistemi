"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { denemeBildirimiGonder } from "@/app/admin/notifications/actions";
import { IconAlertTriangle, IconBell, IconCheck, IconPhone } from "@/components/icons";
import { usePush } from "@/components/bildirim/usePush";

/** iOS Safari'nin "Paylaş" simgesi — tarif ederken kullanıcı aynısını arıyor. */
export function IconPaylas(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function IconZilKapali(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8.7 3.7A6 6 0 0 1 18 8c0 3 .6 5 1.3 6.3" />
      <path d="M17 17H4.5a1 1 0 0 1-.8-1.6C5 13.8 6 12 6 8c0-.5.1-1 .2-1.5" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

/** iPhone'da bildirim için ana ekrana ekleme adımları. */
export function IosKurulumAdimlari() {
  return (
    <ol className="mt-3 space-y-2 text-sm text-ink">
      <li className="flex items-center gap-3">
        <Adim n={1} />
        <span>
          Safari&apos;nin alt çubuğundaki{" "}
          <IconPaylas className="inline h-4 w-4 -translate-y-0.5 text-accent" />{" "}
          <b>Paylaş</b> düğmesine dokunun.
        </span>
      </li>
      <li className="flex items-center gap-3">
        <Adim n={2} />
        <span>
          <b>Ana Ekrana Ekle</b>&apos;yi seçin.
        </span>
      </li>
      <li className="flex items-center gap-3">
        <Adim n={3} />
        <span>Ana ekrandaki RentQR simgesinden açın ve bildirimleri açın.</span>
      </li>
    </ol>
  );
}

function Adim({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong">
      {n}
    </span>
  );
}

function EngelTarifi() {
  return (
    <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
      <li>
        <b className="text-ink">Tarayıcıda:</b> adres çubuğundaki kilit simgesi → Bildirimler →
        İzin ver, sonra sayfayı yenileyin.
      </li>
      <li>
        <b className="text-ink">Telefona kurulu uygulamada:</b> Ayarlar → Uygulamalar → RentQR →
        Bildirimler.
      </li>
    </ul>
  );
}

/**
 * Bildirimler ekranının başındaki ayar kartı. Her durumda bir şey söylüyor:
 * kapalıysa açmaya davet ediyor, açıksa açık olduğunu gösterip denemeye izin
 * veriyor, engelliyse nasıl açılacağını tarif ediyor.
 */
export function BildirimAyarKarti() {
  const { durum, mesgul, ac, kapat } = usePush();
  const [denemeMesaji, setDenemeMesaji] = useState<string | null>(null);
  const [deniyor, startDeneme] = useTransition();

  if (durum === "yukleniyor") {
    return <div className="card h-[108px] animate-pulse p-0" aria-hidden="true" />;
  }

  if (durum === "acik") {
    return (
      <section className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/12 text-success">
          <IconBell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success text-white ring-2 ring-card">
            <IconCheck className="h-2.5 w-2.5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Telefon bildirimleri açık</p>
          <p className="text-sm text-ink-muted">
            {denemeMesaji ?? "Instagram’dan yeni talep geldiğinde bu cihaza anında haber veriyoruz."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={deniyor}
            onClick={() =>
              startDeneme(async () => {
                const { ulasan } = await denemeBildirimiGonder();
                setDenemeMesaji(
                  ulasan > 0
                    ? "Deneme bildirimi gönderildi — birkaç saniye içinde gelir."
                    : "Deneme bildirimi gönderilemedi. Bildirimleri kapatıp yeniden açmayı deneyin."
                );
              })
            }
            className="btn btn-secondary h-10 px-4 text-sm"
          >
            {deniyor ? "Gönderiliyor…" : "Deneme gönder"}
          </button>
          <button
            type="button"
            disabled={mesgul}
            onClick={() => {
              setDenemeMesaji(null);
              kapat();
            }}
            className="h-10 rounded-full px-3 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink disabled:opacity-50"
          >
            Kapat
          </button>
        </div>
      </section>
    );
  }

  if (durum === "reddedildi") {
    return (
      <section className="card flex gap-4 border-warning/30 p-4 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <IconZilKapali className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Bildirimler bu cihazda engellenmiş</p>
          <p className="text-sm text-ink-muted">
            Yeni talepleri telefonunuzdan öğrenmek için izni ayarlardan açmanız gerekiyor.
          </p>
          <EngelTarifi />
        </div>
      </section>
    );
  }

  if (durum === "ios-kurulum") {
    return (
      <section className="card flex gap-4 p-4 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconPhone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">iPhone’da bildirim için önce ana ekrana ekleyin</p>
          <p className="text-sm text-ink-muted">
            Apple, bildirimleri yalnızca ana ekrana eklenmiş uygulamalara izin veriyor.
          </p>
          <IosKurulumAdimlari />
        </div>
      </section>
    );
  }

  if (durum === "desteklenmiyor") {
    return (
      <section className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-ink-muted">
        <IconAlertTriangle className="h-4 w-4 shrink-0" />
        Bu tarayıcı telefon bildirimlerini desteklemiyor. Chrome, Safari ya da Edge’in güncel
        sürümünü deneyin.
      </section>
    );
  }

  // kapali
  return (
    <section className="card relative overflow-hidden p-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-2xl"
      />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="zil-salla flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_10px_20px_-10px_var(--color-accent)]">
          <IconBell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Talepleri telefonunuzdan kaçırmayın</p>
          <p className="text-sm text-ink-muted">
            Instagram’dan rezervasyon talebi geldiğinde, panel kapalıyken bile telefonunuza anında
            bildirim gelsin.
          </p>
        </div>
        <button
          type="button"
          disabled={mesgul}
          onClick={() => ac()}
          className="btn btn-primary h-11 shrink-0 px-5"
        >
          {mesgul ? "Açılıyor…" : "Bildirimleri aç"}
        </button>
      </div>
    </section>
  );
}

/**
 * Talepler ekranındaki ince şerit. Yalnızca bildirimler kapalıyken görünüyor;
 * açıkken ya da desteklenmiyorken yer kaplamıyor.
 */
export function BildirimSeridi() {
  const { durum, mesgul, ac } = usePush();

  if (durum !== "kapali" && durum !== "ios-kurulum" && durum !== "reddedildi") return null;

  return (
    <div className="fade-slide-up flex items-center gap-3 rounded-lg border border-accent/20 bg-accent-soft/50 px-4 py-3">
      <IconBell className="h-4 w-4 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-sm text-ink">
        {durum === "kapali"
          ? "Yeni talep geldiğinde telefonunuza bildirim gelsin."
          : durum === "ios-kurulum"
            ? "iPhone’da bildirim almak için RentQR’ı ana ekrana ekleyin."
            : "Bildirimler engellenmiş; yeni talepleri kaçırabilirsiniz."}
      </p>
      {durum === "kapali" ? (
        <button
          type="button"
          disabled={mesgul}
          onClick={() => ac()}
          className="shrink-0 text-sm font-semibold text-accent hover:text-accent-hover disabled:opacity-50"
        >
          {mesgul ? "Açılıyor…" : "Aç"}
        </button>
      ) : (
        <Link
          href="/admin/notifications"
          className="shrink-0 text-sm font-semibold text-accent hover:text-accent-hover"
        >
          Nasıl?
        </Link>
      )}
    </div>
  );
}
