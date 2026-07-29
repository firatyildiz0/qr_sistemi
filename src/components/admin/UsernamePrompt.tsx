"use client";

import { use, useActionState, useEffect } from "react";
import { createPortal } from "react-dom";
import { setUsername, type UsernameState } from "@/app/admin/actions";
import { USERNAME_RULE } from "@/lib/username";
import type { Profile } from "@/lib/profile";

const initialState: UsernameState = { error: null };

/**
 * Kullanıcı adı e-postadan türetilmiş satıcılara girişten sonra kendi adını
 * sorar. Kapatma yolu bilerek yok: satıcı giriş ekranında yazacağı adı
 * bilmiyor, pencere atlanabilir olsaydı bir daha hiç belirlemezdi. Kayıt
 * başarılı olunca layout yenilenir, `usernameAuto` düşer ve pencere kendi
 * kendine kaybolur.
 */
export default function UsernamePrompt({ profilePromise }: { profilePromise: Promise<Profile | null> }) {
  const profile = use(profilePromise);
  const pending = profile?.usernameAuto ?? false;
  const [state, formAction, submitting] = useActionState(setUsername, initialState);

  useEffect(() => {
    if (!pending) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [pending]);

  if (!pending || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="username-prompt-title"
        aria-describedby="username-prompt-message"
        className="modal-panel card relative w-full max-w-md p-6 sm:p-8"
      >
        <h2 id="username-prompt-title" className="text-xl font-bold tracking-tight text-ink">
          Kullanıcı adınızı belirleyin
        </h2>
        <p id="username-prompt-message" className="mt-2 text-sm leading-relaxed text-ink-muted">
          Hesabınız kullanıcı adı istenmeden önce açılmış, bu yüzden size geçici bir ad atandı:{" "}
          <span className="font-medium text-ink">{profile?.username}</span>. Bundan sonra giriş
          yaparken kullanacağınız adı şimdi seçin — sonradan değiştirilemez.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-username" className="field-label">
              Kullanıcı adı
            </label>
            <input
              id="new-username"
              name="username"
              type="text"
              required
              autoFocus
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

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
