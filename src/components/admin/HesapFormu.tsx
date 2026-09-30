"use client";

import { useRef, useState, useTransition } from "react";
import { profiliKaydet, type ProfilGirdisi } from "@/app/admin/hesabim/actions";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_BOYU,
  AVATAR_RENKLERI,
  MAX_AD_UZUNLUGU,
  MAX_SEKTOR_UZUNLUGU,
  SEKTORLER,
} from "@/lib/hesap";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import ImageCropper from "@/components/admin/ImageCropper";
import ProfilAvatari from "@/components/ProfilAvatari";
import { IconCheck, IconCheckCircle, IconTrash, IconUpload } from "@/components/icons";

const DIGER = "__diger__";

/**
 * Hesabım ekranının düzenlenebilir kısmı: profil görseli, ad soyad, sektör.
 *
 * Fotoğraf tarayıcıdan doğrudan depoya yükleniyor (sunucu eylemlerinin gövde
 * sınırı bir fotoğrafa yetmiyor); kırpılıp kare ve küçük bir JPEG'e
 * çevrildikten sonra. Kaydet'e basılana kadar profil değişmiyor — yüklenen
 * dosya yalnızca önizlemede.
 */
export default function HesapFormu({
  baslangic,
  ownerId,
  harf,
  kullaniciAdi,
  email,
}: {
  baslangic: ProfilGirdisi;
  ownerId: string;
  harf: string;
  kullaniciAdi: string;
  email: string;
}) {
  const [form, setForm] = useState(baslangic);
  const [kayitli, setKayitli] = useState(baslangic);
  const [sektorSecimi, setSektorSecimi] = useState(() =>
    !baslangic.sektor || (SEKTORLER as readonly string[]).includes(baslangic.sektor)
      ? baslangic.sektor
      : DIGER
  );
  const [kirpilacak, setKirpilacak] = useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [durum, setDurum] = useState<{ iyi: boolean; metin: string } | null>(null);
  const [kaydediliyor, startKaydet] = useTransition();
  const dosyaRef = useRef<HTMLInputElement>(null);

  const degisti = JSON.stringify(form) !== JSON.stringify(kayitli);
  const onizlemeHarfi = form.adSoyad.trim() ? form.adSoyad.trim().charAt(0).toLocaleUpperCase("tr-TR") : harf;

  function guncelle<K extends keyof ProfilGirdisi>(alan: K, deger: ProfilGirdisi[K]) {
    setForm((onceki) => ({ ...onceki, [alan]: deger }));
    setDurum(null);
  }

  function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    e.target.value = "";
    if (!dosya) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(dosya.type)) {
      setDurum({ iyi: false, metin: "PNG, JPEG ya da WebP bir fotoğraf seçin." });
      return;
    }
    if (dosya.size > MAX_IMAGE_BYTES) {
      setDurum({ iyi: false, metin: "Fotoğraf 5 MB'tan büyük olmamalı." });
      return;
    }
    setKirpilacak(dosya);
  }

  async function kirpildi(dosya: File) {
    setKirpilacak(null);
    setYukleniyor(true);
    setDurum(null);

    try {
      const kare = await kareyeCevir(dosya);
      const yol = `${ownerId}/avatar/${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(yol, kare, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(yol);
      guncelle("avatarUrl", data.publicUrl);
    } catch {
      setDurum({ iyi: false, metin: "Fotoğraf yüklenemedi. Tekrar deneyin." });
    } finally {
      setYukleniyor(false);
    }
  }

  function kaydet() {
    startKaydet(async () => {
      const sonuc = await profiliKaydet(form);
      if (sonuc.hata) {
        setDurum({ iyi: false, metin: sonuc.hata });
        return;
      }
      setKayitli(form);
      setDurum({ iyi: true, metin: "Kaydedildi." });
    });
  }

  return (
    <section className="card space-y-6 p-5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <ProfilAvatari
          url={form.avatarUrl}
          renk={form.avatarRenk}
          harf={onizlemeHarfi}
          className="h-24 w-24 text-4xl"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="truncate text-lg font-semibold text-ink">
              {form.adSoyad.trim() || `@${kullaniciAdi}`}
            </p>
            <p className="truncate text-sm text-ink-muted">{email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => dosyaRef.current?.click()}
              disabled={yukleniyor}
              className="btn btn-secondary !min-h-10 !px-4 text-sm"
            >
              <IconUpload className="h-4 w-4" />
              {yukleniyor ? "Yükleniyor…" : form.avatarUrl ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
            </button>
            {form.avatarUrl && (
              <button
                type="button"
                onClick={() => guncelle("avatarUrl", null)}
                className="btn btn-ghost !min-h-10 !px-4 text-sm"
              >
                <IconTrash className="h-4 w-4" />
                Kaldır
              </button>
            )}
          </div>
          <input
            ref={dosyaRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={dosyaSecildi}
            className="hidden"
          />
        </div>
      </div>

      {!form.avatarUrl && (
        <div>
          <span className="field-label">Profil rengi</span>
          <div role="radiogroup" aria-label="Profil rengi" className="flex flex-wrap gap-2">
            {AVATAR_RENKLERI.map((renk) => {
              const secili = (form.avatarRenk ?? null) === renk;
              return (
                <button
                  key={renk}
                  type="button"
                  role="radio"
                  aria-checked={secili}
                  aria-label={renk}
                  onClick={() => guncelle("avatarRenk", renk)}
                  style={{ backgroundColor: renk }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition ${
                    secili ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : "hover:scale-110"
                  }`}
                >
                  {secili && <IconCheck className="h-4 w-4" />}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={form.avatarRenk === null}
              onClick={() => guncelle("avatarRenk", null)}
              className={`rounded-full border border-border px-3 text-xs font-semibold text-ink-muted transition ${
                form.avatarRenk === null ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""
              }`}
            >
              Varsayılan
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ad-soyad" className="field-label">
            Ad soyad
          </label>
          <input
            id="ad-soyad"
            value={form.adSoyad}
            maxLength={MAX_AD_UZUNLUGU}
            autoComplete="name"
            onChange={(e) => guncelle("adSoyad", e.target.value)}
            placeholder="Adınız ve soyadınız"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="sektor" className="field-label">
            Sektör
          </label>
          <select
            id="sektor"
            value={sektorSecimi}
            onChange={(e) => {
              setSektorSecimi(e.target.value);
              guncelle("sektor", e.target.value === DIGER ? "" : e.target.value);
            }}
            className="input"
          >
            <option value="">Seçin</option>
            {SEKTORLER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={DIGER}>Diğer</option>
          </select>
          {sektorSecimi === DIGER && (
            <input
              value={form.sektor}
              maxLength={MAX_SEKTOR_UZUNLUGU}
              onChange={(e) => guncelle("sektor", e.target.value)}
              placeholder="Sektörünüzü yazın"
              aria-label="Sektörünüz"
              className="input mt-2"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p
          className={`flex min-w-0 items-center gap-2 text-sm ${
            durum ? (durum.iyi ? "text-success" : "text-danger") : "text-ink-muted"
          }`}
        >
          {durum?.iyi && <IconCheckCircle className="h-4 w-4 shrink-0" />}
          <span className="truncate">{durum?.metin ?? (degisti ? "Kaydedilmemiş değişiklik var." : "")}</span>
        </p>
        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor || yukleniyor || !degisti}
          className="btn btn-primary shrink-0"
        >
          {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>

      {kirpilacak && (
        <ImageCropper
          file={kirpilacak}
          title="Profil fotoğrafını kırp"
          applyLabel="Kırp ve kullan"
          onApply={(dosya) => void kirpildi(dosya)}
          onCancel={() => setKirpilacak(null)}
        />
      )}
    </section>
  );
}

/** Fotoğrafı ortasından kare kırpıp küçük bir JPEG'e çevirir. */
async function kareyeCevir(dosya: File): Promise<Blob> {
  const bitmap = await createImageBitmap(dosya);
  const kenar = Math.min(bitmap.width, bitmap.height);

  const tuval = document.createElement("canvas");
  tuval.width = AVATAR_BOYU;
  tuval.height = AVATAR_BOYU;
  const ctx = tuval.getContext("2d");
  if (!ctx) throw new Error("2D bağlam açılamadı.");

  ctx.drawImage(
    bitmap,
    (bitmap.width - kenar) / 2,
    (bitmap.height - kenar) / 2,
    kenar,
    kenar,
    0,
    0,
    AVATAR_BOYU,
    AVATAR_BOYU
  );
  bitmap.close();

  return new Promise((resolve, reject) =>
    tuval.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Dönüştürülemedi."))), "image/jpeg", 0.88)
  );
}
