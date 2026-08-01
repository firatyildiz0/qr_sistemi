"use client";

import { useActionState, useState } from "react";
import { signIn, verifyLoginCode, type LoginState } from "./actions";
import PendingApprovalDialog from "@/components/PendingApprovalDialog";

const initialState: LoginState = {
  error: null,
  awaitingApproval: false,
  challengeId: null,
};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  // Kapatma, o cevaba bağlı: her gönderim yeni bir state nesnesi döndürdüğü
  // için onaysız hesapla tekrar denendiğinde pencere yeniden açılıyor.
  const [dismissed, setDismissed] = useState<LoginState | null>(null);

  // Bilet süresi dolunca ya da deneme hakkı bitince kod adımından şifre adımına
  // dönülüyor. Aynı "o cevaba bağlı" düzen: yeni bir giriş denemesi yeni bir
  // state döndürdüğü için kod adımı kendiliğinden geri açılıyor.
  const [abandoned, setAbandoned] = useState<LoginState | null>(null);
  const challengeId = abandoned === state ? null : state.challengeId;

  if (challengeId) {
    return (
      <CodeForm
        challengeId={challengeId}
        onRestart={() => setAbandoned(state)}
      />
    );
  }

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

/**
 * Girişin ikinci adımı: telefona gelen kod.
 *
 * Şifre doğrulandı ama oturum henüz açılmadı — burada yalnızca bilet numarası
 * ve kod var, kullanıcı adı ile şifre bu adıma hiç taşınmıyor.
 */
function CodeForm({
  challengeId,
  onRestart,
}: {
  challengeId: string;
  onRestart: () => void;
}) {
  const [state, formAction, pending] = useActionState(verifyLoginCode, {
    error: null,
    awaitingApproval: false,
    challengeId,
  });

  // Sunucu bileti yaktıysa (`challengeId` boş döndü) girilecek bir kod kalmadı:
  // alan yerine baştan başlama düğmesi gösteriliyor.
  const burned = state.error !== null && state.challengeId === null;

  if (burned) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger">{state.error}</p>
        <button type="button" onClick={onRestart} className="btn btn-primary w-full">
          Baştan giriş yap
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="challengeId" value={challengeId} />

      <div>
        <label htmlFor="code" className="field-label">
          Telefonunuza gelen kod
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          autoFocus
          // Telefonda sayı tuş takımı açılsın; kod yalnızca rakamdan oluşuyor.
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          className="input text-center text-lg tracking-[0.5em]"
        />
        <p className="mt-2 text-xs text-ink-muted">
          Yönetim paneline girmek için telefonunuza gönderdiğimiz 6 haneli kodu
          girin. Kod 5 dakika geçerli.
        </p>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Doğrulanıyor…" : "Doğrula ve gir"}
      </button>

      <button
        type="button"
        onClick={onRestart}
        className="link-underline w-full text-center text-xs font-medium text-ink-muted"
      >
        Baştan giriş yap
      </button>
    </form>
  );
}
