"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@/components/icons";

export type ConfirmTone = "danger" | "accent";

const toneStyles: Record<ConfirmTone, { badge: string; button: string }> = {
  danger: {
    badge: "border-danger-border bg-danger-soft text-danger",
    button: "btn-danger",
  },
  accent: {
    badge: "border-accent-soft bg-accent-soft text-accent-hover",
    button: "btn-primary",
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Vazgeç",
  tone = "danger",
  icon,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Reset any previous error when the dialog is (re)opened or closed.
  if (wasOpen !== open) {
    setWasOpen(open);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const tones = toneStyles[tone];

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "İşlem tamamlanamadı. Lütfen tekrar deneyin.");
      }
    });
  }

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="modal-panel card relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Kapat"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
        >
          <IconX className="h-4 w-4" />
        </button>

        {icon && (
          <span
            className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full border ${tones.badge}`}
          >
            {icon}
          </span>
        )}

        <h2 id="confirm-dialog-title" className="pr-10 text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        <div id="confirm-dialog-message" className="mt-2 text-sm leading-relaxed text-ink-muted">
          {message}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-secondary sm:min-w-28"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirm}
            disabled={pending}
            className={`btn ${tones.button} sm:min-w-28`}
          >
            {pending ? (pendingLabel ?? "İşleniyor…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
