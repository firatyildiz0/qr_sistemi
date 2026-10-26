"use client";

import { useEffect, useRef } from "react";
import type { TurnstileAction } from "@/lib/turnstile";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi> | null = null;

/**
 * Cloudflare'in paketini bir kez yükler. Script etiketi bizim paketimizden
 * eklendiği için CSP'nin `strict-dynamic`'i ona da güveniyor; widget'ın
 * çerçevesi için giriş sayfasında `frame-src` açık (bkz. proxy.ts).
 */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile yok")));
    script.onerror = () => {
      loading = null;
      reject(new Error("turnstile yüklenemedi"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * "Robot değilim" kutusu. Yalnızca hız sınırı aşıldığında çiziliyor; çözülünce
 * forma `cf-turnstile-response` adlı gizli alanı kendisi ekliyor.
 *
 * Jeton tek kullanımlık: `round` formun son cevabı. Her gönderim yeni bir
 * cevap nesnesi doğurduğu için kutu her seferinde baştan kuruluyor; aynı hata
 * iki kez gelse de eski, harcanmış jeton formda kalmıyor.
 */
export default function Turnstile({ action, round }: { action: TurnstileAction; round: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !box.current) return;
    const el = box.current;
    let id: string | null = null;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        id = api.render(el, { sitekey: siteKey, action, language: "tr", theme: "light" });
      })
      .catch((error) => console.error("[turnstile]", error));

    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, action, round]);

  if (!siteKey) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
