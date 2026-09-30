"use client";

/* eslint-disable @next/next/no-img-element -- küçük önizleme; kaynak zaten küçültülmüş */

import { useEffect, useRef, useState } from "react";
import { gorselOrnegiOku } from "@/app/admin/instagram-paneli/actions";
import { createClient } from "@/lib/supabase/client";
import { SINIRLAR, type GorselOrnek } from "@/lib/instagram/ayarlar";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import { IconImage, IconRefresh, IconTrash, IconUpload } from "@/components/icons";

/** Yüklemeden önce görselin uzun kenarı; ekran görüntüsündeki yazı okunur kalsın. */
const UZUN_KENAR = 1800;

type Okuma = { durum: "yukleniyor" | "okunuyor" | "hata"; hata?: string };

/**
 * Görselli örnek konuşmalar: satıcı gerçek bir DM konuşmasının ekran
 * görüntüsünü yüklüyor, sistem konuşmayı yazıya döküyor. Asistan dökümü
 * okuyor; satıcı dökümü görüp düzeltebiliyor, yanlış okunan bir satır
 * asistanın yanlış bir şey öğrenmesine yol açmasın diye.
 */
export default function GorselOrnekler({
  ornekler,
  onChange,
  ownerId,
  asistanHazir,
}: {
  ornekler: GorselOrnek[];
  onChange: (v: GorselOrnek[]) => void;
  ownerId: string;
  asistanHazir: boolean;
}) {
  const dosyaRef = useRef<HTMLInputElement>(null);
  // Yüklenen/okunan görsellerin anlık durumu; ayarlara yalnızca sonuç giriyor.
  const [okumalar, setOkumalar] = useState<Record<string, Okuma>>({});
  const [bekleyen, setBekleyen] = useState<{ anahtar: string; onizleme: string }[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  // Birden çok görsel aynı anda okunurken en güncel listeye eklemek için.
  const listeRef = useRef(ornekler);
  useEffect(() => {
    listeRef.current = ornekler;
  }, [ornekler]);

  const kalan = SINIRLAR.gorselOrnekSayisi - ornekler.length - bekleyen.length;

  async function oku(url: string) {
    setOkumalar((o) => ({ ...o, [url]: { durum: "okunuyor" } }));
    const sonuc = await gorselOrnegiOku(url);
    if (sonuc.dokum) {
      onChange(listeRef.current.map((o) => (o.url === url ? { ...o, dokum: sonuc.dokum! } : o)));
      setOkumalar((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== url)));
    } else {
      setOkumalar((o) => ({ ...o, [url]: { durum: "hata", hata: sonuc.hata ?? "Okunamadı." } }));
    }
  }

  async function yukle(dosya: File) {
    const anahtar = yeniAnahtar();
    const onizleme = URL.createObjectURL(dosya);
    setBekleyen((b) => [...b, { anahtar, onizleme }]);

    try {
      const kucuk = await kucult(dosya);
      const yol = `${ownerId}/instagram-ornek/${anahtar}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(yol, kucuk, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(yol);
      const url = data.publicUrl;

      listeRef.current = [...listeRef.current, { url, dokum: "" }];
      onChange(listeRef.current);
      void oku(url);
    } catch {
      setHata("Görsel yüklenemedi. Tekrar deneyin.");
    } finally {
      setBekleyen((b) => b.filter((x) => x.anahtar !== anahtar));
      URL.revokeObjectURL(onizleme);
    }
  }

  function secildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosyalar = Array.from(e.target.files ?? []);
    e.target.value = "";
    setHata(null);

    const uygun = dosyalar.filter(
      (d) => ACCEPTED_IMAGE_TYPES.includes(d.type) && d.size <= MAX_IMAGE_BYTES
    );
    if (uygun.length < dosyalar.length) {
      setHata("Yalnızca 5 MB'tan küçük PNG, JPEG ya da WebP görseller eklenebilir.");
    }
    for (const dosya of uygun.slice(0, Math.max(0, kalan))) void yukle(dosya);
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-sm font-semibold text-ink">Görselli örnekler</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          Müşterilerinizle yaptığınız gerçek Instagram konuşmalarının ekran görüntülerini ekleyin.
          Sistem konuşmayı okuyup yazıya döker; asistan sizin cevaplarınızı referans alır.
          Görüntüdeki isim ve telefon gibi kişisel bilgiler dökümde gizlenir.
        </p>
      </div>

      {ornekler.map((ornek, sira) => {
        const okuma = okumalar[ornek.url];
        return (
          <div key={ornek.url} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row">
            <a href={ornek.url} target="_blank" rel="noreferrer" className="shrink-0 self-start">
              <img
                src={ornek.url}
                alt={`Örnek konuşma ${sira + 1}`}
                className="h-40 w-24 rounded-md border border-border object-cover object-top"
              />
            </a>
            <div className="min-w-0 flex-1 space-y-2">
              {okuma?.durum === "okunuyor" ? (
                <p className="flex h-full min-h-24 items-center text-sm text-ink-muted">
                  Konuşma okunuyor…
                </p>
              ) : (
                <>
                  <label htmlFor={`dokum-${sira}`} className="field-label">
                    Konuşmanın dökümü
                  </label>
                  <textarea
                    id={`dokum-${sira}`}
                    rows={6}
                    maxLength={SINIRLAR.gorselDokum}
                    value={ornek.dokum}
                    onChange={(e) =>
                      onChange(ornekler.map((o, i) => (i === sira ? { ...o, dokum: e.target.value } : o)))
                    }
                    placeholder={"Müşteri: ...\nSiz: ..."}
                    className="input font-mono text-xs"
                  />
                  {okuma?.durum === "hata" && <p className="text-sm text-danger">{okuma.hata}</p>}
                </>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {asistanHazir && okuma?.durum !== "okunuyor" && (
                  <button
                    type="button"
                    onClick={() => void oku(ornek.url)}
                    className="btn btn-ghost !min-h-9 !px-3 text-sm"
                  >
                    <IconRefresh className="h-4 w-4" />
                    Yeniden oku
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(ornekler.filter((_, i) => i !== sira))}
                  className="btn btn-ghost !min-h-9 !px-3 text-sm"
                >
                  <IconTrash className="h-4 w-4" />
                  Sil
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {bekleyen.map((b) => (
        <div key={b.anahtar} className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
          <img src={b.onizleme} alt="" className="h-16 w-10 rounded object-cover object-top" />
          <p className="text-sm text-ink-muted">Yükleniyor…</p>
        </div>
      ))}

      {hata && <p className="text-sm text-danger">{hata}</p>}

      {kalan > 0 ? (
        <button
          type="button"
          onClick={() => dosyaRef.current?.click()}
          disabled={!asistanHazir}
          className="btn btn-secondary"
        >
          {ornekler.length ? <IconUpload className="h-4 w-4" /> : <IconImage className="h-4 w-4" />}
          Ekran görüntüsü ekle
        </button>
      ) : (
        <p className="text-sm text-ink-muted">
          En fazla {SINIRLAR.gorselOrnekSayisi} görsel eklenebilir.
        </p>
      )}
      <input
        ref={dosyaRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={secildi}
        className="hidden"
      />
    </div>
  );
}

/** Dosya adı; aynı anda yüklenen iki görsel çakışmasın. */
function yeniAnahtar(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Uzun kenarı `UZUN_KENAR`'ı geçen görseli küçültüp JPEG'e çevirir. */
async function kucult(dosya: File): Promise<Blob> {
  const bitmap = await createImageBitmap(dosya);
  const oran = Math.min(1, UZUN_KENAR / Math.max(bitmap.width, bitmap.height));
  const tuval = document.createElement("canvas");
  tuval.width = Math.round(bitmap.width * oran);
  tuval.height = Math.round(bitmap.height * oran);
  const ctx = tuval.getContext("2d");
  if (!ctx) throw new Error("2D bağlam açılamadı.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tuval.width, tuval.height);
  ctx.drawImage(bitmap, 0, 0, tuval.width, tuval.height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    tuval.toBlob((b) => (b ? resolve(b) : reject(new Error("Dönüştürülemedi."))), "image/jpeg", 0.85)
  );
}
