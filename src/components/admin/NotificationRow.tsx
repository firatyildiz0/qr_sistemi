"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationRead } from "@/app/admin/notifications/actions";
import { IconClock } from "@/components/icons";

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
  productId,
  productName,
  message,
  isRead,
  createdAt,
  delay = 0,
}: {
  id: string;
  productId: string;
  productName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  delay?: number;
}) {
  const [, startTransition] = useTransition();

  return (
    <li
      className={`fade-slide-up border-b border-border last:border-0 ${
        isRead ? "bg-transparent" : "border-l-[3px] border-l-accent bg-accent-soft/30"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link
        href={`/admin/products/${productId}`}
        onClick={() => {
          if (!isRead) startTransition(() => markNotificationRead(id));
        }}
        className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-surface sm:gap-4 sm:px-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <IconClock className="h-4 w-4" />
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
