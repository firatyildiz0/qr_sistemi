"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CEREZ_BILDIRIMI_COOKIE } from "@/lib/yasal";

/**
 * Çerez bildirimi.
 *
 * Bir onay penceresi değil, bilgilendirme: sitede reklam ya da analitik çerezi
 * yok, kullanılanların hepsi sitenin çalışması için gerekli (bkz.
 * /cerez-politikasi) ve bunlar için açık rıza aranmıyor. Bu yüzden "Reddet"
 * düğmesi yok — reddedilecek bir şey yok. Bir gün analitik çerez eklenirse
 * burası gerçek bir rıza penceresine dönüşmeli ve o çerez rıza gelmeden
 * yazılmamalı.
 *
 * Kapatıldığı bir çerezle hatırlanıyor. Sunucuda "kapatılmış" sayılıyor ki
 * sayfa her açılışta şeritle boyanıp sonra silinmesin; tarayıcı çerezi okuyunca
 * gerekiyorsa görünüyor.
 */

const BIR_YIL = 60 * 60 * 24 * 365;
const dinleyiciler = new Set<() => void>();

function abone(dinleyici: () => void) {
  dinleyiciler.add(dinleyici);
  return () => {
    dinleyiciler.delete(dinleyici);
  };
}

function kapatildi() {
  return document.cookie.split("; ").some((c) => c.startsWith(`${CEREZ_BILDIRIMI_COOKIE}=`));
}

function kapat() {
  document.cookie = `${CEREZ_BILDIRIMI_COOKIE}=1; path=/; max-age=${BIR_YIL}; samesite=lax`;
  dinleyiciler.forEach((dinleyici) => dinleyici());
}

export default function CerezBildirimi() {
  const gizli = useSyncExternalStore(abone, kapatildi, () => true);
  if (gizli) return null;

  return (
    // Telefonda altta sabit eylem ya da sekme çubuğu duruyor; şerit onun
    // üstünde yüzüyor, düğmeleri örtmüyor.
    <div
      role="region"
      aria-label="Çerez bildirimi"
      className="fade-slide-up fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-[60] mx-auto max-w-xl rounded-3xl border border-border bg-card p-4 shadow-[var(--app-lift)] sm:bottom-4 sm:flex sm:items-center sm:gap-4"
    >
      <p className="text-sm text-ink-muted">
        Reklam ya da takip çerezi kullanmıyoruz. Yalnızca oturumunuzun açık kalması ve tercihlerinizin
        hatırlanması için gereken çerezler var.{" "}
        <Link href="/cerez-politikasi" className="link-underline font-medium text-accent">
          Çerez Politikası
        </Link>
      </p>
      <button
        type="button"
        onClick={kapat}
        className="btn btn-primary mt-3 h-10 min-h-0 w-full shrink-0 sm:mt-0 sm:w-auto"
      >
        Anladım
      </button>
    </div>
  );
}
