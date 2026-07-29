"use client";

import { useState, useTransition } from "react";
import { approveUser, rejectUser } from "@/app/yonetim/actions";
import { IconCheck, IconX } from "@/components/icons";
import type { ProfileStatus } from "@/lib/profile";

/**
 * Onaylama/reddetme düğmeleri. Reddetmek hesabı silmiyor: kayıt `rejected`
 * olarak listede kalıyor, superuser fikir değiştirirse tek tıkla onaylıyor.
 */
export default function UserActions({
  userId,
  status,
}: {
  userId: string;
  status: ProfileStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action(userId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex gap-2">
        {status !== "approved" && (
          <button
            type="button"
            onClick={() => run(approveUser)}
            disabled={pending}
            className="btn btn-primary h-10 min-h-10 px-4 text-sm"
          >
            <IconCheck className="h-4 w-4" />
            Onayla
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            onClick={() => run(rejectUser)}
            disabled={pending}
            className="btn btn-danger-ghost h-10 min-h-10 px-4 text-sm"
          >
            <IconX className="h-4 w-4" />
            Reddet
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
