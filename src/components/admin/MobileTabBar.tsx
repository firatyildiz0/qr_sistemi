"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import QrScanSheet from "@/components/scan/QrScanSheet";
import { NAV_ITEMS, isActive, type NavItem } from "@/components/admin/nav";
import type { Identity } from "@/components/admin/AdminShell";
import { IconChevronRight, IconLogOut, IconMenu, IconScan, IconX } from "@/components/icons";

const PRIMARY = NAV_ITEMS.filter((item) => item.primary);
const SECONDARY = NAV_ITEMS.filter((item) => !item.primary);

/**
 * Mobilin ana gezinme yüzeyi: yerli uygulamalardaki gibi ekranın altına
 * sabitlenmiş bir sekme çubuğu. Masaüstündeki kenar çubuğunun mobil karşılığı
 * bir hamburger menü değil, çünkü menünün arkasına saklanan özellik
 * kullanılmıyor — burada en sık kullanılan üç ekran ve QR tarayıcı doğrudan
 * parmağın altında duruyor, kalanlar da tek dokunuşla açılan "Menü"de.
 *
 * Sekmelerin ortasındaki yükseltilmiş düğme panelin asıl işi olan QR okutmayı
 * taşıyor; bu yüzden dört sekmenin arasında değil, onların üstünde duruyor.
 */
export default function MobileTabBar({
  identityPromise,
  unreadCountPromise,
  signOutAction,
}: {
  identityPromise: Promise<Identity>;
  unreadCountPromise: Promise<number>;
  signOutAction: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const menuActive = SECONDARY.some((item) => isActive(item, pathname));

  return (
    <>
      <nav
        aria-label="Ana menü"
        className="tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-stretch">
          <TabLink item={PRIMARY[0]} active={isActive(PRIMARY[0], pathname)} />
          <TabLink item={PRIMARY[1]} active={isActive(PRIMARY[1], pathname)} />

          {/* Ortadaki yuva boş: düğme kendisi çubuğun üstüne taşıyor. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              aria-label="QR okut"
              className="tab-press absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-5 flex-col items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_20px_-6px_var(--app-shadow)] ring-4 ring-card"
            >
              <IconScan className="h-6 w-6" />
            </button>
            <span className="absolute inset-x-0 bottom-2.5 text-center text-[10px] font-semibold text-ink-muted">
              QR okut
            </span>
          </div>

          <TabLink item={PRIMARY[2]} active={isActive(PRIMARY[2], pathname)} />

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={`tab-press relative flex flex-col items-center justify-center gap-1 ${
              menuActive ? "text-accent" : "text-ink-muted"
            }`}
          >
            <span className="relative">
              <IconMenu className="h-5 w-5" />
              <Suspense fallback={null}>
                <UnreadDot promise={unreadCountPromise} />
              </Suspense>
            </span>
            <span className="text-[10px] font-semibold">Menü</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <MenuSheet
          identityPromise={identityPromise}
          unreadCountPromise={unreadCountPromise}
          signOutAction={signOutAction}
          pathname={pathname}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {scanOpen && <QrScanSheet onClose={() => setScanOpen(false)} />}
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`tab-press relative flex flex-col items-center justify-center gap-1 ${
        active ? "text-accent" : "text-ink-muted"
      }`}
    >
      {/* Aktif sekmenin üstündeki çizgi: renk körlüğünde de sekme ayırt edilsin. */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-accent"
        />
      )}
      <item.icon className="h-5 w-5" />
      {/* Dar sekmede ad kırpılır, alt satıra taşıp çubuğu bozmaz. */}
      <span className="max-w-full truncate px-1 text-[10px] font-semibold">
        {item.shortLabel ?? item.label}
      </span>
      <TabPendingBar />
    </Link>
  );
}

/**
 * Dokunma ile yeni sayfanın gelmesi arasındaki boşluğu dolduruyor. Sekmeye
 * basıldığında hiçbir şey olmadıysa kullanıcı ikinci kez basar; bu ince çubuk
 * isteğin yolda olduğunu söylüyor.
 */
function TabPendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden="true"
      className="nav-spinner absolute bottom-1.5 h-1 w-1 rounded-full bg-accent"
    />
  );
}

function UnreadDot({ promise }: { promise: Promise<number> }) {
  const count = use(promise);
  if (!count) return null;

  return (
    <span
      aria-label={`${count} okunmamış bildirim`}
      className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card"
    />
  );
}

/**
 * "Menü" sekmesinin açtığı alt sayfa. Sekme çubuğuna sığmayan her ekran —
 * istatistik, bildirimler, destek, ayarlar — ve hesap satırı burada; hiçbir
 * özellik keşfedilemez bir yerde kalmıyor.
 */
function MenuSheet({
  identityPromise,
  unreadCountPromise,
  signOutAction,
  pathname,
  onClose,
}: {
  identityPromise: Promise<Identity>;
  unreadCountPromise: Promise<number>;
  signOutAction: () => void;
  pathname: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menü"
      className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
    >
      <div className="modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="modal-panel safe-b relative z-10 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card px-4 pb-4 pt-3">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border-strong"
        />

        <div className="mb-4 flex items-center gap-3 rounded-lg bg-surface p-3">
          <Suspense fallback={<AccountRowFallback />}>
            <AccountRow promise={identityPromise} />
          </Suspense>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col">
          {SECONDARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`tab-press flex items-center gap-3 rounded-lg px-2 py-3.5 ${
                isActive(item, pathname) ? "text-accent" : "text-ink"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="text-[15px] font-semibold">{item.label}</span>
              {item.unread && (
                <Suspense fallback={null}>
                  <UnreadPill promise={unreadCountPromise} />
                </Suspense>
              )}
              <IconChevronRight className="ml-auto h-4 w-4 text-ink-muted" />
            </Link>
          ))}
        </div>

        <form action={signOutAction} className="mt-2 border-t border-border pt-3">
          <button
            type="submit"
            className="tab-press flex w-full items-center gap-3 rounded-lg px-2 py-3.5 text-left text-[15px] font-semibold text-danger"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
              <IconLogOut className="h-5 w-5" />
            </span>
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  );
}

function UnreadPill({ promise }: { promise: Promise<number> }) {
  const count = use(promise);
  if (!count) return null;

  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function AccountRowFallback() {
  return (
    <>
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-border" />
      <span className="h-4 w-32 animate-pulse rounded bg-border" />
    </>
  );
}

function AccountRow({ promise }: { promise: Promise<Identity> }) {
  const { email, initial, name, greeting } = use(promise);
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-white">
        {initial}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-ink">
          {greeting}, {name}
        </span>
        <span className="truncate text-xs text-ink-muted">{email}</span>
      </span>
    </>
  );
}
