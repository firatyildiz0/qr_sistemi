"use client";

import { useActionState, useState } from "react";
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
