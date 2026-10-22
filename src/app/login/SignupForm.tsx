"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { signUp, type SignupState } from "./actions";
import { USERNAME_RULE } from "@/lib/username";
import PasswordField from "@/components/PasswordField";

const initialState: SignupState = { error: null, notice: null };

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    // `action={formAction}` yerine `onSubmit`: React, `action`'a verilen formu
    // gönderimden sonra sıfırlıyor; hata dönünce e-posta ve kullanıcı adı silinir, şifre kutusu ise ekranda boş görünürken içeride eski değeri tutardı.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const veri = new FormData(e.currentTarget);
        startTransition(() => formAction(veri));
      }}
      className="space-y-4"
    >
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

      {/* KVKK m.10: aydınlatma veri alınmadan önce yapılmalı. Onay kutusu
          değil, bilgi: işleme sözleşmeye dayanıyor, açık rızaya değil. */}
      <p className="text-center text-xs text-ink-muted">
        Üye olurken verdiğiniz bilgilerin nasıl işlendiği{" "}
        <Link href="/gizlilik" target="_blank" className="link-underline text-accent">
          Gizlilik Sözleşmesi
        </Link>
        &apos;nde anlatılır.
      </p>
    </form>
  );
}
