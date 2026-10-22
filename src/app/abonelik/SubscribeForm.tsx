"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { startCheckout, type CheckoutState } from "./actions";
import CheckoutFrame from "./CheckoutFrame";
import { PROVINCES } from "@/lib/turkiye";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconShield,
} from "@/components/icons";

const INITIAL: CheckoutState = { error: null };

/** Formdaki alanlar; geri dönüldüğünde ya da hata alındığında geri doldurulur. */
type Values = Partial<
  Record<"name" | "surname" | "identity_number" | "gsm" | "city" | "address" | "sozlesme", string>
>;

const ADIMLAR = ["Fatura bilgileri", "Kart bilgileri", "Panel açılır"] as const;

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary h-13 w-full text-base">
      {pending ? (
        "Ödeme formu hazırlanıyor…"
      ) : (
        <>
          Kart bilgilerine geç
          <IconArrowRight className="h-4 w-4" aria-hidden />
        </>
      )}
    </button>
  );
}

/**
 * Hangi adımda olunduğu. Ödeme iki ekrana bölündüğü için (önce bizim
 * formumuz, sonra iyzico'nun) kullanıcı kaç adım kaldığını görsün.
 */
function Adimlar({ aktif }: { aktif: 0 | 1 }) {
  return (
    <ol className="m-0 mb-8 flex list-none items-center gap-2 p-0" aria-label="Ödeme adımları">
      {ADIMLAR.map((ad, sira) => {
        const bitti = sira < aktif;
        const simdi = sira === aktif;
        return (
          <li
            key={ad}
            aria-current={simdi ? "step" : undefined}
            // Etkin adımın adı kısalmasın; telefonda diğerlerinin adı zaten gizli.
            className={`flex flex-1 items-center gap-2 ${simdi ? "shrink-0" : "min-w-0"}`}
          >
            <span
              className={`vitrin-baslik flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                simdi
                  ? "bg-accent text-white"
                  : bitti
                    ? "bg-ink text-paper"
                    : "border border-border text-ink-muted"
              }`}
            >
              {bitti ? <IconCheck className="h-4 w-4" aria-hidden /> : sira + 1}
            </span>
            <span
              className={`text-sm font-semibold whitespace-nowrap ${
                simdi ? "text-ink" : "hidden truncate text-ink-muted sm:inline"
              }`}
            >
              {ad}
            </span>
            {sira < ADIMLAR.length - 1 && (
              <span aria-hidden className="h-px min-w-4 flex-1 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Alan({
  id,
  etiket,
  ipucu,
  children,
}: {
  id: string;
  etiket: string;
  ipucu?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {etiket}
      </label>
      {children}
      {ipucu && (
        <p id={`${id}-ipucu`} className="mt-1.5 mb-0 text-xs text-ink-muted">
          {ipucu}
        </p>
      )}
    </div>
  );
}

function Grup({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-0 p-0">
      <legend className="mb-4 p-0 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {baslik}
      </legend>
      {children}
    </fieldset>
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
 *
 * Girilen değerler bileşende tutuluyor: React form eylemi bittiğinde formu
 * sıfırlıyor, yani hata alan ya da kart adımından geri dönen kullanıcı her
 * şeyi baştan yazmak zorunda kalırdı.
 */
export default function SubscribeForm({ nonce, tutar }: { nonce?: string; tutar: string }) {
  const [values, setValues] = useState<Values>({});
  // Kart adımından "geri" denince o parçacık bir daha gösterilmesin; yeni
  // gönderim yeni bir parçacık getiriyor.
  const [geriDonulen, setGeriDonulen] = useState<string | null>(null);

  // Her gönderimde artıyor: form yeniden kurulsun ki `select` ve onay kutusu
  // da yeni varsayılanlarını alsın — React onlarda `defaultValue`
  // değişikliğini kurulumdan sonra uygulamıyor.
  const [gonderim, setGonderim] = useState(0);

  const [state, action] = useActionState(
    async (prev: CheckoutState, formData: FormData) => {
      setValues(Object.fromEntries(formData) as Values);
      setGonderim((n) => n + 1);
      return startCheckout(prev, formData);
    },
    INITIAL
  );

  if (state.content && state.content !== geriDonulen) {
    const content = state.content;
    return (
      <div>
        <Adimlar aktif={1} />
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="vitrin-baslik m-0 text-2xl font-extrabold text-ink">Kart bilgileri</h2>
            <p className="mt-2 mb-0 text-sm text-ink-muted">
              Kartınızı iyzico&apos;nun güvenli formuna girin. Her ay {tutar} çekilir.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGeriDonulen(content)}
            className="flex items-center gap-1 text-sm font-semibold text-ink-muted transition-colors hover:text-accent"
          >
            <IconChevronLeft className="h-4 w-4" aria-hidden />
            Fatura bilgilerini düzenle
          </button>
        </div>
        <CheckoutFrame content={content} nonce={nonce} />
      </div>
    );
  }

  return (
    <div>
      <Adimlar aktif={0} />

      <h2 className="vitrin-baslik m-0 text-2xl font-extrabold text-ink">Fatura bilgileri</h2>
      <p className="mt-2 mb-8 text-sm text-ink-muted">
        iyzico abonelik için fatura bilgisi istiyor. Bu bilgiler doğrudan iyzico&apos;ya
        iletilir, bizde saklanmaz.
      </p>

      <form key={gonderim} action={action} className="flex flex-col gap-8">
        {state.error && (
          <p
            role="alert"
            className="m-0 flex items-start gap-2 rounded-2xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}

        <Grup baslik="Kimlik">
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="name" etiket="Ad">
              <input
                id="name"
                name="name"
                required
                autoComplete="given-name"
                defaultValue={values.name}
                className="input"
              />
            </Alan>
            <Alan id="surname" etiket="Soyad">
              <input
                id="surname"
                name="surname"
                required
                autoComplete="family-name"
                defaultValue={values.surname}
                className="input"
              />
            </Alan>
          </div>
          <Alan id="identity_number" etiket="TC kimlik no" ipucu="Fatura için zorunlu, 11 hane.">
            <input
              id="identity_number"
              name="identity_number"
              required
              inputMode="numeric"
              maxLength={11}
              pattern="[0-9]{11}"
              aria-describedby="identity_number-ipucu"
              defaultValue={values.identity_number}
              className="input"
            />
          </Alan>
        </Grup>

        <Grup baslik="İletişim ve adres">
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="gsm" etiket="Cep telefonu">
              <input
                id="gsm"
                name="gsm"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="5xx xxx xx xx"
                defaultValue={values.gsm}
                className="input"
              />
            </Alan>
            <Alan id="city" etiket="İl">
              <select
                id="city"
                name="city"
                required
                defaultValue={values.city ?? ""}
                className="input"
              >
                <option value="" disabled>
                  Seçin
                </option>
                {PROVINCES.map((province) => (
                  <option key={province.name} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </select>
            </Alan>
          </div>
          <Alan id="address" etiket="Fatura adresi">
            <textarea
              id="address"
              name="address"
              required
              rows={3}
              maxLength={300}
              autoComplete="street-address"
              defaultValue={values.address}
              className="input resize-none"
            />
          </Alan>
        </Grup>

        {/* Mesafeli Sözleşmeler Yönetmeliği: ön bilgilendirme ve sözleşme
            ödemeden önce okunup onaylanmalı. Sunucu da kontrol ediyor. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed text-ink">
          <input
            type="checkbox"
            name="sozlesme"
            required
            defaultChecked={values.sozlesme === "on"}
            className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
          />
          <span>
            <Link href="/on-bilgilendirme-formu" target="_blank" className="link-underline font-semibold text-accent">
              Ön Bilgilendirme Formu
            </Link>
            &apos;nu ve{" "}
            <Link href="/mesafeli-satis-sozlesmesi" target="_blank" className="link-underline font-semibold text-accent">
              Mesafeli Satış Sözleşmesi
            </Link>
            &apos;ni okudum, onaylıyorum. Hizmetin ödemeyle birlikte anında başladığını ve bu
            nedenle cayma hakkı bulunmadığını biliyorum.
          </span>
        </label>

        <div className="space-y-4">
          <Submit />
          <p className="m-0 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
            <IconShield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Kart bilgileriniz bir sonraki adımda iyzico&apos;nun formuna girilir ve bize hiçbir
              zaman ulaşmaz. Abonelik yalnızca <strong>kredi kartı</strong> ile başlatılabilir;
              banka kartları tekrarlayan ödemeyi desteklemiyor.
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
