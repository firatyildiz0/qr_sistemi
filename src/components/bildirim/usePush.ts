"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  pushAboneligiSil,
  pushAboneOl,
  type PushAboneligi,
} from "@/app/admin/notifications/actions";

/**
 * Telefon bildirimlerinin tarayıcı tarafı.
 *
 * Durumlar:
 * - `yukleniyor`     — tarayıcıya henüz sorulmadı (ilk boyama; sunucuda da bu).
 * - `desteklenmiyor` — tarayıcı Web Push bilmiyor ya da anahtar tanımlı değil.
 * - `ios-kurulum`    — iPhone'da Safari sekmesi: Apple bildirimi yalnızca ana
 *                      ekrana eklenmiş uygulamaya veriyor, önce o adım.
 * - `kapali`         — izin sorulmamış ya da satıcı bu cihazda kapatmış.
 * - `reddedildi`     — izin reddedilmiş. Tarayıcı bir daha sormamıza izin
 *                      vermiyor, ayarlardan açmayı tarif etmek gerekiyor.
 * - `acik`           — izin var ve bu cihaz sunucuya kayıtlı.
 *
 * Durum modül düzeyinde tek bir yerde: davet penceresi ile bildirim ekranındaki
 * kart aynı anda açıksa biri "açtım" dediğinde diğeri de hemen görsün, ve
 * sunucuya kayıt bir kez yapılsın.
 */
export type PushDurumu =
  | "yukleniyor"
  | "desteklenmiyor"
  | "ios-kurulum"
  | "kapali"
  | "reddedildi"
  | "acik";

const ACIK_ANAHTAR = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * Satıcı bu cihazda bildirimi kapattıysa. Tarayıcı izni "verildi" olarak
 * kalıyor; bu işaret olmasa bir sonraki açılışta sessizce yeniden abone olurduk.
 */
const KAPATILDI = "rentqr-push-kapatildi";

function oku(anahtar: string): string | null {
  try {
    return window.localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}

function yaz(anahtar: string, deger: string | null) {
  try {
    if (deger === null) window.localStorage.removeItem(anahtar);
    else window.localStorage.setItem(anahtar, deger);
  } catch {
    // Gizli sekme vb. — işaret tutulamazsa en kötü ihtimalle yeniden abone oluruz.
  }
}

function base64UrlToUint8Array(base64: string) {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = window.atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  const dizi = new Uint8Array(ham.length);
  for (let i = 0; i < ham.length; i++) dizi[i] = ham.charCodeAt(i);
  return dizi;
}

export function iosMu(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS kendini masaüstü Safari olarak tanıtıyor.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function kuruluMu(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function destekleniyor(): boolean {
  return (
    Boolean(ACIK_ANAHTAR) &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function kayit() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

function serilestir(abonelik: PushSubscription): PushAboneligi {
  return JSON.parse(JSON.stringify(abonelik)) as PushAboneligi;
}

/* ---- paylaşılan durum ---------------------------------------------------- */

let durum: PushDurumu = "yukleniyor";
let mesgul = false;
let baslatildi = false;
let anlik: { durum: PushDurumu; mesgul: boolean } = { durum, mesgul };
const SUNUCU_ANLIK = { durum: "yukleniyor" as PushDurumu, mesgul: false };
const dinleyiciler = new Set<() => void>();

function degistir(yeni: { durum?: PushDurumu; mesgul?: boolean }) {
  if (yeni.durum !== undefined) durum = yeni.durum;
  if (yeni.mesgul !== undefined) mesgul = yeni.mesgul;
  anlik = { durum, mesgul };
  dinleyiciler.forEach((d) => d());
}

function abone(dinleyici: () => void) {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

/** İzin verilmişse cihazın aboneliğini kurar/tazeler ve sunucuya kaydeder. */
async function kaydet(): Promise<PushDurumu> {
  const reg = await kayit();
  await navigator.serviceWorker.ready;
  let abonelik = await reg.pushManager.getSubscription();
  if (!abonelik) {
    abonelik = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(ACIK_ANAHTAR),
    });
  }
  const { ok } = await pushAboneOl(serilestir(abonelik), navigator.userAgent);
  return ok ? "acik" : "kapali";
}

async function tespitEt(): Promise<PushDurumu> {
  if (!destekleniyor()) return iosMu() && !kuruluMu() ? "ios-kurulum" : "desteklenmiyor";
  if (Notification.permission === "denied") return "reddedildi";
  if (Notification.permission === "default") return "kapali";
  if (oku(KAPATILDI)) return "kapali";

  // İzin verilmiş: abonelik de yerinde mi? Tarayıcı aboneliği kendiliğinden
  // yenileyebiliyor ya da veri temizlenmiş olabiliyor; sessizce yeniden
  // kaydediyoruz ki talepler kaybolmasın.
  return kaydet();
}

function baslat() {
  if (baslatildi) return;
  baslatildi = true;
  tespitEt()
    .then((d) => degistir({ durum: d }))
    .catch(() => degistir({ durum: "kapali" }));
}

export function usePush() {
  const { durum, mesgul } = useSyncExternalStore(
    abone,
    () => anlik,
    () => SUNUCU_ANLIK
  );

  useEffect(baslat, []);

  /** İzni ister ve cihazı kaydeder. Bir dokunuşun içinden çağrılmalı. */
  const ac = useCallback(async (): Promise<PushDurumu> => {
    degistir({ mesgul: true });
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        const d: PushDurumu = izin === "denied" ? "reddedildi" : "kapali";
        degistir({ durum: d });
        return d;
      }
      yaz(KAPATILDI, null);
      const d = await kaydet();
      degistir({ durum: d });
      return d;
    } catch {
      degistir({ durum: "kapali" });
      return "kapali";
    } finally {
      degistir({ mesgul: false });
    }
  }, []);

  /** Yalnızca bu cihazı çıkarır; diğer cihazlar bildirim almaya devam eder. */
  const kapat = useCallback(async () => {
    degistir({ mesgul: true });
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const abonelik = await reg?.pushManager.getSubscription();
      if (abonelik) {
        await pushAboneligiSil(abonelik.endpoint);
        await abonelik.unsubscribe();
      }
      yaz(KAPATILDI, "1");
      degistir({ durum: "kapali" });
    } finally {
      degistir({ mesgul: false });
    }
  }, []);

  return { durum, mesgul, ac, kapat };
}

/* ---- davet penceresinin "şimdi değil" hafızası ---------------------------- */

const ERTELENDI = "rentqr-push-davet-ertelendi";
const ERTELEME_MS = 3 * 86_400_000;

export function davetErtelendiMi(): boolean {
  const deger = Number(oku(ERTELENDI) ?? 0);
  return Date.now() - deger < ERTELEME_MS;
}

export function davetiErtele() {
  yaz(ERTELENDI, String(Date.now()));
}
