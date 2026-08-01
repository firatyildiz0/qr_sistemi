"use client";

import { useActionState, useState } from "react";
import { signIn, type LoginState } from "./actions";
import PendingApprovalDialog from "@/components/PendingApprovalDialog";

const initialState: LoginState = { error: null, awaitingApproval: false };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  // Kapatma, o cevaba bağlı: her gönderim yeni bir state nesnesi döndürdüğü
  // için onaysız hesapla tekrar denendiğinde pencere yeniden açılıyor.
  const [dismissed, setDismissed] = useState<LoginState | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="username" className="field-label">
          Kullanıcı adı veya e-posta
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="input"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="field-label">
            Şifre
          </label>
          <a href="#" className="link-underline mb-1.5 text-xs font-medium text-ink-muted">
            Şifremi unuttum
          </a>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>

      <PendingApprovalDialog
        open={state.awaitingApproval && dismissed !== state}
        origin="login"
        onClose={() => setDismissed(state)}
      />
    </form>
  );
}
