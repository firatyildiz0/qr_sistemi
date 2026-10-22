"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { sifirlamaIste, type SifirlamaDurumu } from "./actions";
import { IconCheck } from "@/components/icons";

const baslangic: SifirlamaDurumu = { hata: null, gonderildi: false, deger: "" };

export default function SifremiUnuttumForm({ gecersiz }: { gecersiz: boolean }) {
  const [durum, formAction, bekliyor] = useActionState(sifirlamaIste, baslangic);

  if (durum.gonderildi) {
    return (
      <div role="status" className="space-y-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconCheck className="h-6 w-6" />
        </span>
        <p className="text-sm text-ink">
          Bu bilgilere ait bir hesap varsa, kayıtlı e-posta adresine şifre sıfırlama bağlantısı
          gönderdik. Bağlantı bir saat geçerli.
        </p>
        <p className="text-xs text-ink-muted">
          E-posta birkaç dakika içinde gelmezse gereksiz (spam) klasörüne bakın. Bağlantıyı
          isteği yaptığınız cihazda açın.
        </p>
        <Link href="/login" className="btn btn-secondary w-full">
          Girişe dön
        </Link>
      </div>
    );
  }

  return (
    // `onSubmit`: React `action`'a verilen formu hata sonrası sıfırlıyor.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const veri = new FormData(e.currentTarget);
        startTransition(() => formAction(veri));
      }}
      className="space-y-4"
    >
      {gecersiz && (
        <p role="alert" className="rounded-md bg-accent-soft px-3 py-2 text-sm text-ink">
          Sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı
          isteyin.
        </p>
      )}

      <div>
        <label htmlFor="kimlik" className="field-label">
          Kullanıcı adı veya e-posta
        </label>
        <input
          id="kimlik"
          name="kimlik"
          type="text"
          required
          defaultValue={durum.deger}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="input"
        />
      </div>

      {durum.hata && (
        <p role="alert" className="text-sm text-danger">
          {durum.hata}
        </p>
      )}

      <button type="submit" disabled={bekliyor} className="btn btn-primary w-full">
        {bekliyor ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </button>

      <p className="text-center text-sm text-ink-muted">
        Şifrenizi hatırladınız mı?{" "}
        <Link href="/login" className="link-underline font-medium text-accent">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
