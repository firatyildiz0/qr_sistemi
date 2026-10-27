"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fikirGonder, type FikirFormDurumu } from "@/app/fikir/actions";
import { IconCheck } from "@/components/icons";

const baslangicDurumu: FikirFormDurumu = { hata: null, tamam: false };

/**
 * "Fikriniz mi var?" formu. Gönderilince form yerini teşekkür kartına
 * bırakıyor; sayfa değişmiyor, ziyaretçi nerede olduğunu kaybetmiyor.
 */
export default function FikirFormu() {
  const [durum, formAction, bekliyor] = useActionState(fikirGonder, baslangicDurumu);
  // Hata dönünce React formu bu değerlere sıfırlıyor, boşa değil.
  const d = durum.degerler ?? {};

  if (durum.tamam) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconCheck className="h-7 w-7" />
        </span>
        <h2 className="vitrin-baslik m-0 text-[30px] font-extrabold leading-tight text-ink">Mesajınız bize ulaştı</h2>
        <p className="m-0 max-w-md text-[17px] leading-relaxed text-ink-muted">
          Teşekkürler. Fikrinizi okuyup bıraktığınız iletişim bilgisinden size döneceğiz.
        </p>
        <Link href="/" className="btn btn-secondary mt-2 h-12 px-6">
          Anasayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* İnsanlara görünmeyen tuzak alan; yalnızca botlar doldurur. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="fikir-website">Web siteniz</label>
        <input id="fikir-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="fikir-ad" className="field-label">
            Adınız soyadınız
          </label>
          <input id="fikir-ad" name="ad" defaultValue={d.ad} required maxLength={80} autoComplete="name" className="input" />
        </div>
        <div>
          <label htmlFor="fikir-isletme" className="field-label">
            İşletmeniz <span className="font-normal text-ink-muted">(isteğe bağlı)</span>
          </label>
          <input
            id="fikir-isletme"
            name="isletme"
            defaultValue={d.isletme}
            maxLength={120}
            autoComplete="organization"
            placeholder="Örneğin: Ayşe Gelinlik"
            className="input"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="field-label">Size nasıl dönelim?</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fikir-eposta" className="sr-only">
              E-posta
            </label>
            <input
              id="fikir-eposta"
              name="eposta"
            defaultValue={d.eposta}
              type="email"
              maxLength={200}
              autoComplete="email"
              placeholder="E-posta"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="fikir-telefon" className="sr-only">
              Telefon
            </label>
            <input
              id="fikir-telefon"
              name="telefon"
            defaultValue={d.telefon}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Telefon"
              className="input"
            />
          </div>
        </div>
        <p className="text-xs text-ink-muted">İkisinden birini yazmanız yeterli.</p>
      </fieldset>

      <div>
        <label htmlFor="fikir-mesaj" className="field-label">
          Fikriniz
        </label>
        <textarea
          id="fikir-mesaj"
          name="mesaj"
          defaultValue={d.mesaj}
          required
          rows={6}
          maxLength={2000}
          placeholder="Hangi işiniz hâlâ defterle ya da telefonla yürüyor? Neyin kolaylaşmasını isterdiniz?"
          className="input resize-y leading-relaxed"
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink-muted">
        <input type="checkbox" name="onay" defaultChecked={d.onay === "on"} required className="mt-0.5 accent-[var(--color-accent)]" />
        <span>
          Bilgilerimin bana dönüş yapmak için nasıl işleneceğini anlatan{" "}
          <Link href="/gizlilik" className="link-underline text-accent" target="_blank">
            Gizlilik Sözleşmesi
          </Link>
          ’ni okudum ve anladım.
        </span>
      </label>

      {durum.hata && (
        <p role="alert" className="text-sm text-danger">
          {durum.hata}
        </p>
      )}

      <button type="submit" disabled={bekliyor} className="btn btn-primary h-14 w-full text-base sm:w-auto sm:px-10">
        {bekliyor ? "Gönderiliyor…" : "Gönder"}
      </button>
    </form>
  );
}
