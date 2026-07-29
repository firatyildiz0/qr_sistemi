"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export type AuthMode = "login" | "signup";

const COPY: Record<AuthMode, { eyebrow: string; title: string; description: string }> = {
  login: {
    eyebrow: "Satıcı girişi",
    title: "Giriş yap",
    description: "Kiralama ürünlerinizi ve rezervasyonlarınızı yönetin.",
  },
  signup: {
    eyebrow: "Satıcı kaydı",
    title: "Üye ol",
    description: "E-posta, kullanıcı adı ve şifrenizle hesabınızı oluşturun.",
  },
};

/**
 * Giriş ve üye ol tek ekranda. Formlar sekme değişince sökülüp yeniden
 * kuruluyor — böylece bir formun hata mesajı diğerine taşınmıyor.
 */
export default function AuthPanel({
  next,
  initialMode = "login",
}: {
  next: string;
  initialMode?: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const copy = COPY[mode];

  return (
    <div className="w-full max-w-sm">
      <div className="auth-tabs" role="tablist" aria-label="Giriş yap veya üye ol">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`auth-tab-${value}`}
            aria-selected={mode === value}
            aria-controls="auth-panel"
            className="auth-tab"
            onClick={() => setMode(value)}
          >
            {COPY[value].title}
          </button>
        ))}
      </div>

      <div
        key={mode}
        id="auth-panel"
        role="tabpanel"
        aria-labelledby={`auth-tab-${mode}`}
        className="fade-slide-up mt-8"
      >
        <span className="eyebrow text-accent">{copy.eyebrow}</span>
        <h2 className="mt-2 mb-1 text-xl font-semibold text-ink">{copy.title}</h2>
        <p className="mb-6 text-sm text-ink-muted">{copy.description}</p>

        {/* Kayıt onay beklediği için `next`in karşılığı yok: üye olan kişi
            hiçbir sayfaya gitmiyor, onay mesajını görüyor. */}
        {mode === "login" ? <LoginForm next={next} /> : <SignupForm />}
      </div>
    </div>
  );
}
