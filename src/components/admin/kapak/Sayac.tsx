"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sıfırdan hedefe sayan rakam. Ekrana girdiği an başlıyor, bir kez.
 *
 * Sunucu ilk boyamada gerçek sayıyı yazıyor: JavaScript yüklenmeden ya da
 * hareket kapalıyken ekranda "0" durmasın. Sayma yalnızca hareket açıkken ve
 * eleman göründüğünde, sayıyı bir an sıfıra çekip yeniden yukarı taşıyor.
 */
export default function Sayac({ hedef, sure = 1400 }: { hedef: number; sure?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [deger, setDeger] = useState(hedef);

  useEffect(() => {
    const el = ref.current;
    if (!el || hedef === 0) return;
    const azalt =
      document.documentElement.dataset.motion === "reduced" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (azalt) return;

    let kare = 0;
    const gozlem = new IntersectionObserver(
      ([giris]) => {
        if (!giris.isIntersecting) return;
        gozlem.disconnect();
        const bas = performance.now();
        const adim = (simdi: number) => {
          const ilerleme = Math.min(1, (simdi - bas) / sure);
          setDeger(Math.round(hedef * (1 - Math.pow(1 - ilerleme, 3))));
          if (ilerleme < 1) kare = requestAnimationFrame(adim);
        };
        kare = requestAnimationFrame(adim);
      },
      { threshold: 0.3 },
    );
    gozlem.observe(el);
    return () => {
      gozlem.disconnect();
      cancelAnimationFrame(kare);
    };
  }, [hedef, sure]);

  return (
    <span ref={ref} className="tabular-nums">
      {deger.toLocaleString("tr-TR")}
    </span>
  );
}
