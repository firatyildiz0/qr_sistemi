"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBell, IconCheck, IconX } from "@/components/icons";
import { IosKurulumAdimlari } from "@/components/bildirim/BildirimIzni";
import { davetErtelendiMi, davetiErtele, usePush } from "@/components/bildirim/usePush";

/**
 * Paneli açan satıcıya bildirimleri açmasını öneren küçük pencere.
 *
 * Modal değil — satıcının işini kesmiyor, ekranın altında duruyor. Sayfa
 * açılır açılmaz değil birkaç saniye sonra çıkıyor: ilk anda karşısına izin
 * penceresi çıkan kullanıcı genellikle düşünmeden "hayır" diyor, bir kez
 * "hayır" denen izni tarayıcı bir daha sormamıza izin vermiyor.
 *
 * Tarayıcının kendi izin penceresi yalnızca "Bildirimleri aç"a dokunulunca
 * açılıyor. Kimlere görünmüyor: izni zaten vermiş, bilerek kapatmış ya da
 * engellemiş olanlar, "şimdi değil" diyenler (üç gün), ve bildirimler ekranında
 * olanlar — orada aynı şeyi söyleyen kart zaten var.
 */
export default function BildirimDaveti() {
  const { durum, mesgul, ac } = usePush();
  const pathname = usePathname();
  const [gorunur, setGorunur] = useState(false);
  const [basarili, setBasarili] = useState(false);

  const uygun =
    (durum === "kapali" && typeof Notification !== "undefined" && Notification.permission === "default") ||
    durum === "ios-kurulum";

  useEffect(() => {
    if (!uygun || davetErtelendiMi()) return;
    const zamanlayici = window.setTimeout(() => setGorunur(true), 3500);
    return () => window.clearTimeout(zamanlayici);
  }, [uygun]);

  useEffect(() => {
    if (!basarili) return;
    const zamanlayici = window.setTimeout(() => setGorunur(false), 2600);
    return () => window.clearTimeout(zamanlayici);
  }, [basarili]);

  if (!gorunur || pathname.startsWith("/admin/notifications")) return null;

  function kapat() {
    davetiErtele();
    setGorunur(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="bildirim-daveti-baslik"
      className="bildirim-daveti fixed inset-x-3 z-40 mx-auto max-w-sm md:left-auto md:right-8 md:mx-0"
    >
      <div className="card relative overflow-hidden p-0 shadow-[0_24px_48px_-20px_var(--app-backdrop)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-accent/15 blur-2xl"
        />

        {!basarili && (
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="icon-btn absolute right-2 top-2 h-8 w-8"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}

        <div className="relative p-5">
          {basarili ? (
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success text-white">
                <IconCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">Bildirimler açık</p>
                <p className="text-sm text-ink-muted">Yeni talepleri artık anında öğreneceksiniz.</p>
              </div>
            </div>
          ) : (
            <>
              <span className="zil-salla flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_10px_20px_-10px_var(--color-accent)]">
                <IconBell className="h-5 w-5" />
              </span>
              <p id="bildirim-daveti-baslik" className="mt-3 pr-6 text-[17px] font-bold tracking-tight text-ink">
                {durum === "ios-kurulum"
                  ? "Talepleri iPhone’unuzdan kaçırmayın"
                  : "Yeni talepleri anında öğrenin"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Instagram’dan rezervasyon talebi geldiğinde telefonunuza bildirim gönderelim —
                panel kapalıyken bile.
              </p>

              {durum === "ios-kurulum" ? (
                <>
                  <IosKurulumAdimlari />
                  <button type="button" onClick={kapat} className="btn btn-secondary mt-4 h-10 w-full">
                    Anladım
                  </button>
                </>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={mesgul}
                    onClick={async () => {
                      const sonuc = await ac();
                      if (sonuc === "acik") setBasarili(true);
                      else kapat();
                    }}
                    className="btn btn-primary h-10 flex-1"
                  >
                    {mesgul ? "Açılıyor…" : "Bildirimleri aç"}
                  </button>
                  <button
                    type="button"
                    onClick={kapat}
                    className="h-10 rounded-full px-4 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
                  >
                    Şimdi değil
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
