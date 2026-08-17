"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startCheckout, type CheckoutState } from "./actions";
import CheckoutFrame from "./CheckoutFrame";
import { PROVINCES } from "@/lib/turkiye";
import { IconShield } from "@/components/icons";

const INITIAL: CheckoutState = { error: null };

const FIELD =
  "w-full rounded-[--radius-md] border border-border bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-muted";

const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full">
      {pending ? "Ödeme formu hazırlanıyor…" : "Ödemeye geç"}
    </button>
  );
}

/**
 * Fatura bilgileri formu, ardından iyzico'nun ödeme formu.
 *
 * İki aşama tek ekranda: bilgiler gönderilince sunucu iyzico'dan bir form
 * parçacığı alıyor ve aşağıdaki `CheckoutFrame` onu yerleştiriyor. Kart
 * bilgisi bu forma **girilmiyor** — o alanlar iyzico'nun kendi formunda,
 * dolayısıyla kart numarası hiçbir zaman bizim sunucumuzdan geçmiyor.
 *
 * Neden bu alanlar isteniyor: iyzico abonelik başlatmak için fatura kimliği
 * (ad, TC kimlik, telefon, adres) zorunlu tutuyor. Hiçbiri bizim
 * veritabanımıza yazılmıyor, doğrudan iyzico'ya gidiyor.
 */
export default function SubscribeForm({ nonce }: { nonce?: string }) {
  const [state, action] = useActionState(startCheckout, INITIAL);

  // Form parçacığı geldi: artık bilgileri değil ödeme formunu göster.
  if (state.content) {
    return <CheckoutFrame content={state.content} nonce={nonce} />;
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-[--radius-md] border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL}>
            Ad
          </label>
          <input id="name" name="name" required autoComplete="given-name" className={FIELD} />
        </div>

        <div>
          <label htmlFor="surname" className={LABEL}>
            Soyad
          </label>
          <input
            id="surname"
            name="surname"
            required
            autoComplete="family-name"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="identity_number" className={LABEL}>
            TC kimlik no
          </label>
          <input
            id="identity_number"
            name="identity_number"
            required
            inputMode="numeric"
            maxLength={11}
            pattern="[0-9]{11}"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="gsm" className={LABEL}>
            Telefon
          </label>
          <input
            id="gsm"
            name="gsm"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="5xx xxx xx xx"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="city" className={LABEL}>
          İl
        </label>
        <select id="city" name="city" required defaultValue="" className={FIELD}>
          <option value="" disabled>
            Seçin
          </option>
          {PROVINCES.map((province) => (
            <option key={province.name} value={province.name}>
              {province.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="address" className={LABEL}>
          Fatura adresi
        </label>
        <textarea
          id="address"
          name="address"
          required
          rows={2}
          maxLength={300}
          autoComplete="street-address"
          className={`${FIELD} resize-none`}
        />
      </div>

      <Submit />

      <p className="flex items-start gap-2 text-xs text-ink-muted">
        <IconShield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Kart bilgileriniz iyzico&apos;nun güvenli formuna giriliyor ve bize hiçbir
          zaman ulaşmıyor. Abonelik yalnızca <strong>kredi kartı</strong> ile
          başlatılabiliyor; banka kartları tekrarlayan ödemeyi desteklemiyor.
        </span>
      </p>
    </form>
  );
}
