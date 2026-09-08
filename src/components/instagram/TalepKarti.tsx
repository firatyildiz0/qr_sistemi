"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { talebiOnayla, talebiReddet } from "@/app/admin/talepler/actions";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconMapPin,
  IconPhone,
  IconTruck,
  IconX,
} from "@/components/icons";

export type TalepKalemi = { ad: string; kod: string | null; adet: number };

export type Talep = {
  id: string;
  ad: string;
  telefon: string | null;
  bolge: string;
  tarihler: string;
  gunSayisi: number;
  blokeAralik: string;
  teslimat: string;
  olusturuldu: string;
  durum: string;
  not: string | null;
  grupId: string | null;
  /** Ürün bu tarihlerde artık müsait değilse gösterilecek cümle. */
  cakisma: string | null;
  kalemler: TalepKalemi[];
};

const DURUM_ETIKETI: Record<string, { metin: string; sinif: string }> = {
  approved: { metin: "onaylandı", sinif: "pill-success" },
  rejected: { metin: "reddedildi", sinif: "pill-danger" },
  expired: { metin: "süresi geçti", sinif: "pill-muted" },
};

function gecenSure(iso: string) {
  const dakika = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (dakika < 1) return "az önce";
  if (dakika < 60) return `${dakika} dk önce`;
  const saat = Math.round(dakika / 60);
  if (saat < 24) return `${saat} sa önce`;
  return `${Math.round(saat / 24)} gün önce`;
}

/**
 * Tek bir talebin kartı.
 *
 * Karar butonları yalnızca bekleyen taleplerde; sonuçlananlar aynı kartla ama
 * salt okunur gösteriliyor, çünkü satıcının "neydi bu talep" diye baktığı yer
 * de burası.
 */
export default function TalepKarti({
  talep,
  delay = 0,
}: {
  talep: Talep;
  delay?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [retAcik, setRetAcik] = useState(false);
  const [not, setNot] = useState("");

  const bekliyor = talep.durum === "pending";
  const etiket = DURUM_ETIKETI[talep.durum];

  function calistir(islem: () => Promise<{ hata: string | null; uyari?: string }>) {
    setHata(null);
    setUyari(null);

    startTransition(async () => {
      const sonuc = await islem();
      if (sonuc.hata) setHata(sonuc.hata);
      if (sonuc.uyari) setUyari(sonuc.uyari);
      if (!sonuc.hata) setRetAcik(false);
    });
  }

  return (
    <article
      className="card fade-slide-up space-y-4 p-4 sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{talep.ad}</h3>
          <p className="flex items-center gap-1 text-xs text-ink-muted">
            <IconClock className="h-3.5 w-3.5" />
            {gecenSure(talep.olusturuldu)} · Instagram
          </p>
        </div>
        {etiket && <span className={`pill ${etiket.sinif}`}>{etiket.metin}</span>}
      </header>

      <ul className="space-y-1 rounded-lg border border-border bg-surface p-3 text-sm">
        {talep.kalemler.map((kalem, sira) => (
          <li key={sira} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-ink">
              {kalem.ad}
              {kalem.kod && <span className="text-ink-muted"> · {kalem.kod}</span>}
            </span>
            {kalem.adet > 1 && (
              <span className="shrink-0 text-ink-muted">{kalem.adet} adet</span>
            )}
          </li>
        ))}
      </ul>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">Kiralama</dt>
          <dd className="font-medium text-ink">
            {talep.tarihler} <span className="text-ink-muted">({talep.gunSayisi} gün)</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Ürün meşgul</dt>
          <dd className="text-ink">{talep.blokeAralik}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Teslimat</dt>
          <dd className="flex items-center gap-1.5 text-ink">
            <IconTruck className="h-4 w-4 text-ink-muted" />
            {talep.teslimat}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Bölge</dt>
          <dd className="flex items-center gap-1.5 text-ink">
            <IconMapPin className="h-4 w-4 text-ink-muted" />
            {talep.bolge}
          </dd>
        </div>
        {talep.telefon && (
          <div>
            <dt className="text-xs text-ink-muted">Telefon</dt>
            <dd className="flex items-center gap-1.5 text-ink">
              <IconPhone className="h-4 w-4 text-ink-muted" />
              <a href={`tel:${talep.telefon.replace(/\s/g, "")}`} className="link-underline">
                {talep.telefon}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {talep.cakisma && (
        <p className="notice-warning flex items-start gap-2 text-sm">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {talep.cakisma} Onaylarsanız rezervasyon oluşturulamaz; önce tarihleri müşteriyle
            konuşun.
          </span>
        </p>
      )}

      {talep.not && (
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">Notunuz:</span> {talep.not}
        </p>
      )}

      {hata && <p className="text-sm font-medium text-danger">{hata}</p>}
      {uyari && <p className="notice-warning text-sm">{uyari}</p>}

      {bekliyor && (
        <div className="space-y-3">
          {retAcik && (
            <div className="space-y-2">
              <label htmlFor={`not-${talep.id}`} className="field-label">
                Müşteriye iletilecek not (isteğe bağlı)
              </label>
              <textarea
                id={`not-${talep.id}`}
                value={not}
                onChange={(olay) => setNot(olay.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Örn: O tarihlerde bu ürün başka bir müşteride."
                className="input w-full resize-none"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {retAcik ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => calistir(() => talebiReddet(talep.id, not))}
                  className="btn btn-danger"
                >
                  Reddet ve bildir
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setRetAcik(false)}
                  className="btn btn-ghost"
                >
                  Vazgeç
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => calistir(() => talebiOnayla(talep.id))}
                  className="btn btn-primary"
                >
                  <IconCheck className="h-4 w-4" />
                  Onayla
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setRetAcik(true)}
                  className="btn btn-danger-ghost"
                >
                  <IconX className="h-4 w-4" />
                  Reddet
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {talep.durum === "approved" && talep.grupId && (
        <Link href="/admin/customers" className="link-underline text-sm font-medium text-accent">
          Rezervasyonu görüntüle
        </Link>
      )}
    </article>
  );
}
