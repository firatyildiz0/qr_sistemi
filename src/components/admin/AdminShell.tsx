"use client";

import Link from "next/link";
import { Suspense, use, useState } from "react";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import QrScanFab from "@/components/scan/QrScanFab";
import Wordmark from "@/components/Wordmark";
import { IconChevronLeft, IconLogOut, IconMenu, IconX } from "@/components/icons";
import { toggleSidebar } from "@/lib/preferences";

export type Identity = { email: string; initial: string };

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
  const [open, setOpen] = useState(false);

  return (
    // `panel-scope` is where the density and corner-radius preferences take
    // effect (see globals.css). Scoping them here keeps the public pages on
    // their designed spacing while the panel follows the owner's choice.
    <div className="panel-scope flex min-h-screen bg-paper text-ink md:h-screen md:overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-deep px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="font-display text-lg font-bold tracking-tight text-white">
          <Wordmark />
        </Link>
        <Suspense fallback={<AvatarShell className="h-8 w-8 text-sm" />}>
          <Avatar promise={identityPromise} className="h-8 w-8 text-sm" />
        </Suspense>
      </header>

      {open && (
        <div
          // Not `bg-ink/50`: --color-ink is near-white in the dark theme, which
          // would turn this scrim into a white veil.
          className="fixed inset-0 z-40 bg-(--app-backdrop) md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between bg-deep transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 md:transition-[width,transform] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="sidebar-head flex h-16 items-center justify-between px-6">
            <Link
              href="/admin"
              className="sidebar-label font-display text-xl font-bold tracking-tight text-white"
            >
              <Wordmark />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
              className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white md:hidden"
            >
              <IconX className="h-4 w-4" />
            </button>
            <SidebarToggle />
          </div>
          <div onClick={() => setOpen(false)}>
            {/* The links are in the fallback too, so navigation is available
                immediately — only the unread badge waits on its query. */}
            <Suspense fallback={<AdminSidebarNav unreadCount={0} />}>
              <SidebarNavWithBadge promise={unreadCountPromise} />
            </Suspense>
          </div>
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

      <main className="flex flex-1 flex-col pt-14 md:h-screen md:overflow-y-auto md:pt-0">
        {children}
      </main>

      <QrScanFab />
    </div>
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
