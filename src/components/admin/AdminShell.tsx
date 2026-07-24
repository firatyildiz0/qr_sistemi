"use client";

import Link from "next/link";
import { useState } from "react";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { IconLogOut, IconMenu, IconX } from "@/components/icons";

export default function AdminShell({
  email,
  initial,
  unreadCount,
  signOutAction,
  children,
}: {
  email: string;
  initial: string;
  unreadCount: number;
  signOutAction: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper text-ink md:h-screen md:overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-deep px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-white">
          RentQR
        </Link>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white">
          {initial}
        </span>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between bg-deep transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex h-16 items-center justify-between px-6">
            <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
              RentQR
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
              className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white md:hidden"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div onClick={() => setOpen(false)}>
            <AdminSidebarNav unreadCount={unreadCount} />
          </div>
        </div>

        <div className="mt-auto border-t border-white/10 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 font-semibold text-white">
              {initial}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-white">{email}</span>
              <span className="text-xs text-white/50">Sahip</span>
            </div>
            <form action={signOutAction} className="ml-auto">
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
    </div>
  );
}
