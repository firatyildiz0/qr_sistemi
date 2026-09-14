"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp, type SignupState } from "./actions";
import { USERNAME_RULE } from "@/lib/username";
import PasswordField from "@/components/PasswordField";
import PendingApprovalDialog from "@/components/PendingApprovalDialog";

const initialState: SignupState = { error: null, notice: null, awaitingApproval: false };

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  // Bkz. LoginForm: kapatma tek bir cevaba bağlanıyor.
  const [dismissed, setDismissed] = useState<SignupState | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="signup-email" className="field-label">
          E-posta
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="signup-username" className="field-label">
          Kullanıcı adı
        </label>
        <input
          id="signup-username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]{3,20}"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="input"
        />
        <p className="mt-1.5 text-xs text-ink-muted">{USERNAME_RULE}</p>
      </div>

      <PasswordField />

      {/* Sözleşme yeni sekmede açılıyor: aynı sekmede açılsaydı yazılmış form
          kaybolurdu. Aydınlatma metni onay kutusunun dışında — KVKK'da
          aydınlatma bir bilgilendirme, kabul ettirilecek bir şey değil. */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            name="uyelik_sozlesmesi"
            required
            className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer accent-accent"
          />
          <span>
            <Link
              href="/uyelik-sozlesmesi"
              target="_blank"
              className="link-underline font-medium text-accent"
            >
              Üyelik Sözleşmesi
            </Link>
            ’ni okudum ve kabul ediyorum.
          </span>
        </label>
        <p className="text-xs text-ink-muted">
          Kişisel verileriniz{" "}
          <Link href="/kvkk" target="_blank" className="link-underline font-medium text-accent">
            KVKK Aydınlatma Metni
          </Link>{" "}
          kapsamında işlenir.
        </p>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="text-sm text-ink">{state.notice}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Hesap oluşturuluyor…" : "Üye ol"}
      </button>

      <PendingApprovalDialog
        open={state.awaitingApproval && dismissed !== state}
        origin="signup"
        onClose={() => setDismissed(state)}
      />
    </form>
  );
}
