"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconLogOut, IconSettings, IconUser } from "@/components/icons";

/**
 * Profile dokununca açılan küçük menü: Hesabım, Ayarlar, Çıkış.
 *
 * Masaüstünde kenar çubuğunun dibindeki hesap satırı yukarı doğru, mobilde üst
 * çubuktaki avatar aşağı doğru açıyor. Dışarı tıklamak ya da Escape kapatıyor.
 */
export default function ProfilMenusu({
  children,
  yon,
  signOutAction,
  etiket = "Profil menüsü",
  className = "",
}: {
  children: React.ReactNode;
  yon: "yukari" | "asagi";
  signOutAction: () => void;
  etiket?: string;
  className?: string;
}) {
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;

    const disari = (e: PointerEvent) => {
      if (!kutuRef.current?.contains(e.target as Node)) setAcik(false);
    };
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };

    document.addEventListener("pointerdown", disari);
    window.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", disari);
      window.removeEventListener("keydown", tus);
    };
  }, [acik]);

  const kapat = () => setAcik(false);

  return (
    <div ref={kutuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={etiket}
        className="tab-press flex w-full min-w-0 items-center gap-3 rounded-full text-left"
      >
        {children}
      </button>

      {acik && (
        <div
          role="menu"
          className={`absolute z-50 w-52 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg ${
            yon === "yukari" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"
          }`}
        >
          <Link
            href="/admin/hesabim"
            role="menuitem"
            onClick={kapat}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-accent-soft hover:text-accent-hover"
          >
            <IconUser className="h-4 w-4" />
            Hesabım
          </Link>
          <Link
            href="/admin/settings"
            role="menuitem"
            onClick={kapat}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-accent-soft hover:text-accent-hover"
          >
            <IconSettings className="h-4 w-4" />
            Ayarlar
          </Link>
          <form action={signOutAction} className="border-t border-border pt-1 mt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-danger-soft"
            >
              <IconLogOut className="h-4 w-4" />
              Çıkış yap
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
