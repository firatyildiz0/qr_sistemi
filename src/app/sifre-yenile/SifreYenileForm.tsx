"use client";

import { startTransition, useActionState } from "react";
import { sifreyiYenile, type YenilemeDurumu } from "./actions";
import PasswordField from "@/components/PasswordField";

const baslangic: YenilemeDurumu = { hata: null };

export default function SifreYenileForm() {
  const [durum, formAction, bekliyor] = useActionState(sifreyiYenile, baslangic);

  return (
    // `onSubmit`: React `action`'a verilen formu hata sonrası sıfırlıyor;
    // şifre alanının canlı kontrol listesi içeride eski değeri tutardı.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const veri = new FormData(e.currentTarget);
        startTransition(() => formAction(veri));
      }}
      className="space-y-4"
    >
      <PasswordField label="Yeni şifre" />

      <div>
        <label htmlFor="password-tekrar" className="field-label">
          Yeni şifre (tekrar)
        </label>
        <input
          id="password-tekrar"
          name="password_tekrar"
          type="password"
          required
          autoComplete="new-password"
          className="input"
        />
      </div>

      {durum.hata && (
        <p role="alert" className="text-sm text-danger">
          {durum.hata}
        </p>
      )}

      <button type="submit" disabled={bekliyor} className="btn btn-primary w-full">
        {bekliyor ? "Kaydediliyor…" : "Şifreyi kaydet"}
      </button>
    </form>
  );
}
