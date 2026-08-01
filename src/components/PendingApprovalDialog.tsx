"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClock, IconLogOut, IconX } from "@/components/icons";

export type PendingApprovalOrigin = "signup" | "login";

const COPY: Record<PendingApprovalOrigin, { eyebrow: string; title: string; message: string }> = {
  signup: {
    eyebrow: "Kaydınız alındı",
    title: "Onay bekleniyor",
    message:
      "Hesabınız oluşturuldu ve yöneticinin onayına düştü. Onaylandığı anda kullanıcı adınız ve şifrenizle giriş yapabilirsiniz.",
  },
  login: {
    eyebrow: "Hesap durumu",
    title: "Onay bekleniyor",
    message:
      "Bilgileriniz doğru, ancak hesabınız henüz onaylanmadı. Onay tamamlandığında aynı bilgilerle giriş yapabilirsiniz.",
  },
};

/**
 * Kayıt `pending` doğuyor (bkz. profiles.status), yani üye olan kişi hemen
 * giremiyor. Bunu satır altındaki tek bir cümle yerine burada gösteriyoruz:
 * hem üye olduktan sonra hem de onaysız hesapla giriş denendiğinde aynı pencere
 * çıkıyor, böylece "kaydoldum ama giremiyorum" ikinci denemede de aynı yanıtı
 * veriyor.
 */
export default function PendingApprovalDialog({
  open,
  origin,
  onClose,
}: {
  open: boolean;
  origin: PendingApprovalOrigin;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

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

  const copy = COPY[origin];

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-approval-title"
        aria-describedby="pending-approval-message"
        className="modal-panel card relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <IconX className="h-4 w-4" />
        </button>

        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-accent-soft bg-accent-soft text-accent-hover">
          <IconClock className="h-6 w-6" />
        </span>

        <span className="eyebrow text-accent">{copy.eyebrow}</span>
        <h2
          id="pending-approval-title"
          className="mt-2 pr-10 text-xl font-bold tracking-tight text-ink"
        >
          {copy.title}
        </h2>
        <p
          id="pending-approval-message"
          className="mt-2 text-sm leading-relaxed text-ink-muted"
        >
          {copy.message}
        </p>

        <ol className="mt-6 space-y-3 border-t border-border pt-5">
          <Step state="done" icon={<IconCheck className="h-3.5 w-3.5" />} label="Hesap oluşturuldu">
            Bilgileriniz kaydedildi.
          </Step>
          <Step
            state="current"
            icon={<IconClock className="h-3.5 w-3.5" />}
            label="Yönetici onayı"
          >
            Şu anda bu adımdasınız.
          </Step>
          <Step
            state="todo"
            icon={<IconLogOut className="h-3.5 w-3.5" />}
            label="Panele giriş"
          >
            Onaydan sonra bu sayfadan giriş yapın.
          </Step>
        </ol>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="btn btn-primary mt-7 w-full"
        >
          Anladım
        </button>
      </div>
    </div>,
    document.body
  );
}

const stepStyles = {
  done: {
    badge: "border-transparent bg-accent text-white",
    label: "text-ink",
  },
  current: {
    badge: "border-accent bg-accent-soft text-accent-hover",
    label: "text-ink font-semibold",
  },
  todo: {
    badge: "border-border bg-surface text-ink-muted",
    label: "text-ink-muted",
  },
} as const;

function Step({
  state,
  icon,
  label,
  children,
}: {
  state: keyof typeof stepStyles;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const styles = stepStyles[state];

  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${styles.badge}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm leading-tight ${styles.label}`}>{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{children}</span>
      </span>
    </li>
  );
}
