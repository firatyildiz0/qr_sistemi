"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kaydırınca ekrana giren bölümü yukarı kaydırarak belirtiyor.
 *
 * Gizli başlangıç hâli bileşende değil CSS'te (`.belir`, kapak.css): hareket
 * kapalıyken o kural hiç uygulanmıyor ve içerik doğrudan görünüyor. Burada
 * tutulan tek şey "ekrana girdi mi" bilgisi.
 */
export default function Belir({
  children,
  gecikme = 0,
  className = "",
}: {
  children: React.ReactNode;
  gecikme?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [gorundu, setGorundu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const gozlem = new IntersectionObserver(
      ([giris]) => {
        if (!giris.isIntersecting) return;
        setGorundu(true);
        gozlem.disconnect();
      },
      { threshold: 0.12 },
    );
    gozlem.observe(el);
    return () => gozlem.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-gorundu={gorundu ? "" : undefined}
      className={`belir ${className}`}
      style={{ "--belir-gecikme": `${gecikme}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
