"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/app/admin/notifications/actions";

export default function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (disabled) return null;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
      className="link-underline text-sm font-medium text-ink-muted hover:text-accent-hover disabled:opacity-50"
    >
      Tümünü okundu işaretle
    </button>
  );
}
