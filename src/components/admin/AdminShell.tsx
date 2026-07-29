"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import MobileTabBar from "@/components/admin/MobileTabBar";
import QrScanFab from "@/components/scan/QrScanFab";
import Wordmark from "@/components/Wordmark";
import { IconBell, IconChevronLeft, IconLogOut } from "@/components/icons";
import { toggleSidebar } from "@/lib/preferences";

export type Identity = { email: string; initial: string; name: string; greeting: string };

export default function AdminShell({
  identityPromise,
  unreadCountPromise,
  signOutAction,
  children,
}: {
  identityPromise: Promise<Identity>;
  unreadCountPromise: Promise<number>;
  signOutAction: () => void;
  children: React.ReactNode;
}) {
  return (
    // `panel-scope` is where the density and corner-radius preferences take
    // effect (see globals.css). Scoping them here keeps the public pages on
    // their designed spacing while the panel follows the owner's choice.
    <div className="panel-scope flex min-h-screen bg-paper text-ink md:h-screen md:overflow-hidden">
      {/* Mobil üst çubuk. Artık bir hamburger taşımıyor — gezinme ekranın
          altındaki sekme çubuğunda. Burada kalanlar bir uygulamanın üst
          çubuğunda beklenen iki şey: kimlik ve bildirim zili. */}
      <header className="app-bar fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-deep px-4 md:hidden">
        <Link href="/admin" className="font-display text-lg font-bold tracking-tight text-white">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/admin/notifications"
            aria-label="Bildirimler"
            className="tab-press relative flex h-10 w-10 items-center justify-center rounded-full text-white/80"
          >
            <IconBell className="h-5 w-5" />
            <Suspense fallback={null}>
              <UnreadDot promise={unreadCountPromise} />
            </Suspense>
          </Link>
          <Link href="/admin/settings" aria-label="Ayarlar" className="tab-press">
            <Suspense fallback={<AvatarShell className="h-8 w-8 text-sm" />}>
              <Avatar promise={identityPromise} className="h-8 w-8 text-sm" />
            </Suspense>
          </Link>
        </div>
      </header>

      {/* Kenar çubuğu yalnızca masaüstünde. Mobilde onun yerini `MobileTabBar`
          alıyor; ikisi aynı `NAV_ITEMS` listesinden besleniyor. */}
      <aside className="sidebar relative z-auto hidden w-64 shrink-0 flex-col justify-between bg-deep transition-[width] duration-200 ease-out md:flex">
        <div>
          <div className="sidebar-head flex h-16 items-center justify-between px-6">
            <Link
              href="/admin"
              className="sidebar-label font-display text-xl font-bold tracking-tight text-white"
            >
              <Wordmark />
            </Link>
            <SidebarToggle />
          </div>

          {/* Logonun hemen altı. `sidebar-label` sayesinde rail daraldığında
              wordmark ve hesap yazısıyla birlikte kaybolur. */}
          {/* Alt boşluğu nav'ın kendi `mt-8`'i veriyor. */}
          <div className="sidebar-label px-6">
            <Suspense fallback={<GreetingFallback />}>
              <Greeting promise={identityPromise} />
            </Suspense>
          </div>

          {/* The links are in the fallback too, so navigation is available
              immediately — only the unread badge waits on its query. */}
          <Suspense fallback={<AdminSidebarNav unreadCount={0} />}>
            <SidebarNavWithBadge promise={unreadCountPromise} />
          </Suspense>
        </div>

        <div className="sidebar-foot mt-auto border-t border-white/10 p-6">
          <div className="sidebar-account flex items-center gap-3">
            <Suspense fallback={<AccountFallback />}>
              <Account promise={identityPromise} />
            </Suspense>
            <form action={signOutAction} className="sidebar-signout ml-auto">
              <button
                type="submit"
                title="Çıkış yap"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <IconLogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Üst ve alt boşluğu `.app-main` veriyor (globals.css): iki sabit çubuğun
          yüksekliği tek yerde tanımlı, burada tekrarlanmıyor. */}
      {/* `min-w-0` şart: bir flex öğesinin varsayılan `min-width: auto` değeri,
          içeriğinin en dar hâlinden daha ince olmasını engelliyor. Ayarlar'daki
          yatay kaydırmalı kategori şeridi gibi kendi içinde kayan bir öğe bunu
          718px'e kadar şişirip tüm paneli ekrandan taşırıyordu. */}
      <main className="app-main flex min-w-0 flex-1 flex-col md:h-screen md:overflow-y-auto">
        {children}
      </main>

      <MobileTabBar
        identityPromise={identityPromise}
        unreadCountPromise={unreadCountPromise}
        signOutAction={signOutAction}
      />
      <QrScanFab />
    </div>
  );
}

function UnreadDot({ promise }: { promise: Promise<number> }) {
  const count = use(promise);
  if (!count) return null;

  return (
    <span
      aria-label={`${count} okunmamış bildirim`}
      className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-deep"
    />
  );
}

const avatarClass =
  "flex items-center justify-center rounded-full border border-white/20 bg-white/10 font-semibold text-white";

function AvatarShell({ className }: { className: string }) {
  return <span className={`${avatarClass} ${className}`} aria-hidden="true" />;
}

function Avatar({ promise, className }: { promise: Promise<Identity>; className: string }) {
  const { initial } = use(promise);
  return <span className={`${avatarClass} ${className}`}>{initial}</span>;
}

/**
 * Collapses the desktop rail. The state is a cookie mirrored onto `<html>` and
 * the collapse itself is pure CSS, so there is no React state to keep in sync
 * and no flash of an expanded sidebar on reload.
 */
function SidebarToggle() {
  return (
    <button
      type="button"
      onClick={() => toggleSidebar()}
      title="Menüyü daralt / genişlet"
      aria-label="Menüyü daralt veya genişlet"
      className="sidebar-toggle hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white md:flex"
    >
      <IconChevronLeft className="sidebar-toggle-icon h-4 w-4 transition-transform duration-200" />
    </button>
  );
}

function GreetingFallback() {
  return <span className="block h-4 w-32 animate-pulse rounded bg-white/10" />;
}

function Greeting({ promise }: { promise: Promise<Identity> }) {
  const { greeting, name } = use(promise);
  return (
    <p className="truncate text-sm text-white/70">
      {greeting}, <span className="font-semibold text-white">{name}</span>
    </p>
  );
}

function AccountFallback() {
  return (
    <>
      <AvatarShell className="h-10 w-10" />
      <div className="sidebar-label flex min-w-0 flex-col gap-1.5">
        <span className="h-3.5 w-28 animate-pulse rounded bg-white/15" />
        <span className="text-xs text-white/50">Sahip</span>
      </div>
    </>
  );
}

function Account({ promise }: { promise: Promise<Identity> }) {
  const { email, initial } = use(promise);
  return (
    <>
      <span className={`${avatarClass} h-10 w-10 shrink-0`}>{initial}</span>
      <div className="sidebar-label flex min-w-0 flex-col">
        <span className="truncate text-sm text-white">{email}</span>
        <span className="text-xs text-white/50">Sahip</span>
      </div>
    </>
  );
}

function SidebarNavWithBadge({ promise }: { promise: Promise<number> }) {
  return <AdminSidebarNav unreadCount={use(promise)} />;
}
