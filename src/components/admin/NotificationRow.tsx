"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationRead } from "@/app/admin/notifications/actions";
import { IconClock, IconInbox } from "@/components/icons";
import { useDuzen } from "@/components/admin/kapak/duzen";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

export default function NotificationRow({
  id,
  href,
  kind,
  productName,
  message,
  isRead,
  createdAt,
  delay = 0,
}: {
  id: string;
  /** Bildirimin götürdüğü ekran; türüne göre değişiyor. */
  href: string;
  kind: "iade" | "talep";
  productName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  delay?: number;
}) {
  const [, startTransition] = useTransition();
  const talep = kind === "talep";
  const duzen = useDuzen();

  // GEÇİCİ karşılaştırma hâlleri (bkz. kapak/duzen.ts). Ürünün adı mesajın
  // içinde zaten geçiyor; altında ikinci kez yazılmıyor. Okunmamışı kırmızı
  // şerit ve renkli zemin değil, tek bir nokta işaret ediyor.
  if (duzen !== "mevcut") {
    const kompakt = duzen === "kompakt";
    return (
      <li className="fade-slide-up" style={{ animationDelay: `${delay}ms` }}>
        <Link
          href={href}
          onClick={() => {
            if (!isRead) startTransition(() => markNotificationRead(id));
          }}
          className={`flex items-center gap-3 rounded-2xl px-3 transition-colors hover:bg-surface ${kompakt ? "py-2.5" : "py-3.5"}`}
        >
          <span
            aria-label={isRead ? undefined : "Okunmadı"}
            className={`h-2 w-2 shrink-0 rounded-full ${isRead ? "bg-transparent" : "bg-accent"}`}
          />
          <p
            className={`m-0 min-w-0 flex-1 text-sm ${kompakt ? "truncate" : "line-clamp-2"} ${
              isRead ? "text-ink-muted" : "font-semibold text-ink"
            }`}
          >
            {message}
          </p>
          <span className="shrink-0 whitespace-nowrap text-xs text-ink-muted">{relativeTime(createdAt)}</span>
        </Link>
      </li>
    );
  }

  return (
    <li
      className={`fade-slide-up border-b border-border last:border-0 ${
        isRead ? "bg-transparent" : "border-l-[3px] border-l-accent bg-accent-soft/30"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link
        href={href}
        onClick={() => {
          if (!isRead) startTransition(() => markNotificationRead(id));
        }}
        className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-surface sm:gap-4 sm:px-6"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            talep ? "bg-accent-soft text-accent" : "bg-warning/15 text-warning"
          }`}
        >
          {talep ? <IconInbox className="h-4 w-4" /> : <IconClock className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${isRead ? "text-ink-muted" : "font-semibold text-ink"}`}>
            {message}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{productName}</p>
          <span className="mt-1 block text-xs text-ink-muted sm:hidden">
            {relativeTime(createdAt)}
          </span>
        </div>
        <span className="hidden shrink-0 whitespace-nowrap text-xs text-ink-muted sm:block">
          {relativeTime(createdAt)}
        </span>
      </Link>
    </li>
  );
}
