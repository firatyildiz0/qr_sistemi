"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ETIKETLER, SECENEKLER, type Secim } from "./secenekler";

/**
 * Sol altta duran seçim paneli. Bir seçeneğe basınca adres değişiyor ve sayfa
 * sunucuda o seçimle yeniden çiziliyor; kaydırma konumu korunuyor. Adres
 * paylaşılabilir: "Bağlantıyı kopyala" o anki birleşimi panoya alıyor.
 */
export default function SecenekPaneli({ secim }: { secim: Secim }) {
  const router = useRouter();
  const [acik, setAcik] = useState(true);
  const [bekliyor, gecis] = useTransition();
  const [kopyalandi, setKopyalandi] = useState(false);

  function sec<K extends keyof Secim>(anahtar: K, deger: Secim[K]) {
    const yeni = new URLSearchParams({ ...secim, [anahtar]: deger } as Record<string, string>);
    gecis(() => router.replace(`/?${yeni.toString()}${location.hash}`, { scroll: false }));
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(location.href.split("#")[0]);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      // Pano izni yoksa adres çubuğundan kopyalanabilir; sessizce geç.
    }
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="fixed bottom-24 left-4 z-[60] rounded-full bg-ink px-4 py-3 text-sm font-bold text-paper shadow-[0_18px_30px_-16px_var(--app-shadow)] sm:bottom-5"
      >
        Seçenekler
      </button>
    );
  }

  return (
    <aside
      aria-label="Tasarım seçenekleri"
      className={`fixed bottom-24 left-4 z-[60] flex max-h-[70vh] w-[min(340px,calc(100vw-32px))] flex-col gap-4 overflow-y-auto rounded-[22px] border border-border bg-card p-4 text-ink shadow-[0_24px_50px_-24px_var(--app-shadow)] transition-opacity sm:bottom-5 ${
        bekliyor ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-extrabold">Tasarım seçenekleri</span>
        <button
          type="button"
          onClick={() => setAcik(false)}
          aria-label="Paneli küçült"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-paper"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {(Object.keys(SECENEKLER) as (keyof Secim)[]).map((anahtar) => (
        <fieldset key={anahtar} className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-xs font-bold text-ink-muted">{ETIKETLER[anahtar].baslik}</legend>
          <div className="flex flex-wrap gap-1.5">
            {SECENEKLER[anahtar].map((deger) => {
              const secili = secim[anahtar] === deger;
              const ad = (ETIKETLER[anahtar].adlar as Record<string, string>)[deger];
              return (
                <button
                  key={deger}
                  type="button"
                  aria-pressed={secili}
                  onClick={() => sec(anahtar, deger as Secim[typeof anahtar])}
                  className={`rounded-full px-3 py-2 text-[13px] font-bold transition-colors ${
                    secili ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-border"
                  }`}
                >
                  {anahtar === "logo" || anahtar === "menu" || anahtar === "imlec" || anahtar === "hizmet"
                    ? `${deger} · ${ad}`
                    : ad}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={kopyala}
        className="rounded-full border border-border-strong px-4 py-2.5 text-[13px] font-bold hover:bg-paper"
      >
        {kopyalandi ? "Kopyalandı" : "Bu birleşimin bağlantısını kopyala"}
      </button>
    </aside>
  );
}
